# Block 1, Rebuilt From Cited Evidence — 2026-08-11

Every prescription below carries either a citation handle resolving to a real
retrieved passage in `evidence/2026-08-11/`, or the tag
**[JUDGMENT — NO COVERAGE]**. There is no third category. A judgment tag is not
a failure; it is the honest label for a decision this corpus cannot make, and
the count of them is a primary output of this exercise (see the Judgment Ledger
at the end).

Written **blind**: `PROGRAM_B1` in `docs/src/app.jsx` was deliberately not
consulted while drafting, so the diff measures divergence rather than
agreement-by-anchoring.

Read alongside `2026-08-11-evidence-coverage.md`, which defines what this
document is permitted to claim.

---

## Fixed Inputs (given, not derived)

These come from `CLAUDE.md`'s Athlete Profile and Weekly Schedule tables. They
are fixed because the corpus has **confirmed zero coverage** of night-shift
scheduling and of return-to-load protocols for existing back pain — deriving
them would mean inventing them.

- **Bodyweight** ~102.5 kg. **Training age:** intermediate strength athlete
  mid-transition to Olympic weightlifting.
- **Training maxes:** Snatch 63 · C&J 72 · Front Squat 116 · Back Squat 118 ·
  Push Press 65 · Clean Pull 120.
- **Tested:** Clean 80 · Jerk ~65 (push/power; **split jerk not yet trained**) ·
  OHS 50 × 4 · Overhead Press 62 × 2 · Front Squat 102 × 3 × 4.
- **Schedule:** 5 days/week in summer — Mon, Tue, Wed, Thu, Sat. Mon/Tue follow
  full nights. Wed has a hard stop at 3pm before a 7pm shift. Thu follows ~5.5h
  post-shift sleep. Sat follows cumulative shift fatigue.
- **Chronic back pain**, manageable, not acute.

One fixed input is worth flagging against the evidence: **OHS 50 kg against a
118 kg back squat is 42%**, where the corpus reports the normal ratio as
"around 2/3 of what they back squat. That's roughly 65-70%" [E10.6]. This
athlete's overhead is a genuine outlier, not a rounding error — which makes the
question of *how* to fix it the highest-stakes decision in the block.

---

## Block Architecture

### This is not a hypertrophy block

The corpus argues directly against a dedicated hypertrophy block for an
amateur. Asked whether they ever program one: *"realistically not unless
someone's of a very high talent... most people don't really need that much of a
specific hypertrophy black and white thing"* [E1.1]. The cost is stated
explicitly: *"most amateur [lifters] can't afford to take away a hypertrophy
block which might be like six to eight weeks, so then you're deconditioning,
you're detraining, you're not doing enough weightlifting in that time period,
then it takes like four weeks to get acclimatized to lifts again — then we've
wasted basically three months of training"* [E1.2].

The prescribed alternative is not less hypertrophy but differently placed
hypertrophy: it is *"consistent through all those blocks"*, embedded in
weightlifting training rather than isolated from it [E1.1].

**So this block is a weightlifting block with hypertrophy embedded**, not a
hypertrophy phase with weightlifting attached. That is a change of frame, not
of exercise list — and it is the single most consequential thing the evidence
says about Block 1.

The same source notes the population this applies to: amateurs are *"incredibly
weak — really weak pressing, really weak legs"*, such that *"any amount of
hypertrophy"* produces growth [E1.2]. Additional hypertrophy work is warranted;
a dedicated block to deliver it is not.

### Length

- Amateurs typically run **8 or 12 week blocks** [E1.12].
- Against over-lengthening: *"unnecessarily long cycles can actually slow their
  progress if heavy lifting and testing is limited. If an athlete at a current
  stage can PR the snatch and clean and jerk every few weeks, putting them into
  a training cycle that only gives them an opportunity to hit PRs every 12 weeks
  is not a great idea"* [E2.1].
- Everett runs a **6-week cycle** with no seventh week, ending at a meet [E5.11].
- Time off between blocks is waste: taking 4 weeks between blocks is *"25% of
  your total time, or in the extreme case 33% of your total training time"*
  [E1.12].

**Prescription: 8 weeks — 6 loading, 1 back-off, 1 test.** An athlete at this
stage can still PR frequently, so the shorter end of the amateur range is
indicated [E2.1, E1.12]. Roll straight into Block 2 with no off-weeks [E1.12].

### Back-off week placement and depth

Frequency is supported: *"a general guideline how often should you do a deload
week is 4-8 weeks of intense training"* [E4.1]. Six loading weeks sits inside
that. But the corpus also says frequency *"can vary from person to person"*,
with beginners and lower-intensity trainees needing them **less** often
[E3.5, E4.6].

