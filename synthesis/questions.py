"""Retrieval queries organized by PROGRAM DECISION, not by broad topic.

synthesis/prompts.py::TOPICS asks seven broad questions and produced a document
useful as a map but not as a program — it covered roughly 5% of the corpus. A
training block is made of decisions (how deep is a deload, how heavy are pulls
relative to the competition lift, when does the split jerk get introduced), so
the catalog is shaped like those decisions.

Every question asks what COACHES SAY. None mentions this athlete. That is the
same anti-bias rule TOPICS follows, enforced by tests/test_synthesis_questions.py.
"""

from dataclasses import dataclass


@dataclass(frozen=True)
class Question:
    id: int
    key: str
    text: str


QUESTIONS = [
    # ── Block architecture ────────────────────────────────────────────────
    Question(1, "hypertrophy_block_need",
             "What do these coaches say about whether an amateur weightlifter "
             "needs a dedicated hypertrophy block?"),
    Question(2, "block_length",
             "What do these coaches say about how long a training block or "
             "cycle should run before testing?"),
    Question(3, "deload_frequency",
             "What do these coaches say about how often a weightlifter should "
             "deload or take a lighter week?"),
    Question(4, "deload_magnitude",
             "What do these coaches say about how much to reduce volume or "
             "intensity during a deload week?"),
    Question(5, "testing_protocol",
             "What do these coaches say about testing maximum lifts at the end "
             "of a training cycle?"),
    # ── Session structure ─────────────────────────────────────────────────
    Question(6, "exercises_per_session",
             "What do these coaches say about how many exercises to include in "
             "a single training session?"),
    Question(7, "session_opener",
             "What do these coaches say about what a weightlifting session "
             "should begin with?"),
    Question(8, "competition_lift_frequency",
             "What do these coaches say about how often per week to train the "
             "snatch and the clean and jerk?"),
    # ── Snatch ────────────────────────────────────────────────────────────
    Question(9, "hang_vs_floor",
             "What do these coaches say about hang variations versus lifting "
             "from the floor when learning technique?"),
    Question(10, "ohs_programming",
             "What do these coaches say about programming the overhead squat, "
             "including sets, reps and load?"),
    Question(11, "weak_overhead",
             "What do these coaches say about fixing a weak or unstable "
             "overhead position in the snatch?"),
    Question(12, "muscle_snatch",
             "What do these coaches say about the muscle snatch and what it "
             "develops?"),
    # ── Clean & jerk ──────────────────────────────────────────────────────
    Question(13, "power_vs_split_jerk",
             "What do these coaches say about choosing between the power jerk "
             "and the split jerk?"),
    Question(14, "learning_split_jerk",
             "What do these coaches say about teaching the split jerk to a "
             "lifter who has not trained it before?"),
    Question(15, "jerk_behind_clean",
             "What do these coaches say about programming the jerk when it is "
             "much weaker than the clean?"),
    Question(16, "daily_max_vs_prescribed",
             "What do these coaches say about working up to a daily maximum "
             "single versus following prescribed sets and reps?"),
    Question(17, "pull_loading",
             "What do these coaches say about how heavy clean pulls and snatch "
             "pulls should be relative to the competition lift?"),
    # ── Squat ─────────────────────────────────────────────────────────────
    Question(18, "front_vs_back_squat",
             "What do these coaches say about front squats versus back squats "
             "for weightlifters?"),
    Question(19, "pause_squat",
             "What do these coaches say about pause squats and what they "
             "develop?"),
    Question(20, "squat_reps_long_limbs",
             "What do these coaches say about squat rep ranges and technique "
             "for tall or long-limbed lifters?"),
    Question(21, "squat_dosing",
             "What do these coaches say about how heavy and how often a "
             "weightlifter should squat?"),
    # ── Back health ───────────────────────────────────────────────────────
    Question(22, "training_with_back_pain",
             "What do these coaches say about training around lower back "
             "pain?"),
    Question(23, "back_sparing_selection",
             "What do these coaches say about exercise selection that reduces "
             "spinal loading, such as belt squats or single-leg work?"),
    Question(24, "trunk_work",
             "What do these coaches say about core and trunk training for "
             "weightlifters?"),
    # ── Loading & progression ─────────────────────────────────────────────
    Question(25, "hypertrophy_loading",
             "What do these coaches say about what percentages and rep ranges "
             "to use for hypertrophy work?"),
    Question(26, "weekly_progression",
             "What do these coaches say about how quickly to increase load "
             "from week to week?"),
    Question(27, "autoregulation",
             "What do these coaches say about training by feel versus "
             "following fixed percentages?"),
    # ── Accessories & mobility ────────────────────────────────────────────
    Question(28, "upper_body_accessories",
             "What do these coaches say about upper body accessory work for "
             "weightlifters?"),
    Question(29, "ankle_mobility",
             "What do these coaches say about ankle mobility and its effect on "
             "squat depth?"),
    Question(30, "mobility_dosing",
             "What do these coaches say about how often mobility work should "
             "be done?"),
]
