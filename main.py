"""OlyTracker knowledge pipeline CLI.

Extraction lives in BRAINDUMP now. This drives the two remaining steps:
indexing BRAINDUMP's persisted transcripts (run on the Z840) and building the
master synthesis from them (run anywhere with LAN access to the Z840).
"""

import argparse
import logging
import sys
from pathlib import Path

import config

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s %(levelname)s %(message)s",
    handlers=[
        logging.FileHandler("extraction.log", encoding="utf-8"),
        logging.StreamHandler(),
    ],
)
logger = logging.getLogger(__name__)


def _braindump_on_path():
    if config.BRAINDUMP_PATH not in sys.path:
        sys.path.insert(0, config.BRAINDUMP_PATH)


def _backends():
    """Embedder + store, both configured from Brain_Dump's own config so the
    values can never drift from the pipeline that produced the data."""
    _braindump_on_path()
    from indexer.config_loader import load_config
    from indexer.embedder import OllamaEmbedder
    from indexer.vector_store import QdrantStore

    cfg = load_config(config.BRAINDUMP_CONFIG)
    q, o = cfg["qdrant"], cfg["ollama"]
    embedder = OllamaEmbedder(o["host"], o["embedding_model"])
    store = QdrantStore(q["host"], config.SYNTHESIS_COLLECTION,
                        q["vector_size"], q.get("distance", "Cosine"))
    return cfg, embedder, store


def cmd_index(args) -> int:
    cfg, embedder, store = _backends()
    from indexer.errors import BackendUnavailable
    from synthesis.index import index_dir

    transcript_dir = args.transcript_dir
    if transcript_dir is None:
        # cfg["processing"]["transcript_dir"] (e.g. "./transcripts") is relative
        # to Brain_Dump's root, not the operator's cwd — resolve it against
        # BRAINDUMP_PATH so `python main.py index` works run from OlyTracker too.
        transcript_dir = cfg["processing"]["transcript_dir"]
        if not Path(transcript_dir).is_absolute():
            transcript_dir = str(Path(config.BRAINDUMP_PATH) / transcript_dir)
    ch = cfg["chunking"]
    try:
        n = index_dir(transcript_dir, store, embedder,
                      chunk_chars=ch["chunk_chars"],
                      overlap_chars=ch["overlap_chars"])
    except BackendUnavailable as e:
        print(f"Z840 unreachable; run again when it's up ({e})", file=sys.stderr)
        return 3
    print(f"indexed {n} transcripts into {config.SYNTHESIS_COLLECTION}")
    return 0


def cmd_synthesize(args) -> int:
    cfg, embedder, store = _backends()
    from indexer.errors import BackendUnavailable
    from summarizer.llm_client import LLMError
    from synthesis.build import NoCoverageError, build_synthesis, gather

    threshold = cfg["qdrant"]["similarity_threshold"]
    try:
        results = gather(embedder, store, limit=config.SYNTHESIS_MAX_CHUNKS,
                         threshold=threshold)
        text = build_synthesis(results)
    except BackendUnavailable as e:
        print(f"Z840 unreachable; run again when it's up ({e})", file=sys.stderr)
        return 3
    except NoCoverageError as e:
        print(f"ERROR: {e}", file=sys.stderr)
        return 4
    except LLMError as e:
        print(f"synthesis call failed: {e}", file=sys.stderr)
        return 3

    out = Path(config.MASTER_SYNTHESIS_PATH)
    out.parent.mkdir(parents=True, exist_ok=True)
    out.write_text(text, encoding="utf-8")
    covered = sum(1 for r in results if r.covered)
    print(f"wrote {out} ({covered}/{len(results)} topics covered)")
    return 0


def cmd_ask(args) -> int:
    """Answer a question with retrieved passages and nothing else.

    No LLM call, by design. `synthesize` exists to produce prose; this exists to
    let you check what the coaches actually said before trusting any prose about
    it. The archived master_synthesis.md prescribed "deload every 4th week" and
    "stop if pain >3/10" — neither traceable to a source, and in the old format
    there was no way to find that out.
    """
    cfg, embedder, store = _backends()
    from indexer.errors import BackendUnavailable
    from synthesis import retrieve as sretrieve

    threshold = cfg["qdrant"]["similarity_threshold"]
    try:
        passages = sretrieve.retrieve_topic(
            args.question, embedder, store,
            limit=args.limit, threshold=threshold)
    except BackendUnavailable as e:
        print(f"Z840 unreachable; run again when it's up ({e})", file=sys.stderr)
        return 3

    if not passages:
        print(sretrieve.format_for_cli([]), file=sys.stderr)
        return 4

    print(sretrieve.format_for_cli(passages, full=args.full))
    print(f"\n{len(passages)} passage(s) above {threshold} "
          f"from {len({p.note_path for p in passages})} source(s).")
    return 0


def main(argv=None) -> int:
    p = argparse.ArgumentParser(prog="olytracker")
    sub = p.add_subparsers(dest="command", required=True)

    pi = sub.add_parser("index", help="Index BRAINDUMP transcripts (run on the Z840)")
    pi.add_argument("--transcript-dir", default=None,
                    help="Override processing.transcript_dir from Brain_Dump's config")
    pi.set_defaults(func=cmd_index)

    ps = sub.add_parser("synthesize", help="Build master_synthesis.md from retrieval")
    ps.set_defaults(func=cmd_synthesize)

    pa = sub.add_parser("ask", help="Show source passages for a question (no LLM)")
    pa.add_argument("question", help="e.g. \"how should I program the jerk?\"")
    pa.add_argument("--limit", type=int, default=8,
                    help="max passages to show (default 8)")
    pa.add_argument("--full", action="store_true",
                    help="print each passage in full instead of a snippet")
    pa.set_defaults(func=cmd_ask)

    args = p.parse_args(argv)
    return args.func(args)


if __name__ == "__main__":
    sys.exit(main())