**Magnitude is genuinely disputed — three positions, no consensus:**

| Source | Prescription |
|---|---|
| Torokhtiy | Cut weight **40–60%**, reduce 5×5 to 2–3×3–5, lengthen rest to 2–3 min, swap exercise variations [E4.3, E3.9]; sample week at 40–50% of 1RM [E4.1] |
| Catalyst back-off week | Keep **load high**, cut reps only [E3.2] |
| Greg Everett | Reduce **weights 10–15%**, **volume 15–25%** [E5.11] |

**Prescription: Everett's version — weights −10–15%, volume −25%** [E5.11].
Chosen because it is the only one of the three given as a direct answer to
"what recovery week follows a cycle" rather than as general advice, and because
Torokhtiy's own text says beginners need less deloading than advanced lifters
[E4.6] — this athlete is not doing the very heavy, very high-volume training
that motivates the deeper cut. **This is a choice among cited options, not a
consensus.** State it as Everett's position, never as what "coaches say."

After the back-off week, reintroduce load gradually rather than jumping back
[E3.5].

### Testing week

- A newer lifter's max *"is by nature limited by technique, not
  strength/power/speed"*, and technique focus and lifting heavy *"are not
  mutually exclusive"* [E5.4].
- Stop a session at form breakdown — the most reliable signal that further work
  produces diminishing returns and rising injury risk [E5.6].
- An alternative to a true 1RM: an AMRAP at ~90–95% tells you how well you have
  acclimatized to a volume increase [E5.7].
- Back squat 1RM frequency: *"maybe one times per two months. I don't know no
  more"* [E16.9].

**Prescription:** test Snatch, Clean & Jerk, Front Squat and the snatch-balance
diagnostic (below). Back squat is tested here only if it has not been maxed
within ~2 months [E16.9]. Stop at the first form breakdown rather than the first
miss [E5.6].

---

## Loading Framework

Everett's intensity taxonomy governs every prescription in this block [E25.3]:

| Purpose | Reps | Intensity |
|---|---|---|
| Technique | 1–3 | 50–70% |
| Power / speed | — | ~75% region |
| Hypertrophy | 5+ | 60–80%, closer to failure than usual at those intensities |
| True recovery | 2–3 | sub-60% |

Applied with Everett's rep-end rule: **high end of the range for squats and
basic strength lifts, low end for snatch, clean and jerk**, to avoid
*"unnecessary disruption of optimal technical execution as a product of
fatigue"* [E25.5].

Torokhtiy's distribution supplies the block-level allocation: do *"the majority
of the lifts with loads between 70% and 80-85%, the average amount with loads
between 85% and 90%, and the minimal number of reps with loads over 90%"*, with
even exceptional athletes staying under 13% of work above 90% [E25.4]. Concrete
zone dosing: 70–80% → 3 reps × 4–5 sets; 80–90% → 1–3 reps × 2–4 sets; 90%+ →
2–6 singles [E25.4]. Strength lifts: *"3-5 sets of 3-5 reps for the squats,
pulls, and presses"*, majority at RPE 8 [E25.4].

For an athlete pursuing hypertrophy specifically, the direction is **lower
intensity and higher volume**, to limit central-nervous-system fatigue the sport
already generates [E25.7]. The same source rejects volume-day/intensity-day
undulation: *"we never do that"* [E25.7].

**Prescribed weights over daily maxes.** *"Prescribing actual weights for your
athletes is typically the best approach... it allows you to know exactly what
they've done and been capable of in the past, meaning you can much more easily
maintain a continual increase over time... rather than inadvertently going in
circles"* — with the stated precondition of adequate training history [E16.7].
17 months of logged training satisfies that precondition.

Where a daily max **is** used, the rules are explicit: stop at the rep max —
*"once you hit your RM that will be your last set for that exercise"* [E16.4];
keep mid-block singles *"conservative... really crispy"* to build confidence
[E16.10]; and treat miss-miss-make as a signal to reset rather than continue
[E16.6].

### Weekly progression

The corpus gives **no clean week-to-week increment rule**. The nearest evidence
describes 2.5 kg steps applied to a *whole cycle on its repetition* — threes 80
→ 82.5, twos 85 → 87.5, ones 90 → 92.5 — with the value located in the twenty
sessions leading up rather than the final one [E26.5]. Timescale for judging
whether progression is working: 12–16 weeks to see a strength difference [E26.8].

**Prescription: hold percentages fixed within the block and let the +2.5 kg step
apply at the block's repetition** [E26.5]. Within-block weekly load increases at
a fixed rate are **[JUDGMENT — NO COVERAGE]** and are therefore not prescribed.

---

