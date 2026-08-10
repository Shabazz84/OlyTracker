"""The bias fix is structural: the athlete profile must live in exactly one
place. This test fails if anyone reintroduces it into a summarization prompt,
or any other generated artifact.

Scans the whole repo (not just synthesis/ and summarizer/) so config.py,
main.py, any future root-level module, and documentation all stay covered —
narrower scoping here is exactly what let the stale CLAUDE.md prompts (Finding
I1) go undetected."""

from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
THIS_FILE = Path(__file__).resolve()

#: Distinctive strings from the athlete profile. If any appears outside an
#: allowed file, some artifact is being generated (or documented as being
#: generated) with athlete bias baked in.
PROFILE_MARKERS = ["102.5 kg", "OHS 50 kg", "primary snatch limiter"]

#: Files where the profile legitimately appears, relative to ROOT.
#: - synthesis/prompts.py: the one place it's allowed to drive an LLM call.
#: - CLAUDE.md: documents the athlete profile as reference data (a table),
#:   not as a prompt fragment — that's the whole point of Finding I1's fix.
ALLOWED = {"synthesis/prompts.py", "CLAUDE.md"}

#: Directories excluded entirely, relative to ROOT (matched as a path-part
#: prefix, so "docs/superpowers" excludes everything under it).
EXCLUDED_DIRS = {
    "summaries_archive",   # pre-2026-08 output, deliberately kept as the bias-fix control
    "docs/superpowers",    # specs/plans legitimately quote the profile while describing the fix
    ".superpowers",
    ".claude",
    ".git",
    "__pycache__",
}

#: Extensions scanned. Code (.py) and docs (.md) are the two places bias can
#: re-enter: a prompt, or instructions telling a future session how to build one.
SCAN_EXTENSIONS = {".py", ".md"}


def _is_in_excluded_dir(rel_parts: tuple[str, ...]) -> bool:
    for excl in EXCLUDED_DIRS:
        excl_parts = Path(excl).parts
        if rel_parts[:len(excl_parts)] == excl_parts:
            return True
    return False


def _scanned_files():
    for path in ROOT.rglob("*"):
        if path.is_dir() or path.suffix not in SCAN_EXTENSIONS:
            continue
        if path.resolve() == THIS_FILE:
            continue
        rel = path.relative_to(ROOT)
        if _is_in_excluded_dir(rel.parts):
            continue
        yield path


def test_athlete_profile_appears_only_in_allowed_files():
    offenders = []
    for path in _scanned_files():
        rel = path.relative_to(ROOT).as_posix()
        if rel in ALLOWED:
            continue
        text = path.read_text(encoding="utf-8", errors="ignore")
        if any(marker in text for marker in PROFILE_MARKERS):
            offenders.append(rel)
    assert offenders == [], (
        f"athlete profile leaked into: {offenders}. It belongs only in "
        f"synthesis/prompts.py (as a prompt) and CLAUDE.md (as reference "
        f"data) — see the 2026-08-07 unified-extraction spec."
    )


def test_extractor_package_is_gone():
    assert not (ROOT / "extractor").exists(), (
        "extractor/ must be removed — BRAINDUMP is the sole extractor"
    )
