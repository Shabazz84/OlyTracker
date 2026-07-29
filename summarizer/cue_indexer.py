import logging
from pathlib import Path

import config
from extractor.export import sanitize_name
from summarizer import prompts
from summarizer.llm_client import chat, LLMError
from summarizer.source_summarizer import _chunk, _ntokens

logger = logging.getLogger(__name__)


def _source_dir(handle: str) -> Path:
    return Path(config.SUMMARY_DIR) / sanitize_name(handle.lstrip("@"))


def _title_from_summary(text: str, fallback: str) -> str:
    for line in text.splitlines():
        if line.startswith("# "):
            return line[2:].strip()
    return fallback


def _gather_cue_sources(handle: str, keywords: list[str]) -> list[tuple[str, str]]:
    """Per-video summaries from a source dir matching any keyword, preferring claude variant.

    Returns list of (title, content).
    """
    d = _source_dir(handle)
    if not d.is_dir():
        logger.warning(f"no summary dir for {handle}: {d}")
        return []

    by_stem: dict[str, Path] = {}
    for p in sorted(d.glob("*_summary.md")):
        if p.name.startswith("channel"):
            continue
        stem = p.stem.removesuffix("_claude_summary").removesuffix("_summary")
        if stem not in by_stem or p.stem.endswith("_claude_summary"):
            by_stem[stem] = p

    kw_lower = [k.lower() for k in keywords]
    matched = []
    for p in sorted(by_stem.values()):
        text = p.read_text(encoding="utf-8")
        if any(k in text.lower() for k in kw_lower):
            matched.append((_title_from_summary(text, p.stem), text))
    logger.info(f"{handle}: {len(matched)}/{len(by_stem)} videos matched cue keywords")
    return matched


def _extract_cues(source_label: str, videos: list[tuple[str, str]]) -> list[str]:
    """Chunk video summaries and extract raw phase-organized cues per chunk."""
    if not videos:
        return []
    blocks = [f"### {title}\n\n{text}" for title, text in videos]
    combined = "\n\n---\n\n".join(blocks)
    chunks = _chunk(combined, config.SUMMARY_CHUNK_TOKENS)
    extracts = []
    for i, ch in enumerate(chunks, 1):
        logger.info(f"  {source_label} cue extraction chunk {i}/{len(chunks)}")
        try:
            extracts.append(
                chat(
                    prompts.CUE_EXTRACT_PROMPT.format(
                        source_label=source_label,
                        athlete_context=prompts.ATHLETE_CONTEXT,
                        summaries=ch,
                    )
                )
            )
        except LLMError as e:
            logger.error(f"  cue extraction failed for {source_label} chunk {i}: {e}")
    return extracts


def generate_cue_index(force: bool = False) -> Path | None:
    """Build summaries/dozer_cue_index.md from Dozer + Webster per-video summaries.

    Deterministic keyword filtering narrows each source to cue-relevant videos;
    an LLM organizes the matched content into phase-bucketed, deduplicated cues,
    flagging cross-source agreement as [HIGH_CONFIDENCE].
    """
    out_path = Path(config.DOZER_CUE_INDEX_OUTPUT)
    if out_path.exists() and not force:
        logger.info(f"{out_path} exists — use --force to regenerate")
        return out_path

    dozer_videos = _gather_cue_sources(config.DOZER_CHANNEL_HANDLE, config.DOZER_CUE_KEYWORDS)
    webster_videos = _gather_cue_sources(config.WEBSTER_CHANNEL_HANDLE, config.WEBSTER_MOBILITY_KEYWORDS)

    dozer_extracts = _extract_cues("Dozer", dozer_videos)
    webster_extracts = _extract_cues("Webster [WEBSTER]", webster_videos)

    all_extracts = dozer_extracts + webster_extracts
    if not all_extracts:
        logger.warning("no cue extractions produced — nothing to index")
        return None

    merge_input = "\n\n---\n\n".join(all_extracts)
    # Merge in progressively smaller groups if the combined extracts exceed the
    # chunk budget, mirroring source_summarizer.roll_up's fallback strategy.
    groups = _chunk(merge_input, config.SUMMARY_CHUNK_TOKENS * 2)
    if len(groups) > 1:
        logger.info(f"  merging {len(groups)} extraction groups")
        merged_groups = []
        for g in groups:
            merged_groups.append(
                chat(
                    prompts.CUE_MERGE_PROMPT.format(
                        athlete_context=prompts.ATHLETE_CONTEXT,
                        extractions=g,
                    )
                )
            )
        merge_input = "\n\n---\n\n".join(merged_groups)

    try:
        text = chat(
            prompts.CUE_MERGE_PROMPT.format(
                athlete_context=prompts.ATHLETE_CONTEXT,
                extractions=merge_input,
            ),
            max_tokens=8000,
        )
    except LLMError as e:
        logger.error(f"cue index merge failed: {e}")
        return None

    out_path.parent.mkdir(parents=True, exist_ok=True)
    out_path.write_text(text + "\n", encoding="utf-8")
    logger.info(f"cue index → {out_path}")
    return out_path