## Session Structure

**Snatch first, always.** *"If there's snatching in the session, put it first,
put it before the clean and jerk, put it before the squat"* [E7.12]. The same
passage adds a caveat worth keeping: if a few light snatch sets before squats
measurably wreck the squats, the problem is general conditioning, not the
ordering [E7.12].

Session length runs to about 90 minutes, longer only for more experienced
athletes with more recovery capacity [E6.5].

**How many exercises per session: [JUDGMENT — NO COVERAGE].** Question 6
returned six passages and none of them answers it. The commonly repeated "4–6
exercises per session" rule has **no support anywhere in this pack**. Sessions
below are built to fit the 90-minute figure [E6.5], which is evidence about
duration, not about exercise count.

---

## The Overhead Problem — the block's central decision

This athlete's limiter is the overhead position. The corpus is unusually clear
here, and it points **away** from the intuitive fix.

### Do not treat it as a strength problem by default

*"When an athlete has difficulty supporting the bar overhead in the snatch, it's
natural to immediately assume there is insufficient strength and to address the
problem with strength work. While this may often be the problem, or at least one
part of it, there are other elements to consider that may be preventing the
athlete from properly using what may be adequate strength. In some cases, these
problems can be corrected very quickly"* [E11.2].

Stated independently: *"the overhead squat is rarely an issue of strength. You
usually have weak shoulders or poor mobility in the shoulders, neither of which
need to be trained with an overhead squat"* [E10.5].

### Do not build the block around heavy overhead squats

*"For weightlifters on a normal program starting off, they have no overhead
squat volume programmed. That variation wouldn't really be something we
typically program into any of our weightlifting blocks"* [E10.8]. Where it is
used, it is inside a snatch or snatch-balance complex, *"a frequency of about
one or two times a week... total volume will probably be five, six, seven sets
of kind of two or three reps, so it's never excessive"* [E10.8]. Even in a
program written specifically for a weak overhead, *"it's not a standalone
overhead squat"* [E10.8].

The reason is opportunity cost: *"if we start fatiguing ourselves with an
overhead squat — say if I was doing a five by five progression or a five by
three progression from week to week — I'm going to really really sacrifice a lot
of my recovery capital that I need for the snatch and for the jerk"* [E10.5].

### What to do instead

Better tools for the same quality, at lower load: **strict press behind the
neck, push press behind the neck, snatch balance, soft press** — *"all of these
things can train that with much less load than you would use for an overhead
squat"* [E10.3].

**The diagnostic first**, before any loading decision. Check the position
[E11.11]:

- bar vertically over the **back of the neck**; trunk leaned very slightly
  forward; head pushed forward through the arms
- shoulder blades fully retracted **and upwardly rotated** — *"squeeze the upper
  inside edges together forcefully"*
- elbows extended to **end range**, not merely straight
- bar in the **palms over the forearms**, not behind them
- *"If you can't create this stable base, you're going to have stability
  problems no matter what else you do"* [E11.11]

Then check effort, which the source insists is a real and common failure:
*"That bar wants to be one place — the floor. It will not stay overhead without
your aggressive, continuous effort to keep it there... There is not one single
part of the overhead position that should be passive"* [E11.11].

**A diagnostic that inverts the usual assumption:** *"If you're leaning forward
significantly with the bar overhead, I can be pretty confident that you don't
have a shoulder mobility restriction, because such a position requires more
mobility than a more upright one"* [E11.10]. Forward lean points at **lower-body
mobility or lift execution**, not shoulders [E11.10]. One reader reports fixing
most of the problem via positioning plus **t-spine and ankle** mobility [E11.1].

**Depth helps stability, not hurts it:** *"If you're above full depth, you're
allowing more horizontal motion of the knees and hips, which is amplified in the
arms overhead."* Even without full mobility, *"sit as low as you can with
relatively relaxed legs instead of holding yourself up partially"* [E11.12].

### The prescription

- **Overhead squat and snatch balance with 5-second holds in the bottom before
  recovering** [E11.3]. This is the one place the corpus prescribes OHS, and it
  prescribes it as an isometric quality drill, not a loading progression.
- **1–2× per week, 5–7 total sets of 2–3 reps, inside a complex** [E10.8].
- **Behind-the-neck pressing and snatch balance carry the strength stimulus**
  [E10.3] — **subject to the screen below.**

