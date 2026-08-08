"""Prompts for RAG-based master synthesis.

The athlete profile appears exactly ONCE in this codebase — in ATHLETE_CONTEXT
below — and is injected only into SYNTHESIS_PROMPT, the final call. The old
pipeline injected it into all six summarization prompts, so every stored
artifact was pre-distorted toward one athlete before synthesis ever ran.
"""

from dataclasses import dataclass


@dataclass(frozen=True)
class Topic:
    key: str
    question: str


#: One retrieval query per synthesis theme. Deliberately phrased as questions
#: about what COACHES SAY, not about what this athlete should do — the athlete
#: only enters at the final synthesis call.
TOPICS = [
    Topic("snatch", "What do these coaches say about snatch technique and progression?"),
    Topic("jerk", "What do these coaches say about jerk mechanics, the split jerk, and overhead stability?"),
    Topic("back_health", "What do these coaches say about back health, spinal loading, and training around back pain?"),
    Topic("periodization", "What do these coaches say about periodization, block structure, and training cycles?"),
    Topic("squat", "What do these coaches say about squat mechanics, especially for tall or long-femur lifters?"),
    Topic("mobility", "What do these coaches say about mobility work and overhead squat position?"),
    Topic("recovery", "What do these coaches say about recovery, fatigue management, and training frequency?"),
]

ATHLETE_CONTEXT = (
    "Athlete context: intermediate strength athlete transitioning to Olympic "
    "weightlifting. 102.5 kg bodyweight, Back Squat 118 kg, Clean 80 kg, "
    "Jerk 65 kg (push/power jerk; split jerk not yet trained), OHS 50 kg "
    "(primary snatch limiter). Chronic back pain. Night shift worker (Wed-Sun)."
)

SYNTHESIS_PROMPT = """You are synthesizing Olympic weightlifting coaching sources.

Below are passages retrieved verbatim from coaching transcripts, grouped by topic
and numbered for citation.

RULES — these are not stylistic preferences, they are correctness requirements:
1. Every factual claim MUST cite the passage it came from, as [N]. A claim you
   cannot cite does not belong in the document.
2. Do NOT add coaching knowledge from outside these passages, even if you are
   confident it is correct and standard. Outside knowledge is the exact failure
   this document exists to eliminate.
3. Where a topic is marked NO COVERAGE, say so plainly in the output. Do not
   fill the gap.
4. Where sources genuinely disagree, present both positions with citations
   rather than silently picking one.

Produce these sections:
## Consensus Principles
Principles supported by three or more distinct sources.
## Conflicts and How to Resolve Them
## Per-Source Contributions
What each source uniquely adds.
## Application to This Athlete
{athlete_context}
Only here may you reason about this specific athlete — and each recommendation
must still trace to a cited passage.
## Coverage Gaps
Topics with no retrieved coverage.

Retrieved passages:
{passages}"""
