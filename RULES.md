# RULES.md — Standing Rules for AI-Assisted Development

Every rule here explains why, not just what — an AI agent (or human) should be able to make a judgment call in a new situation by understanding the reasoning, not just pattern-match the exact wording. If removing a rule wouldn't change how the code gets built, it doesn't belong here.

## 1. LLM / OpenRouter Usage

- **Rule:** All LLM calls go through `backend/ai/orchestrator.py` (architecture.md §5.1) — never call OpenRouter directly from a feature service. **Why:** without a single choke point, swapping a model, adding cost logging, or enforcing a rate limit means hunting through every feature file instead of editing one place.
- **Rule:** Every LLM-generated output shown to a user (roadmap, feedback, challenge, interview question) is logged to `llm_usage_log` with the prompt template version + model used. **Why:** this is the only way to debug "why did it say that" later, and it's required for the credit-based billing in PROMPT.md.
- **Rule:** Never send a full resume/PII payload to a model without checking that specific OpenRouter provider's data-retention policy. **Why:** OpenRouter routes to multiple underlying providers with different data policies — "OpenRouter is fine" isn't a real answer, the underlying model matters.
- **Rule:** Prompts live in versioned files under `backend/ai/prompts/`, one file per feature — never as inline strings scattered through the codebase. **Why:** a prompt tweak should be a single-file diff you can review and roll back, not a hunt through business logic.

Example — good:
```python
response = orchestrator.call_llm(feature="gap_analysis", prompt=render("gap_analysis.txt", context), user_id=user.id)
```

Example — bad (do not do this):
```python
response = openrouter_client.chat.completions.create(model="...", messages=[{"role": "user", "content": f"Analyze this resume: {resume_text}"}])
```

## 2. Security

- **Rule:** Never execute student-submitted code in the main backend process — always route through the sandbox service (architecture.md §5.2). **Why:** arbitrary code execution in the API process is a full remote-code-execution vulnerability; this is the single highest-severity risk in the whole project.
- **Rule:** Resumes/uploads are private by default — never expose a direct S3/bucket URL; always proxy through an authenticated endpoint that checks ownership. **Why:** a leaked direct URL means anyone with the link can read a student's PII forever, even after they delete their account in the UI.
- **Rule:** GitHub OAuth tokens are encrypted at rest and never appear in logs (including error logs/stack traces — scrub before logging). **Why:** a token in a log file is a token that's leaked the moment that log is shared, backed up insecurely, or breached.
- **Rule:** Admin routes are gated server-side by role, not just hidden in the frontend nav. **Why:** hiding a button doesn't stop someone from calling the API endpoint directly — the server must reject the request regardless of what the UI shows.

## 3. Code Style & Structure

- **Rule:** Backend: one service module per domain (`profile_analysis`, `gap_engine`, `roadmap`, `coding_challenges`, `interviews`) — no shared `utils.py` for business logic (helper functions like date formatting are fine there; skill-matching logic is not). **Why:** a shared dumping-ground file becomes unreadable and untestable within a few weeks — domain logic needs a domain home.
- **Rule:** Frontend: co-locate components with the feature they belong to (`/components/roadmap/MilestoneCard.tsx`); only truly shared primitives (Button, Card, Input) live in `/components/ui`. **Why:** makes it obvious where to look for and add feature-specific UI without guessing.
- **Rule:** Comment the why, not the what, for anything non-obvious.
  - Example — bad: `# don't run here`
  - Example — good: `# never execute user code here — this is the main API process; route through sandbox.run() instead (see architecture.md §5.2)`

## 4. Testing & Verification

- **Rule:** Any LLM-dependent feature (gap analysis, roadmap, interview questions, feedback) needs a small evaluation set — 5–10 sample inputs with expected qualities of output (not exact text) — reviewed before the feature is marked done. **Why:** LLM outputs vary; without an eval set you can't tell "the prompt got worse" from "the output is just different this time."