> **SAFETY CAVEAT, added second pass.** Everett: *"certain mobility limitations
> will **preclude** the use of certain exercises. For example, **limited shoulder
> and thoracic mobility can mean some or all behind-the-neck lifts are
> inaccessible or unsafe**, even if they would otherwise be valuable for that
> athlete"* [E30.12]. For an athlete whose overhead position is the limiter, that
> is not a footnote — screen shoulder and thoracic range **before** loading any
> behind-the-neck work, and use the q29 diagnostic below to locate the
> restriction first.
- **Target for the diagnostic:** snatch balance should reach at least the best
  snatch, *"preferably... something like 15 kilos more or maybe like 10 percent
  more than your best snatch pretty comfortably"* [E10.3, E10.1].
- **Positional pulling work** for the upright posture: low-hang snatches (below
  knee to ~1 inch off the floor), floating snatch pulls, halting snatch
  deadlifts or segment pulls paused at mid-thigh and/or hip [E11.6]. Caution
  against overcorrecting — you do want to be over the bar in the pull [E11.6].

---

## The Jerk — introducing the split

The corpus is at its most unanimous here.

**Learn the split.** *"The split jerk provides the greatest margin for error in
terms of bar placement overhead with its broader base... the least demand on
flexibility, and the greatest ease of recovery from even a very deep receiving
position. In other words, it's very much worth putting in the time and effort to
try to master the split jerk rather than giving up and only using the power
jerk"* [E14.5, E14.7]. It *"offers every possible great advantage you can have
for the jerk, which is why essentially everybody uses it"*; the power jerk's
only advantage is simplicity, and its margin for error is *"very small"* [E14.1].

**The transition is smaller than it looks.** *"The dip and drive of the split
jerk should be identical to that of the power jerk and even push press — that
is, it needs to be straight down, straight up and complete. The lift only varies
with the splitting of the feet"* [E14.5]. An athlete with a trained push/power
jerk already owns the hard half; only the footwork is new.

**The most common failure and its cause:** driving forward is *"normally the
result of the lifter being so focused on the split that they begin it too early,
and in combination with that, leaning or diving the chest forward as part of the
split action"* [E14.5].

**How it is actually built — practice volume, not exercise selection.**
*"Push press from split, jerk press from split are all mildly useful, but
ultimately it comes down to number of precise correct repetitions with the right
split jerk positions"* [E14.12]. And: *"if you can't do it correctly and
precisely without weight you have no hope of doing it correctly and precisely
with 100% of your clean and jerk, so practice the correct position non-stop
every day until you acclimatize, until you accumulate hundreds and thousands of
repetitions"* [E14.4].

**Keep the power jerk — it is not a compromise.** *"If I train power jerk a lot,
if I do it like two or three times a week, it helps my split jerk so much... If
I ever have issues with the split jerk I'll do power jerks a couple times a
week. It normally fixes it right up"* [E14.3].

**Strength support for the jerk** [E15.11]: the drive is *"primarily achieved by
the quads"*, so front squat is the base lift; if squatting is adequate but the
drive is weak, use **partial front squats, jerk dip squats, jerk drives, jump
squats**. Trunk strength matters directly — *"softening of the trunk during the
dip and drive of the jerk can absorb a significant amount of"* the drive
[E15.11].

**Pressing supports the jerk.** The "weak press, big jerk" boast is pushed back
on because those lifters are *"incredibly inconsistent"*: *"you can have a good
jerk without having a good press, but having a good press doesn't mean you're
gonna have a bad jerk, and it more than likely will make you have a better
jerk"* [E14.11].

**Prescription:** empty-bar split practice **daily** [E14.4]; power jerk
retained 2×/week [E14.3]; split jerk from rack introduced at technique loading
(1–3 reps @ 50–70%) [E25.3]; front squat as the jerk's strength base [E15.11];
strict/push pressing kept in the block [E14.11]. Balance must not change from
start to finish — do not dive onto the front leg or reach the back foot so far
it pulls the hips out from under the bar [E14.8].

---

## Squatting

**Long-limbed mechanics govern the rep range.** *"Doing really really high reps
with long legs doesn't pan out, because you're doing all your reps with your
back, you get tired and then suddenly the pressure shifts to your back. Doing
really really heavy reps like singles or doubles or whatever is also going to be
the same situation — you're going to shift pressure to the muscles that are
stronger"* [E20.6]. The fix is twofold: *"find the rep ranges that those people
can execute perfect squat technique with and spend the majority of our time
there"*, and *"find other exercises that let us attack that weakness in their
legs, primarily their quads"* [E20.6].

**The zone, with numbers:** *"most of us will be able to do a somewhat decent
squat with around 65 to 70% of our 1RM and it will look pretty good... but once
I start getting higher than that in terms of the weight, or once I start
deviating above three to five reps, I'll really start to notice those positions
breaking down"* [E20.10].

