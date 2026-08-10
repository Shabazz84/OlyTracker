"""The bias fix is structural: the athlete profile must live in exactly one
place. This test fails if anyone reintroduces it into a summarization prompt."""

from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]

#: Distinctive strings from the athlete profile. If any appears outside the
#: allowed file, some artifact is being generated with athlete bias baked in.
PROFILE_MARKERS = ["102.5 kg", "OHS 50 kg", "primary snatch limiter"]

ALLOWED = {"synthesis/prompts.py"}

SEARCH_DIRS = ["synthesis", "summarizer"]


def _python_files():
    for d in SEARCH_DIRS:
        base = ROOT / d
        if base.is_dir():
            yield from base.rglob("*.py")


def test_athlete_profile_appears_only_in_synthesis_prompts():
    offenders = []
    for path in _python_files():
        rel = path.relative_to(ROOT).as_posix()
        if rel in ALLOWED:
            continue
        text = path.read_text(encoding="utf-8")
        if any(marker in text for marker in PROFILE_MARKERS):
            offenders.append(rel)
    assert offenders == [], (
        f"athlete profile leaked into: {offenders}. It belongs only in "
        f"synthesis/prompts.py — see the 2026-08-07 unified-extraction spec."
    )


def test_extractor_package_is_gone():
    assert not (ROOT / "extractor").exists(), (
        "extractor/ must be removed — BRAINDUMP is the sole extractor"
    )
