"""The bias fix is structural: the athlete profile must live in exactly one
place. This test fails if anyone reintroduces it into a summarization prompt,
or any other generated artifact.

Scans the whole repo (not just synthesis/ and summarizer/) so config.py,
main.py, any future root-level module, and documentation all stay covered —
narrower scoping here is exactly what let the stale CLAUDE.md prompts (Finding
I1) go undetected. "Whole repo" means every directory not explicitly excluded
below, not every file: see SCAN_EXTENSIONS for exactly which file types are
read. It missed .js/.jsx entirely until Finding I6 (2026-08-16) put
docs/src/app.jsx's own live system prompt in this guard's blind spot."""

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
#: - summaries/master_synthesis.md: the pipeline's OUTPUT. ATHLETE_CONTEXT is
#:   injected once at the final synthesis call by design, so the document's
#:   "Application to This Athlete" section necessarily restates the profile.
#:   Flagging it would fail the build on a correct run — the bias this guard
#:   exists to catch is the profile entering artifacts that are STORED AND
#:   RETRIEVED (per-video/per-channel summaries), never the terminal output.
#:   Only this exact file is allowed; anything else under summaries/ (e.g. a
#:   reintroduced per-video summary) still fails.
#: - docs/programs/2026-08-11-block1-rebuild.md: the evidence rebuild's terminal
#:   output. Its Fixed Inputs section necessarily restates training maxes and
#:   limiters, exactly as master_synthesis.md's "Application to This Athlete"
#:   does. Allow-listed by EXACT PATH, not as a docs/programs/ directory
#:   exclusion — a directory rule would let any future file there carry the
#:   profile undetected, which is the failure this guard exists to catch.
#: - docs/src/app.jsx (+ its built docs/app.js): carries the profile inside a
#:   live Claude system prompt (the weekly-review AI feature) — this athlete's
#:   own tracker, not a stored-and-retrieved corpus artifact, so the same
#:   reasoning as master_synthesis.md applies. Found blind before this list
#:   existed (Finding I6, 2026-08-16 final-branch review): SCAN_EXTENSIONS
#:   didn't cover .js/.jsx at all, so this wasn't merely allowed, it was
#:   invisible. Allow-listed on purpose now, not exempt by extension.
#: - docs/src/program.js (+ its built docs/program.js): NOT a profile
#:   restatement — one session note's "OHS 50 kg" (a real training-target
#:   load, unrelated to the profile prompt) collides with the PROFILE_MARKERS
#:   entry of the same text. Allow-listed for that specific, checked reason;
#:   the file carries none of the other two markers.
ALLOWED = {
    "synthesis/prompts.py",
    "CLAUDE.md",
    "summaries/master_synthesis.md",
    "docs/programs/2026-08-11-block1-rebuild.md",
    "docs/programs/2026-08-12-block2.md",
    "docs/src/app.jsx",
    "docs/app.js",
    "docs/src/program.js",
    "docs/program.js",
}

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

#: Extensions scanned. Code (.py, .js, .jsx) and docs (.md) are the places
#: bias can re-enter: a prompt, or instructions telling a future session how
#: to build one. .js/.jsx were missing until Finding I6 (2026-08-16) — the
#: docstring above claimed whole-repo coverage while docs/src/app.jsx's own
#: live system prompt sat in this guard's blind spot.
SCAN_EXTENSIONS = {".py", ".md", ".js", ".jsx"}


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
    offenders = _offenders()
    assert offenders == [], (
        f"athlete profile leaked into: {offenders}. It belongs only in "
        f"synthesis/prompts.py (as a prompt) and CLAUDE.md (as reference "
        f"data) — see the 2026-08-07 unified-extraction spec."
    )


def _offenders() -> list[str]:
    """The scan, factored out so the guard's behaviour can be exercised against
    real files on disk rather than only against whatever the repo happens to
    contain right now."""
    found = []
    for path in _scanned_files():
        rel = path.relative_to(ROOT).as_posix()
        if rel in ALLOWED:
            continue
        text = path.read_text(encoding="utf-8", errors="ignore")
        if any(marker in text for marker in PROFILE_MARKERS):
            found.append(rel)
    return found


def test_master_synthesis_may_restate_the_profile():
    """A correct synthesis run restates the profile in its "Application to This
    Athlete" section — ATHLETE_CONTEXT enters once, at that final call. The
    guard must not fail the build for that.

    Regression: the marker list uses "102.5 kg" (spaced) while the generated
    document happened to write "102.5kg", so this only ever passed by accident
    of formatting. A run that spelled it the other way failed the build.
    """
    target = ROOT / "summaries" / "master_synthesis.md"
    existed = target.exists()
    original = target.read_text(encoding="utf-8") if existed else None
    target.parent.mkdir(parents=True, exist_ok=True)
    try:
        target.write_text(
            "# Synthesis\n\n## Application to This Athlete\n"
            "Bodyweight 102.5 kg; OHS 50 kg is the primary snatch limiter.\n",
            encoding="utf-8",
        )
        assert "summaries/master_synthesis.md" not in _offenders()
    finally:
        if existed:
            target.write_text(original, encoding="utf-8")
        else:
            target.unlink()


def test_profile_in_any_other_summaries_file_still_fails():
    """Allowing the terminal output must not blanket-exempt summaries/. A
    reintroduced per-video summary carrying the profile is the exact bias this
    guard exists to catch."""
    target = ROOT / "summaries" / "_leak_probe_summary.md"
    target.parent.mkdir(parents=True, exist_ok=True)
    try:
        target.write_text("Athlete bodyweight 102.5 kg.\n", encoding="utf-8")
        assert "summaries/_leak_probe_summary.md" in _offenders()
    finally:
        target.unlink()


def test_rebuild_path_is_allowed_but_the_directory_is_not():
    """The rebuild is terminal output, like master_synthesis.md — athlete
    context legitimately applies there. But allow-listing the whole
    docs/programs/ directory would let a future file carry the profile
    undetected, so only the exact path is permitted."""
    assert "docs/programs/2026-08-11-block1-rebuild.md" in ALLOWED
    assert not any(a.rstrip("/").endswith("docs/programs") for a in ALLOWED)


def test_profile_in_any_other_programs_file_still_fails():
    """Same rule as summaries/: allowing the one terminal output must not
    blanket-exempt the directory around it."""
    target = ROOT / "docs" / "programs" / "_leak_probe_program.md"
    target.parent.mkdir(parents=True, exist_ok=True)
    try:
        target.write_text("Athlete bodyweight 102.5 kg.\n", encoding="utf-8")
        assert "docs/programs/_leak_probe_program.md" in _offenders()
    finally:
        target.unlink()


def test_profile_in_any_other_js_file_still_fails():
    """Finding I6: SCAN_EXTENSIONS didn't cover .js/.jsx at all, so the profile
    could leak into any JS file undetected — not merely allowed, invisible.
    A stray .js file outside the allow-list must still be caught."""
    target = ROOT / "docs" / "src" / "_leak_probe.js"
    target.parent.mkdir(parents=True, exist_ok=True)
    try:
        target.write_text("const prompt = 'Athlete bodyweight 102.5 kg.';\n", encoding="utf-8")
        assert "docs/src/_leak_probe.js" in _offenders()
    finally:
        target.unlink()


def test_extractor_package_is_gone():
    assert not (ROOT / "extractor").exists(), (
        "extractor/ must be removed — BRAINDUMP is the sole extractor"
    )