**Expect the load to drop first.** Adopting the correct pattern means *"you're
able to do about 60 to 70% of your original 1RM and that's not sustainable. What
you're going to have to do is have a very pronounced period of accessory
training, a very much prioritized leg and quad strength block"*, after which the
old numbers are surpassed [E20.7].

**Technique points:** stance about shoulder width — too wide *"becomes very
glute and very posterior dominant"* and drives the hips back [E20.2]; hands
stacked closer with the chest upright so the back resists tilting forward
[E20.8]; midline control means anterior **and** posterior core [E20.8]. Hips
shooting back is trainable, not fated: *"if any of the reps can be done with
less or no tipping, then all of them can be. It just takes training and
control"* [E20.9].

**Back pain shapes the selection.** Front squat is preferred over back squat for
a painful lower back *"because you keep a more upright posture in the front
squat"* [E22.2]; and an athlete with a bad lower back was moved to *"the pulls
from the blocks for a long time"* [E22.2]. Top-level Chinese squat frequency is
notably low — *"one front one back"* per week [E22.2]. Everett's lifters, by
contrast, squat *"usually 4-6 days/week, sometimes twice daily"* [E20.11] — a
real disagreement in frequency; the back-pain constraint decides it here toward
the lower figure [E22.2].

**CORRECTED PRESCRIPTION (second pass, all 30 files read).** The original
prescription here made the **front squat** the primary squat. That was wrong,
and q18 — unread when this was written — says so from four sources:

- *"in general **two back squats, one front squat** for most of your career is
  going to be one of the best ratios you can do… the most productive
  long-term"*; back squats are "more useful", the front squat is "something that
  you **practice**", and "one good quality front squat a week is big" [E18.3,
  E18.5]
- *"most of a weightlifter's lower body strength will be developed through **back
  squats, especially in the beginning/intermediate years**"* — this athlete's
  stage. The front squat "is used more for strengthening the posture and
  positions of the clean" [E18.4]
- *"**Eliminating back squats will be a bad idea for 99% of you**"*; the
  famous front-squat-only lifters did it only in their most advanced years
  [E18.2]
- back squats permit higher loads, put "less stress on your knee joints", no
  shoulder/wrist stress, and are "much more efficient with higher reps… a
  perfect fit for base (strength) period" [E18.10]

**And the athlete's own ratio points the same way.** The norm is a front squat at
**85–90% of back squat** [E18.7]; this athlete is at roughly **98%** (front squat
est. 1RM ~116 against a tested back squat of 118). Whichever way that is read,
the back squat is the lift with room in it.

**So: back squat primary, roughly 2:1 back to front, front squat kept as one
good quality session a week** [E18.3, E18.5, E18.11]. Both squats stay at
**65–70% × 3–5 reps** for the long-limb reason [E20.10], run at the high end of
the rep range [E25.5]. Quad-priority accessory work runs throughout [E20.6,
E20.7].

**The tension this creates, stated rather than resolved:** [E22.2] prefers the
**front** squat for a painful lower back, "because you keep a more upright
posture in the front squat." The corpus points one way on strength development
and the other way on back protection. Both are cited; the trade-off is the
athlete's to make, not this document's.

**Squat frequency: athlete's call, and the athlete's is higher.** The corpus
holds both "one front one back" per week [E22.2] and "usually 4-6 days/week,
sometimes twice daily, and not necessarily with low volume" [E20.11]. The
athlete squats heavy ≥3×/week and tolerates it, which sits inside Everett's
range; that stands (Judgment Ledger item 11).

**What the evidence does object to is near-max singles, not frequency.** Going
for a back-squat 1RM belongs at roughly *"one times per two months"*, from a
coach whose base work is *"like 4x3, like 5 by two"* [E16.9] — heavy often, max
rarely. And for long limbs specifically, load migrates to the back at **both**
extremes, singles included [E20.6]. So added squat volume belongs in the 3–5
rep band, which [E20.11]'s "not necessarily with low volume" directly supports.

---

## Weekly Layout

Day assignment to weekdays follows the fixed schedule. **The mapping of session
content onto specific days — which quality lands on Monday versus Thursday — is
[JUDGMENT — NO COVERAGE]**: it is driven entirely by the night-shift sleep
pattern, which the corpus does not address. The one scheduling fact the corpus
does supply is that five days is the most common weightlifting week and that the
real determinant is what the athlete can practically manage [E3.6].

### D1 · Monday — Snatch + Overhead Quality

