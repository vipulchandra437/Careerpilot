# MEMORY — Design Decisions Log

This file records the rationale behind non-obvious engineering choices so a
future reader can distinguish "intentional" from "accidental" behavior.

## Feature Weighting (5-feature readiness engine)

The Career Readiness headline is a weighted sum of five per-feature scores:

| Feature           | Weight |
| ----------------- | ------ |
| resume            | 30     |
| mock_interview    | 30     |
| coding_test       | 20     |
| roadmap           | 15     |
| target_companies  | 5      |
| **Total**         | **100**|

### Decision
Keep the current weights. The comment above `FEATURE_WEIGHTS` in
`frontend/src/lib/readiness.ts` carries the one-line rationale:

> Weighed by hiring-signal density: resume & interview carry the most signal
> (30 each), coding proof (20), roadmap engagement (15), target-company intent
> (5).

### Why these values
- **resume (30) / mock_interview (30)** — together form the core hiring signal
  an employer forms from a candidate; each is a direct, scored artifact, so they
  dominate.
- **coding_test (20)** — objective proof of problem-solving, but not available
  to every role, so it sits below the two written artifacts.
- **roadmap (15)** — engagement/progression signal; valuable but a proxy for
  "keeping the pipeline moving," not a hiring artifact itself.
- **target_companies (5)** — intent signal. Because it was previously a binary
  0/100 cliff, a 5-point weight left it with outsized leverage relative to the
  effort required. The rule was therefore softened (see next section) to make
  the 5-point allocation behave like the other graded features.

## Target Companies Scoring Rule

### Context
The previous backend rule was binary: 100 if any active target company exists,
otherwise null. This caused a 5-point cliff (0 → 100) for the lowest-weighted
feature, which distorted the headline and gave "set one target"
disproportionate credit.

### Decision
Replace the 100-or-null rule with a count-driven gradient, mirrored in both
the backend (`src/server/readiness-data.ts`) and the shared frontend helper
(`computeTargetCompaniesScore` in `frontend/src/lib/readiness.ts`):

| Active target companies | Score |
| ----------------------- | ----- |
| 0                       | null  |
| 1                       | 50    |
| 2 or more               | 100   |

`null` remains the "not measured" value (0 contribution, `not_started` status),
so an untouched feature still reads as absent rather than failing.

## Per-Feature Status Model

### Decision
Status is three-valued instead of two:

| Score        | Status            | UI label   | Color       |
| ------------ | ----------------- | ---------- | ----------- |
| null         | `not_started`     | Not started| text-muted  |
| >= 70        | `strong`          | Strong     | text-success|
| < 70         | `weak`            | Needs work | text-warning|

- `null` (no data) is never reported as a failing grade; it is "not measured."
- 70 was chosen as the cutoff so a single strong feature shows green even when
  the headline is still climbing toward the 80 "On Track" threshold.

### Today's Focus (lowest contributor) logic
A `not_started` feature (0 contribution) is excluded from "Today's Focus"
selection unless **every** feature is `not_started`, in which case the first
feature in `FEATURE_ORDER` (`resume`) is surfaced. This keeps the focus pointer
on something the student can actually act on rather than a feature with no
data at all.

---

Last updated: 2026-10-23 — readiness refinements verified (3-valued status model, count-based target-company scoring, weight rationale). 14/14 unit tests pass; root `npx tsc --noEmit` clean.

## Spec divergence

An earlier draft of this engine proposed weights of resume 25 and target_companies 10 and statuses of done, in_progress, and not_started. The team chose resume 30 and target_companies 5 with statuses strong, weak, and not_started instead, for the reasons already documented above. No code, tests, or dashboard behavior was changed by this note.
