"""Summarization prompts. Athlete context is baked in per CLAUDE.md."""

ATHLETE_CONTEXT = (
    "Athlete context: intermediate strength athlete transitioning to Olympic "
    "weightlifting. 102.5 kg bodyweight, Back Squat 118 kg, Clean 80 kg, "
    "Jerk 65 kg (push jerk only — NO split jerk), OHS 50 kg (primary snatch "
    "limiter). Chronic back pain. Night shift worker (Wed–Sun). "
    "Goal: 6-week hypertrophy block then technique/strength."
)

VIDEO_PROMPT = """You are analyzing a weightlifting coaching transcript or article.
{athlete_context}

Extract from the text below:
1. Programming principles (sets/reps/intensity/frequency/periodization)
2. Technique cues for snatch, clean, or jerk
3. Exercise recommendations
4. Recovery or mobility advice
5. Anything specifically relevant to this athlete's profile

Be concise and specific. If the text is not about weightlifting, say so in one line.

Text:
{transcript}"""

CHUNK_MERGE_PROMPT = """These are partial summaries of one long weightlifting source, in order.
{athlete_context}

Merge them into one coherent summary with these sections:
## Key Points
## Technique Cues
## Programming Principles
## Athlete Relevance

Remove duplication. Keep only weightlifting-relevant content. Be specific.

Partial summaries:
{summaries}"""

CHANNEL_PROMPT = """You have {n} summaries from the coaching source "{channel_name}".
{athlete_context}

Synthesize them into a single coaching philosophy document covering:
1. Core training philosophy (3-5 principles)
2. Programming approach (structure, periodization, intensity)
3. Key technique cues and exercise preferences
4. Recovery and mobility approach
5. How this applies to the athlete above

Keep it under 1000 words. Be direct and specific.

Summaries:
{summaries}"""

MASTER_PROMPT = """You have coaching philosophy summaries from multiple Olympic
weightlifting sources (Pavlukhin, Berestov, Klokov, Torokhtiy, Everett,
Golovinsky, Dozer, Webster — whichever are present below).
{athlete_context}

Generate a master synthesis covering:
1. Consensus principles (agreed by 3+ sources)
2. Conflicting recommendations + how to resolve them
3. Unique contributions from each source
4. A prioritized list of program adjustments for this specific athlete
5. Top 10 technique cues most relevant to this athlete right now

This will be used to refine a 6-week hypertrophy program. Keep under 2000 words.
Be specific and actionable.

Source summaries:
{summaries}"""