| Slot | Prescription | Cite |
|---|---|---|
| Opener | Snatch first in the session | [E7.12] |
| Primary | Hang power snatch, 1–3 reps @ 50–70% (technique loading) | [E25.3, E25.5] |
| Overhead | Snatch balance + OHS complex, 5–7 sets of 2–3, **5-second bottom holds** | [E10.8, E11.3] |
| Positional | Halting snatch deadlift / segment pull, paused mid-thigh | [E11.6] |
| Squat | Front squat 3–5 × 3–5 @ 65–70% | [E20.10, E25.4] |
| Trunk | Anterior + posterior midline work | [E20.8] |
| Daily | Empty-bar split jerk practice | [E14.4] |

### D2 · Tuesday — Clean + Pressing

| Slot | Prescription | Cite |
|---|---|---|
| Primary | Hang power clean, low reps — speed decays by rep 4–5 | [E15.12, E25.5] |
| Pull | Clean pull, 3–5 × 3–5 | [E25.4] |
| Press | Strict press / push press behind neck | [E10.3, E14.11] |
| Hypertrophy | Upper-body work, 5+ reps @ 60–80%, near failure | [E25.3, E25.7] |
| Daily | Empty-bar split jerk practice | [E14.4] |

### D3 · Wednesday — Squat (hard stop 3pm)

| Slot | Prescription | Cite |
|---|---|---|
| Primary | Back squat 3–5 × 3–5, the week's single back-squat session | [E22.2, E25.4] |
| Quad accessory | Back-sparing quad work, prioritized | [E20.6, E20.7] |
| Positional | Pulls from blocks — the back-pain accommodation | [E22.2] |
| Trunk | Midline control | [E20.8] |
| Daily | Empty-bar split jerk practice | [E14.4] |

Wednesday load ceiling is **[JUDGMENT — NO COVERAGE]** — driven by the 7pm shift,
which the corpus does not address.

### D4 · Thursday — Jerk Priority

| Slot | Prescription | Cite |
|---|---|---|
| Primary | Split jerk from rack, 1–3 reps @ 50–70% (technique loading) | [E25.3, E14.5] |
| Secondary | Power jerk — retained, supports the split | [E14.3] |
| Drive strength | Jerk dip squat / jerk drive / partial front squat | [E15.11] |
| C&J | Clean & jerk, low reps | [E15.12] |
| Trunk | Trunk stiffness for the dip and drive | [E15.11] |
| Daily | Empty-bar split jerk practice | [E14.4] |

Reduced loading on this day (post-shift sleep) is
**[JUDGMENT — NO COVERAGE]**.

### D5 · Saturday — Recovery-Quality Technique

| Slot | Prescription | Cite |
|---|---|---|
| Whole session | 2–3 reps @ sub-60% — *"lifting to keep the motor skills and mobility fresh while allowing the body to recover"* | [E25.3] |
| Overhead | Snatch balance, light, positional | [E10.3, E11.11] |
| Quad accessory | Back-sparing, higher-rep | [E20.6, E25.7] |
| Daily | Empty-bar split jerk practice | [E14.4] |

Everett's "true recovery work" category [E25.3] fits this day's role exactly and
is used in preference to inventing a light-day scheme.

---

## Second-Pass Additions (2026-08-11, all 30 files read)

The original document was written from 16 of the 30 question files. The
remaining 14 were read afterwards. Two findings **corrected** the document
above (front vs back squat; the behind-the-neck safety screen). The rest are
additions, collected here rather than woven in, so the provenance of each stays
visible.

### The clean:front-squat gap has a named cause

Everett: pause squats *"lack a really important function — training the ability
to bounce out of the bottom that we need in heavy cleans… That magnified force
is one of the reasons athletes **collapse under cleans with weights well under
what they can front squat**"* [E19.6]. This athlete's clean (80 kg) is ~69% of
the front squat 1RM — the ratio being described.

**But pause squats are also indicated here**, for a different fault: use them
"if you're having a real issue with technical proficiency at the bottom of the
squat — so if you squat down and you immediately shoot those knees back and you
end up kind of good-morning the squat", with a slow eccentric [E19.7]. That is
the long-limb pattern.

**Resolution: run both. Do not let pause front squats replace bounce front
squats.** Pause duration is **CONTESTED** — 3 seconds [E19.12] versus pausing
only long enough to kill momentum, on the grounds that long pauses "just create
hip issues and knee issues" [E19.1, E19.3].

### Trunk work — aim it, place it, and one piece may be recuperative

- The trunk's job in the lifts is to *"act as a **rigid support structure**"*, so
  prioritize **static strength** [E24.1].
- Aim it **anterior and lateral**: the classic lifts, squats and pulls already
  load the lower and middle back heavily, so that area *"will require somewhat
  less specific training than the anterior and lateral aspects of the torso"*
  [E24.3].
- **Placement matters:** stiff-legged deadlifts, RDLs and good mornings *"are
  best performed at the **end** of heavy training sessions"*; lighter back
  extensions and reverse hyperextensions can run between heavy sessions and
  *"often prove **recuperative**"* [E24.1].