- **Eval set entry — Communication feedback anchors to real turns with verbatim quotes:**
  - **Input:** A completed (ended) mock-interview session with at least 2 student answers on the transcript (post-session feedback request).
  - **Expected quality:** Every `feedback_items` entry must carry a `turn_id` that exists in the session and is a STUDENT turn, and a `quote` that appears verbatim (whitespace-normalized) inside that turn's content. ≥3 items, spanning clarity/structure/conciseness. This is PRD §6.5's "references specific lines, not generic advice."
  - **Stability check:** Run on a real 5+ exchange transcript; the anchor check (id exists + role student + quote verbatim) must pass for 100% of items across runs.
  - **Why:** The whole point of Communication Feedback is specificity — feedback whose quotes are paraphrased or links fabricated is indistinguishable from generic advice and fails the feature. The service enforces this deterministically in `_validate_feedback_items` (drops fabricated ids, replaces non-matching quotes with real excerpts, `_deterministic_feedback` fallback is always turn-anchored); this eval is the behavioral confirmation at the API level.

- **Eval set entry — SQL reason stability (gap analysis):**
  - **Input:** Backend Engineer profile with SQL evidenced on LinkedIn (low confidence)
  - **Expected quality:** Reason must reference the actual evidence source (e.g., "listed on your LinkedIn") and NOT claim "not evidenced" or fabricate sources like "mentioned in resume"
  - **Stability check:** 3+ consecutive runs must produce identical reason text for the same skill
  - **Why:** Prior variance saw the same input alternately produce `sql: critical` with "not evidenced in the current profile" (contradicted by LinkedIn evidence) and `sql: important` with correct source attribution — this catches run-to-run drift before roadmap generation

- **Eval set entry — Interview follow-up enforces a concrete detail (technical session, vague opener):**
  - **Input:** Technical mock-interview session. Turn 0 = interviewer opens with a DSA/system-design question. Turn 1 = candidate answers vaguely / off-topic (e.g., "I've worked on backend stuff for a while, mainly building APIs. It was pretty standard, nothing too crazy.") without addressing the question.
  - **Expected quality:** The turn-2 follow-up must ENFORCE a concrete detail (demand a specific example, mechanism, or trade-off; e.g. "give me a specific example of…") and must NOT bridge generically ("how does your backend experience help this problem?"). **Reference standard:** the behavioral interviewer's turn-2 response to the same vagueness ("What was the specific conflict… and how did you approach the conversation to resolve it?") — that is the compliance bar.
  - **Stability check:** Run the same vague opener across 3+ separate technical sessions; the follow-up must enforce a concrete detail in ALL runs (for full compliance), and any run that bridges generically is a recorded failure against this eval.
  - **Why:** The initial build reproduced this gap — the technical interviewer mostly bridged generically on a vague first answer while the behavioral interviewer enforced the concrete-detail rule correctly. It is a prompt/compliance calibration issue, not a broken feature, but without a pinned case it silently regresses. Companion regression guard (deterministic, no LLM): `test_interviews.py::test_followup_prompt_enforces_concrete_detail` asserts the technical prompt file still contains the vague/off-topic enforcement rule; the live check above is the LLM-behavior side.

