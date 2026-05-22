import logging
from pathlib import Path

import tiktoken

import config
from extractor.export import sanitize_name
from summarizer import prompts
from summarizer.llm_client import chat, LLMError

logger = logging.getLogger(__name__)

_ENC = tiktoken.get_encoding("cl100k_base")


def _ntokens(text: str) -> int:
    return len(_ENC.encode(text))


def read_transcript(path: Path) -> tuple[str, str]:
    """Split a transcript file into (metadata_header, body).

    All transcript formats (YouTube/web/telegram) use a '---' separator line.
    """
    raw = path.read_text(encoding="utf-8")
    if "\n---\n" in raw:
        meta, body = raw.split("\n---\n", 1)
        return meta.strip(), body.strip()
    return "", raw.strip()


def _title_from_meta(meta: str, fallback: str) -> str:
    for line in meta.splitlines():
        for key in ("Title:", "Source:", "Channel:"):
            if line.startswith(key):
                val = line[len(key):].strip()
                if val:
                    return val
    return fallback


def _chunk(text: str, max_tokens: int) -> list[str]:
    """Split text into chunks under max_tokens, on paragraph boundaries."""
    paras = [p for p in text.split("\n\n") if p.strip()]
    if not paras:
        paras = [text]
    chunks, cur, cur_tok = [], [], 0
    for para in paras:
        ptok = _ntokens(para)
        if ptok > max_tokens:
            # Hard-split an oversized paragraph on whitespace.
            words = para.split()
            step = max(1, len(words) * max_tokens // max(ptok, 1))
            for i in range(0, len(words), step):
                chunks.append(" ".join(words[i:i + step]))
            continue
        if cur_tok + ptok > max_tokens and cur:
            chunks.append("\n\n".join(cur))
            cur, cur_tok = [], 0
        cur.append(para)
        cur_tok += ptok
    if cur:
        chunks.append("\n\n".join(cur))
    return chunks


def _summarize_text(body: str) -> str:
    """Summarize one source body, chunking if it exceeds the token budget."""
    if _ntokens(body) <= config.SUMMARY_CHUNK_TOKENS:
        return chat(
            prompts.VIDEO_PROMPT.format(
                athlete_context=prompts.ATHLETE_CONTEXT, transcript=body
            )
        )

    chunks = _chunk(body, config.SUMMARY_CHUNK_TOKENS)
    logger.info(f"  long source — {len(chunks)} chunks")
    partials = []
    for i, ch in enumerate(chunks, 1):
        logger.info(f"  chunk {i}/{len(chunks)}")
        partials.append(
            chat(
                prompts.VIDEO_PROMPT.format(
                    athlete_context=prompts.ATHLETE_CONTEXT, transcript=ch
                )
            )
        )
    # Merge partial summaries, but cap input to fit model context.
    # For very large sources, sub-chunk the partials and merge hierarchically.
    merge_input = "\n\n---\n\n".join(partials)
    if _ntokens(merge_input) > config.SUMMARY_CHUNK_TOKENS:
        # Summarize the partials in groups, then do a final merge.
        groups = _chunk(merge_input, config.SUMMARY_CHUNK_TOKENS)
        grouped_summaries = []
        for g in groups:
            grouped_summaries.append(
                chat(
                    prompts.CHUNK_MERGE_PROMPT.format(
                        athlete_context=prompts.ATHLETE_CONTEXT, summaries=g
                    )
                )
            )
        merge_input = "\n\n---\n\n".join(grouped_summaries)
    return chat(
        prompts.CHUNK_MERGE_PROMPT.format(
            athlete_context=prompts.ATHLETE_CONTEXT,
            summaries=merge_input,
        )
    )


def summarize_file(src_path: Path, out_dir: Path, force: bool = False,
                   suffix: str = "") -> Path | None:
    """Summarize a single transcript file to summaries/<source>/<stem>[_suffix]_summary.md."""
    tag = f"_{suffix}" if suffix else ""
    out_path = out_dir / f"{src_path.stem}{tag}_summary.md"
    if out_path.exists() and not force:
        return out_path

    meta, body = read_transcript(src_path)
    if len(body) < 200:
        logger.info(f"  skip (too short): {src_path.name}")
        return None

    title = _title_from_meta(meta, src_path.stem)
    try:
        summary = _summarize_text(body)
    except LLMError as e:
        logger.error(f"  LLM failed for {src_path.name}: {e}")
        return None

    out_dir.mkdir(parents=True, exist_ok=True)
    out_path.write_text(f"# {title}\n\n{summary}\n", encoding="utf-8")
    logger.info(f"  summarized → {out_path.name}")
    return out_path


def roll_up(source_name: str, summary_paths: list[Path], out_path: Path,
            force: bool = False, suffix: str = "") -> Path | None:
    """Combine per-file summaries into one channel_summary.md.

    Retries with progressively smaller input on 400/context errors.
    """
    tag = f"_{suffix}" if suffix else ""
    out_path = out_path.parent / f"channel{tag}_summary.md"
    if out_path.exists() and not force:
        return out_path
    if not summary_paths:
        return None
    combined = "\n\n---\n\n".join(
        p.read_text(encoding="utf-8") for p in summary_paths
    )
    # Try progressively smaller chunks if LM Studio rejects due to context limits.
    for multiplier in (2, 1):
        chunks = _chunk(combined, config.SUMMARY_CHUNK_TOKENS * multiplier)
        try:
            text = chat(
                prompts.CHANNEL_PROMPT.format(
                    n=len(summary_paths),
                    channel_name=source_name,
                    athlete_context=prompts.ATHLETE_CONTEXT,
                    summaries=chunks[0],
                )
            )
            out_path.parent.mkdir(parents=True, exist_ok=True)
            out_path.write_text(text + "\n", encoding="utf-8")
            logger.info(f"roll-up → {out_path}")
            return out_path
        except LLMError as e:
            if "400" in str(e) or "context" in str(e).lower():
                logger.warning(f"roll-up context too large for {source_name}, retrying smaller (multiplier={multiplier})")
                continue
            logger.error(f"roll-up failed for {source_name}: {e}")
            return None
    logger.error(f"roll-up failed for {source_name}: context too large even at minimum chunk")
    return None


def _leaf_dirs(root: Path) -> list[Path]:
    """All directories under root that directly contain .txt files."""
    dirs = set()
    for txt in root.rglob("*.txt"):
        if txt.name != "merged.txt":
            dirs.add(txt.parent)
    return sorted(dirs)


def summarize_all(force: bool = False, channel_filter: str | None = None,
                  suffix: str = "") -> list[Path]:
    """Summarize every transcript, then roll up per source.

    Args:
        force: Re-summarize even if summary already exists.
        channel_filter: If set, only process dirs whose path contains this string.
        suffix: Optional tag appended to output filenames (e.g. "claude").

    Returns the list of roll-up (channel_summary.md) paths produced.
    """
    troot = Path(config.TRANSCRIPT_DIR)
    sroot = Path(config.SUMMARY_DIR)
    rollups: list[Path] = []

    dirs = _leaf_dirs(troot)
    if channel_filter:
        dirs = [d for d in dirs if channel_filter.lower() in str(d).lower()]
        logger.info(f"Channel filter '{channel_filter}': {len(dirs)} dir(s) matched")

    for d in dirs:
        rel = d.relative_to(troot)
        # telegram/ holds multiple distinct coaches — roll up per file.
        per_file_sources: dict[str, list[Path]] = {}
        files = sorted(f for f in d.glob("*.txt") if f.name != "merged.txt")
        logger.info(f"Source dir: {rel} ({len(files)} files)")

        for f in files:
            if rel.parts and rel.parts[0] == "telegram":
                source_name = f.stem
                out_dir = sroot / sanitize_name(source_name)
            else:
                source_name = "_".join(rel.parts)
                out_dir = sroot / sanitize_name(source_name)
            summ = summarize_file(f, out_dir, force=force, suffix=suffix)
            if summ:
                per_file_sources.setdefault(source_name, []).append(summ)

        for source_name, summ_paths in per_file_sources.items():
            out_dir = sroot / sanitize_name(source_name)
            ru = roll_up(
                source_name, summ_paths,
                out_dir / "channel_summary.md", force=force, suffix=suffix,
            )
            if ru:
                rollups.append(ru)

    return rollups


def generate_master_synthesis(force: bool = False) -> Path | None:
    """Generate summaries/master_synthesis.md from all channel summaries.

    Prefers channel_claude_summary.md over channel_summary.md when both exist.
    """
    sroot = Path(config.SUMMARY_DIR)
    out_path = sroot / "master_synthesis.md"
    if out_path.exists() and not force:
        logger.info("master_synthesis.md exists — use --force to regenerate")
        return out_path

    # Collect best available roll-up per channel dir.
    rollups = []
    for p in sorted(sroot.rglob("channel_summary.md")):
        claude_p = p.parent / "channel_claude_summary.md"
        rollups.append(claude_p if claude_p.exists() else p)

    if not rollups:
        logger.warning("No channel summaries found — run --summarize-only first")
        return None

    blocks = []
    for p in rollups:
        name = p.parent.name
        tag = " [claude]" if "claude" in p.name else ""
        blocks.append(f"### Source: {name}{tag}\n\n{p.read_text(encoding='utf-8')}")
    combined = "\n\n".join(blocks)
    combined = _chunk(combined, config.SUMMARY_CHUNK_TOKENS * 4)[0]

    try:
        text = chat(
            prompts.MASTER_PROMPT.format(
                athlete_context=prompts.ATHLETE_CONTEXT, summaries=combined
            ),
            max_tokens=4000,
        )
    except LLMError as e:
        logger.error(f"master synthesis failed: {e}")
        return None

    out_path.write_text(text + "\n", encoding="utf-8")
    logger.info(f"master synthesis → {out_path}")
    return out_path