- Weak backs: intense back work 2–3 days/week, lighter work on other days
  [E24.1].
- **Rib flare and lumbar extension overhead can be a shoulder-mobility problem
  misread as a weak core** [E24.7] — the same inversion as [E11.10]. The drill
  that serves both readings: barbell roll-outs with a shoulder focus, ~4 kg,
  rolled only to the range controlled, then isometric holds.

### Hang work has a ceiling and an exit

- Hang variations should sit at **~90% of the lifts from the floor** [E9.5], and
  once they reach it they stop paying: *"that's definitely enough, it's not going
  to benefit us anymore, we need to focus on that snatch and clean and jerk
  again"* [E9.7].
- **The exit protocol**, for Block 2: *"forget about the hang snatch — keep it in
  there for the next few weeks, just keep it somewhere between three to four sets
  of two at **super lightweights**, and let this [the full lift] take over"*
  [E8.8].
- **Hang can become a crutch**: high-hang work is "easier to hit big numbers
  with" and builds "a psychological barrier to hitting PBs" from the floor
  [E9.5]. Lifters arrive at meets having done "loads of hangs or variations or
  complexes or blocks or pauses" without the floor repetitions they needed
  [E8.5]. Block 1 is built on hang primaries; this is the transition risk.
- For **technical correction** the order is **pause > hang > blocks**; blocks are
  "a third and distant option… not really for technical adjustments" [E9.2].

### Pull loading — the live block's heavy pulls are defensible after all

The conventional band is 80–105% of the best snatch or clean [E17.2]. But
Everett adds the exception that fits this athlete exactly: for *"newer lifters
who nearly always have a surplus of strength relative to their technical ability
to use that strength… this range of percentages is **far too light**"* [E17.9],
and he names the profile — *"a lifter who has a **poor overhead position in the
snatch** and consequently can't snatch as much as he or she would be expected to
based on how much he or she can pull with ease"* [E17.4].

Protocol when pulls go heavy: finish the series *"with a significantly lighter
set to finish with **speed** rather than with the more grinding pulls… around
85–90%"* [E17.5]. For technique stability under load, hang or block pulls at
100–150% suit the base period [E17.8].

**This also suggests `CLAUDE.md`'s principle "pull weights should not grossly
exceed competition lift weights", attributed to Everett, is an oversimplification
of what he actually says.** Worth re-checking against source.

### Session ordering and spacing

- Touch **both** lifts every session, not one per day: *"the only real practice
  for the snatch and clean and jerk is the snatch and clean and jerk… better to
  do both, some form of those exercises every single session"* — power snatch,
  snatch balance, power clean all count [E8.1].
- **Never more than two training days in a row** [E8.9]. The recommended 4-day
  layout is Mon/Tue/Thu/Sat [E8.12].
- Accessories: *"one or two bodybuilding [exercises] plus one core or one lower
  back"*, at the end of the session [E28.3]. Don't copy elite accessory lists —
  those lifters have unlimited time and already-mastered technique [E28.1].

### Autoregulation — a caution that lands hard on a self-coached athlete

Everett: *"RPE and RIR are arguably just as variable as percentages. The real
difference is that we're shifting the choice of weight from the coach to the
athlete… **lifters who tend to always push as hard as possible are going to
underestimate their effort**"* [E27.7]. Two further sources note that warm-up
feel does not predict the session [E27.2, E27.9].

With no coach checking the estimate, the available mitigation is Everett's own:
log the predicted RPE and compare it against what actually happened [E27.7].
And do not over-precision the loads — a 5–10% error by feel "is normal, nothing
terrible"; exact numbers matter only at genuine limit weights [E27.10].

### Mobility dosing — CONTESTED

- **Daily**, especially for a problem area: *"if something's a problem you should
  be doing it pretty much every day until it's less of a problem"* [E30.8];
  *"the best general approach to overhead mobility is to include overhead
  movement **every day**… every day includes days outside the gym"* [E30.10].
- **Not daily**: *"it is not advised to exercise mobility every day… 2–3 mobility
  training sessions per week are suggested, with at least one day of rest in
  between"* [E30.1].

