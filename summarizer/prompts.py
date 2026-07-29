"""Summarization prompts. Athlete context is baked in per CLAUDE.md."""

ATHLETE_CONTEXT = (
    "Athlete context: intermediate strength athlete transitioning to Olympic "
    "weightlifting. 102.5 kg bodyweight, Back Squat 118 kg, Clean 80 kg, "
    "Jerk 65 kg (push/power jerk; split jerk not yet trained), OHS 50 kg (primary snatch "
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

CUE_EXTRACT_PROMPT = """You are building a technique-cue index from weightlifting coaching
video summaries by {source_label}, for a self-coached athlete with no in-person coach.
{athlete_context}

From the summaries below, extract every concrete, actionable technique CUE — a short
instruction a lifter can apply mid-session (a bar-path detail, a positional fix, a body-part
cue). Do NOT include programming, periodization, or recovery advice — cues only.

Organize each cue under exactly one of these phase headers (omit headers with no cues):
## snatch_pull
## snatch_receive
## clean_pull
## clean_receive
## jerk_drive
## jerk_lockout
## back_posterior_chain

List cues as bullets, each prefixed with the source video's title in brackets, e.g.:
- [Video Title] Keep the bar close through the pull.

Video summaries:
{summaries}"""

CUE_MERGE_PROMPT = """You are finalizing a technique-cue index for a self-coached athlete.
{athlete_context}

Below are raw cue extractions from two coaches: DOZER cues (unmarked) and WEBSTER cues
(marked [WEBSTER] in their source label). Merge them into one clean index:

1. Keep the same phase headers: snatch_pull, snatch_receive, clean_pull, clean_receive,
   jerk_drive, jerk_lockout, back_posterior_chain (omit any with zero cues)
2. Deduplicate near-identical cues, keeping the clearest phrasing
3. Tag every Webster-sourced cue with [WEBSTER] at the end of the line
4. Where a Dozer cue and a Webster cue express the same underlying instruction, merge them
   into ONE line tagged [HIGH_CONFIDENCE] instead of listing both separately
5. Keep each cue to one line, imperative, actionable — preserve the source video title in
   brackets at the start of the line

Output ONLY the final markdown index, starting with "# Dozer + Webster Technique Cue Index"
and a one-line note explaining that [HIGH_CONFIDENCE] means both coaches independently gave
the same cue.

Raw extractions:
{extractions}"""

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
