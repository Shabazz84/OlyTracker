# Catch-Depth Cues — Where Every Line Comes From — 2026-10-25

The Block 3 catch-depth correction
(`docs/superpowers/specs/2026-10-25-block3-catch-depth-design.md`) puts three
exercises on cards that had no coaching cue: `clean_deadlift` (Edit 16),
`tall_snatch` and `tall_clean` (Edit 15). This document covers those three, in
the format of `docs/programs/2026-10-18-block3-cues.md`.

**The pack.** The Z840 corpus was offline on 2026-10-25, so no new retrieval
ran. Every line cites a passage already in `evidence/2026-10-18-cues/`
(gitignored — transcript text). Handles are pack-local, as in the 2026-10-18 doc.

**The check.** `python -m tools.check_citations docs/programs/2026-10-25-catch-depth-cues.md evidence/2026-10-18-cues`
proves every handle resolves and every quote appears in the passage it cites.

**Not cited.** A comment reply on Catalyst's "Pull Down for a Better Turnover"
article (pack `evidence/2026-08-12`, question 17, passage 6) puts tall snatches and cleans at
about 25–30%, never worked to a heavy single. Its speaker could not be checked
offline, so no cue rests on it; the cards' 20–25 kg load is a marked judgment
call in the design spec (Edit 15).

---

### Clean Deadlift — `clean_deadlift` (Edit 16: segment deadlift)

1. *Arms bending early is probably a strength problem too: getting the bar to mid/high thigh with the shoulders still over it. Segment deadlifts build it.* (Everett)
   - "Regarding the early arm bend, it's probably also a strength issue, although a different one - the inability to get the bar to the mid to high-thigh level while keeping the shoulders over it. Halting deadlifts or segment deadlifts are a big help" [E104.7] — flagged passage; speaker checked: Greg Everett's signed reply.
2. *Pause at mid-thigh, where the second pull starts: shins vertical, shoulders slightly in front of the bar, weight not back on the heels.* (Everett)
   - **Transfer** from the snatch segment deadlift: "Make the top pause position for both mid-thigh—the point at which you’ll ideally initiate the final upward explosion (second pull). In this position, your shins should be vertical, shoulders at least slightly in front of the bar" [E105.8]
   - "weight slightly behind the middle of the foot—don’t get all the way back on your heels" [E105.8]

### Tall Snatch — `tall_snatch` (Edit 15: opener)

1. *One of the snatch variants that emphasize the pull under the bar.* (Everett)
   - "You can also use some snatch variants to emphasize the pull under the bar such as high-hang snatches, tall snatches or snatches from high blocks" [E106.12]

### Tall Clean — `tall_clean` (Edit 15: opener)

The pack returned no clean-specific passage on the tall clean.

1. *The clean version of a variant that emphasizes the pull under the bar.* (Everett)
   - **Transfer** from the tall snatch: "use some snatch variants to emphasize the pull under the bar such as high-hang snatches, tall snatches" [E106.12]