The daily reading has the better provenance for this application (both sources
are weightlifting-specific, and the ankle protocol in [E29.8] specifies "every
day" for six months). Recorded as contested rather than settled.

**And a test for whether mobility work is working at all:** *"if you don't see an
improvement after one or two sessions, probably you're either doing it wrong or
it's not going to work for what you want. If you see any improvement, stick with
it"* [E30.9].

### The ankle diagnostic — one session, empty bar, two change plates

Everett's sequence [E29.9]: overhead squat with an empty bar at normal stance,
5-second hold in the bottom; repeat feet wider; repeat wider with toes out; then
**repeat the whole sequence with the heels elevated on change plates**.

- noticeably easier and more stable with heels elevated → **ankle mobility is
  limited**
- not noticeably better → **the issue is hips, or both**
- a position that lets you hit depth upright but still feels unstable → **an
  actual stability issue**

Companion test [E29.3]: *"if you find you can do [overhead squats and heaving
snatch balances] with significantly more weight than you can snatch, **the ankle
isn't what's holding back your snatch**."*

Ankle dosing, if limited: 15 kg minimum and realistically 25 kg loaded onto the
knee [E29.1], 3–5 sets of 90 seconds per side [E29.8], daily, expecting months
[E29.8]. A **time-limited** workaround while it catches up: raise the heels and
squat just above parallel to keep quad tension — explicitly *"not a long-term
training strategy"* [E29.12].

### Two questions that returned passages but no answers

- **q6 exercises per session** — nothing addresses exercise count.
- **q12 muscle snatch** — nothing addresses what it develops. The live block's
  daily muscle-snatch opener is supported as generic pattern work [E8.1, E7.12],
  but not as the muscle snatch specifically.

A retrieval-quality note: q28 returned only site navigation from Everett's *"My
5 Favorite Accessory Exercises"* and *"Bodybuilding Accessory Work for
Weightlifters"* — titles that promise exactly what was asked, chunks that
contain none of it. That is a chunking limitation, not a corpus gap.

---

## Judgment Ledger

Every decision this corpus could not make. **Eleven items**, each a real gap
rather than an oversight.

| # | Decision | Why it is judgment |
|---|---|---|
| 1 | The 5-day week and which day carries which quality | Driven by night-shift sleep; corpus has confirmed zero coverage. Only "five days is most common" is cited [E3.6] |
| 2 | Wednesday load ceiling before a 7pm shift | Night-shift accommodation — no coverage |
| 3 | Thursday reduced loading after ~5.5h sleep | Same |
| 4 | Any back-pain gate (threshold or load reduction %) | **q22 returned no return-to-load protocol, no threshold, no percentage.** See below |
| 5 | Number of exercises per session | q6 is covered but does not answer; "4–6 exercises" has zero support |
| 6 | Absolute kg for every prescription | Percentages are cited; the arithmetic onto this athlete's TMs is not a corpus claim |
| 7 | Choosing Everett's deload depth over Torokhtiy's or Catalyst's | A choice among three cited positions — defensible, not consensus |
| 8 | Within-block weekly load increments | q26 gives no rule; only cross-cycle 2.5 kg steps [E26.5] |
| 9 | Specific accessory exercises not named in the pack | Named ones are cited; anything else is selection |
| 10 | ~~Mobility dosing~~ — **resolved second pass** | No longer judgment: q29/q30 were read. Dosing is cited [E29.1, E29.8]; *frequency* is CONTESTED [E30.10 vs E30.1], which is a corpus disagreement, not a gap |
| 11 | **Squat frequency** — choosing "one front one back" over 4–6 days/week | The corpus holds both [E22.2 vs E20.11]. Chosen low **because of back pain**, not because the evidence pointed there. **Overridden by the athlete 2026-08-11**, who squats heavy ≥3×/week and tolerates it — revealed tolerance data the corpus cannot contain, and inside Everett's stated range. Override stands; see the amendment in the diff |

### On item 4, specifically

The live program carries a pain-gate of the form *"back pain >3/10 pre-session →
drop load ~40%"*. **Neither number appears anywhere in this corpus.** Question 22
retrieved four passages, of which two are usable, and they give a *method* —
learn your own flare-up triggers by matching trends, then *"keep it in your
program and do it diligently"*, and see a professional [E22.3] — plus one
precedent for substituting block pulls and favouring the front squat [E22.2].

That is not a protocol, and this document does not invent one. The shape of the
"3/10 / 40%" rule is the same shape as the archived synthesis's *"stop if pain
>3/10"*, which retrieval has already shown to be unsupported. **A rule that
sounds clinical and cites nothing is the exact failure this project exists to
detect** — and here it is, still shipping.

Managing chronic back pain under load needs a clinician, not a corpus.

---

## What This Block Would Be Called

Not "Hypertrophy Foundation." On the evidence, Block 1 for this athlete is
**a weightlifting block with embedded hypertrophy, built around fixing the
overhead position and installing the split jerk** — with the squat run in the
narrow rep band where a long-limbed lifter's technique survives, and the back
protected by exercise selection rather than by a numeric pain rule.