- **Eval set entry — Gap analysis: no fabricated evidence across MULTIPLE mixed-evidence skills (beyond the single-skill SQL case):**
  - **Input:** A Backend Engineer profile where evidence is deliberately mixed: `python` evidenced ONLY on the resume, `docker` evidenced ONLY in a project description (tech + prose, not a bare skill tag), `kubernetes` evidenced ONLY as a GitHub language (no explicit bullet), and `AWS` with NO evidence at all. All four are required skills.
  - **Expected quality:** For each required skill the `reason` must (a) attribute evidence to the ACTUAL source present (resume vs project description vs GitHub languages), (b) never claim a source that is absent, and (c) for the no-evidence skill (`AWS`) plainly state lack of evidence — never invent a resume mention, a project, or a confidence label. For **present** skills this is guaranteed deterministically (merge uses a source-grounded reason, never the LLM's free-form text). For **absent** skills it is enforced by the prompt's CORRECTNESS-FIRST rule with a deterministic "no evidence" fallback when the LLM is silent. Severity must reflect the real depth: a bare tag (`python`) surfaces a depth gap more readily than a project that demonstrably *uses* it (`docker`).
  - **Stability check:** 3+ consecutive runs; every reason must stay source-accurate, and the no-evidence skill must NOT be mis-attributed in any run. **Why:** The single-skill SQL case fixed one fabrication path; this pins the general rule across the sources the engine distinguishes (resume/GitHub/projects/languages/full-text) so a drift in one alias or one source handling can't reintroduce invention elsewhere. Companion deterministic guards (no LLM): `test_gap_engine.py::TestEvalSetBeyondSql` — `test_absent_skill_fallback_is_grounded_when_llm_silent` (absent skill → grounded "no evidence" fallback) and `test_deep_project_evidence_matches_not_bare_tag` (a `docker` project description matches deterministically while `AWS` does not).

- **Eval set entry — Roadmap: milestones are gap-linking, sequenced, and actionable (practice over theory):**
  - **Input:** A gap report for Backend Engineer with gaps `sql` (critical), `docker` (important), and `git` (nice_to_have), plus profile evidence showing the student already has partial `docker` evidence (matched=true).
  - **Expected quality:** Every milestone's `linked_gap_skill` must exactly match a skill in the gap list (no invented/paraphrased skills); each milestone has a concrete `linked_action_type` (challenge/interview/resource) + non-empty `linked_action_id` (not just "study"); `order_index` is sequential with critical gaps first; and the already-partial `docker` milestone is framed as "deepen/apply", not "learn from scratch". 4–8 milestones.
  - **Stability check:** 3+ runs; every milestone must survive `_validate_milestones` (exact skill match + valid action type + action id), and no milestone may be created for a skill not in the gap list. **Why:** Roadmap is the conversion hook (PRD §6.2) — a milestone for a non-gap skill or a "just study" action is a broken promise. The deterministic validator already discards bad milestones; this eval is the LLM-side behavioral confirmation on top. Companion deterministic guards (no LLM): `test_roadmap_eval.py` — `test_validate_discards_non_gap_skill`, `test_validate_discards_missing_action`, `test_validate_keeps_valid`, and `test_roadmap_orders_critical_first` (fallback ordering).

- **Eval set entry — Coding challenge: solvable, stdlib-only, valid strict-JSON, first test = stated example (PRD §6.3):**
  - **Input:** One generated challenge for skill `sql` at intermediate difficulty for Backend Engineer.
  - **Expected quality:** The generated `test_cases` are 3–6 literal JSON string values (no Python expressions/repetition in `stdin`/`expected`); the FIRST test case exactly matches an example shown in the `prompt`; at least one test is an edge case; `expected` values include exact newlines via `\n`; the challenge is solvable in stdlib-only Python 3; JSON parses in one pass. A solvable-against-test-cases reference solution passes all its own test cases.
  - **Stability check:** 3+ runs; every run must produce a `_validate_challenge`-valid challenge with ≥1 runnable passing reference solution, and 100% of runs must avoid expression-valued JSON (the retry hint covers the common failure). **Why:** A challenge whose tests can't run, or whose expected output doesn't match its own stated example, is a broken practice loop. This eval pins the whole "self-contained, gradable" contract. Companion deterministic guards (no LLM): `test_coding_challenges.py::TestEvalSetChallenge` — `test_rejects_non_literal_strings_in_tests` and `test_first_test_matches_prompt_example`.

- **Rule:** Deterministic logic (parsing, skill matching, scoring, billing math) gets real unit tests. LLM-generated content gets spot-check review against the eval set, not unit tests asserting exact output text.
- **Rule:** Before a phase in PHASE.md is marked complete, its exit criteria must be demonstrated (a passing test, a working screen, a sample output) — not assumed because the code "looks right."

## 5. What NOT to Do

- Don't scrape LinkedIn — manual import/paste only (ToS + legal risk; see PRD.md §6.6).
- Don't hardcode a specific LLM model/provider anywhere outside the orchestration module.
- Don't add a feature not listed in PRD.md without updating PRD.md first — scope drift is how student side-projects never ship.
- Don't skip the sandbox for code execution "just this once," even in a demo/dev environment.
- Don't build multi-tenant UI or B2B admin features in v1 (see PROMPT.md) — the architecture should allow it later, but building it now is wasted effort against an unconfirmed buyer.

## 6. Git / Commit Conventions

- One commit per completed phase task, message format: `[Phase N] short description` (e.g., `[Phase 1] add resume PDF parsing`).
- Never commit `.env` files or anything under `/secrets` — confirm `.gitignore` covers these before Phase 0 is marked done.
