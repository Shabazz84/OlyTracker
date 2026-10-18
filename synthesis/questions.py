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
    # ── Block 2: the floor transition ─────────────────────────────────────
    Question(31, "full_vs_power",
             "What do these coaches say about when a lifter should move from "
             "power snatch and power clean to the full squat versions?"),
    Question(32, "start_position_floor",
             "What do these coaches say about the start position and the first "
             "pull from the floor?"),
    Question(33, "lead_up_exercises",
             "What do these coaches say about which lead-up or assistance "
             "exercises should come before the competition lift in a session?"),
    # ── Block 2: loading architecture ─────────────────────────────────────
    Question(34, "load_distribution",
             "What do these coaches say about how training volume should be "
             "distributed across light, medium and heavy intensity zones?"),
    Question(35, "average_training_weight",
             "What do these coaches say about average training weight or "
             "average intensity as a measure of training quality?"),
    Question(36, "accumulation_vs_intensification",
             "What do these coaches say about shifting from accumulating "
             "volume to raising intensity within a training cycle?"),
    Question(37, "technique_under_load",
             "What do these coaches say about technique breaking down as the "
             "weight on the bar gets heavier?"),
    # ── Block 2: session conduct ──────────────────────────────────────────
    Question(38, "missed_attempts",
             "What do these coaches say about what to do after a missed lift "
             "in training?"),
    Question(39, "warmup_to_max",
             "What do these coaches say about warming up and working up to a "
             "heavy single?"),
    Question(40, "accessory_volume_intensification",
             "What do these coaches say about reducing accessory work when "
             "intensity on the competition lifts increases?"),
    # ── Block 2: transitions ──────────────────────────────────────────────
    Question(41, "block_transition",
             "What do these coaches say about what changes when moving from "
             "one training block to the next?"),
    Question(42, "second_pull_timing",
             "What do these coaches say about the timing of the second pull "
             "and the extension in the snatch and clean?"),
]


# ── Exercise cue catalog ──────────────────────────────────────────────────
# One question per exercise; the key IS the app's EXERCISE_CATALOG id, so a
# pack file (q117-front_squat.md) names the entry its cues are written for.
# Ids start at 101: handles like E117.2 can never be mistaken for a program
# pack's E1–E42, which the app's older cue text already cites.
# Run: python main.py evidence --catalog cues

CUE_QUESTIONS = [
    # ── Snatch family ─────────────────────────────────────────────────────
    Question(101, "snatch",
             "What do these coaches say about technique cues for the full "
             "snatch from the floor, from the setup to the receiving position?"),
    Question(102, "power_snatch",
             "What do these coaches say about how to perform the power snatch "
             "and how it differs from the full snatch?"),
    Question(103, "snatch_from_blocks",
             "What do these coaches say about snatches from blocks: block "
             "height, setup and what they train?"),
    Question(104, "three_position_snatch",
             "What do these coaches say about multi-position snatches done "
             "from the floor, the knee and mid-thigh in one set?"),
    Question(105, "two_position_snatch",
             "What do these coaches say about combining a snatch from the "
             "floor with a snatch from mid-thigh or the hang in one set?"),
    Question(106, "snatch_ohs_complex",
             "What do these coaches say about doing overhead squats straight "
             "after a snatch in the same set?"),
    Question(107, "overhead_squat",
             "What do these coaches say about technique cues for the overhead "
             "squat: grip, bar position, shoulders and depth?"),
    Question(108, "snatch_deadlift",
             "What do these coaches say about the snatch deadlift: back angle, "
             "bar path and what it trains?"),
    Question(109, "snatch_push_press",
             "What do these coaches say about the snatch-grip push press, "
             "including from behind the neck?"),
    # ── Clean & jerk family ───────────────────────────────────────────────
    Question(110, "power_clean",
             "What do these coaches say about how to perform the power clean "
             "and receive it in the rack position?"),
    Question(111, "clean_from_blocks",
             "What do these coaches say about cleans from blocks: setup and "
             "what they train?"),
    Question(112, "three_position_clean",
             "What do these coaches say about multi-position cleans done from "
             "the floor, the knee and mid-thigh in one set?"),
    Question(113, "two_position_clean",
             "What do these coaches say about combining a clean from the floor "
             "with a clean from mid-thigh or the hang in one set?"),
    Question(114, "clean_fs_jerk_complex",
             "What do these coaches say about a complex of a clean, front "
             "squats and a jerk, and resetting the rack position before the "
             "jerk?"),
    Question(115, "power_clean_power_jerk",
             "What do these coaches say about power jerk technique: the dip, "
             "the drive and the receiving position?"),
    Question(116, "power_split_jerk_combo",
             "What do these coaches say about split jerk technique and how it "
             "relates to the power jerk?"),
    # ── Squats and pulls ──────────────────────────────────────────────────
    Question(117, "front_squat",
             "What do these coaches say about technique cues for the front "
             "squat: rack position, elbows and staying upright?"),
    Question(118, "back_squat",
             "What do these coaches say about back squat technique for "
             "weightlifters: bar position, depth and staying upright?"),
    Question(119, "pause_back_squat",
             "What do these coaches say about pause squats that hold the "
             "bottom position before standing up?"),
    Question(120, "stiff_legged_deadlift",
             "What do these coaches say about stiff-legged or Romanian "
             "deadlifts: technique and purpose?"),
    # ── Upper body and trunk ──────────────────────────────────────────────
    Question(121, "strict_press",
             "What do these coaches say about strict overhead press technique?"),
    Question(122, "barbell_row",
             "What do these coaches say about barbell rows for weightlifters: "
             "torso angle and technique?"),
    Question(123, "plank",
             "What do these coaches say about planks and holding a braced "
             "position for the core?"),
    Question(124, "ab_wheel",
             "What do these coaches say about ab wheel rollouts and "
             "anti-extension core work?"),
    Question(125, "trunk_static_strength",
             "What do these coaches say about static trunk strength for "
             "weightlifters: holds, bracing and stability?"),
]
