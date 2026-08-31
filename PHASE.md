# PHASE.md — Build Phases

Each phase lists concrete tasks and exit criteria that must be *demonstrated*, not assumed. Do not start a phase's tasks before the previous phase's exit criteria are verified (RULES.md §4).

## Phase 0 — Setup
**Goal:** Project skeleton ready to build on.
- [ ] Repo structure per architecture.md §6 (backend/frontend split, folders scaffolded).
- [ ] `.env.example` with all required keys (OpenRouter, DB, S3, GitHub OAuth) — `.env` itself gitignored.
- [ ] Postgres running (local or hosted) with Alembic migrations set up (empty baseline migration committed).
- [ ] `llm_usage_log` table created even though nothing writes to it yet (RULES.md §1 requires this from day one).
- [ ] Auth: signup/login (email+password) + JWT issuance.
- [ ] CI running lint + tests on every push (even if there's only one test).
**Exit criteria:** a fresh clone + documented setup steps gets a logged-in user to an empty dashboard, and CI is green.

## Phase 1 — Profile Analysis MVP
**Goal:** Get a real `ProfileSnapshot` from real user input.
- [ ] Resume upload endpoint (PDF/DOCX) → parser → `profile_snapshots.resume_data`.
- [ ] GitHub OAuth connect flow → pull repo list + languages → `profile_snapshots.github_data`.
- [ ] Manual LinkedIn data import (paste/upload export) → `profile_snapshots.linkedin_data`.
- [ ] Merge logic per architecture.md §4 producing a single normalized view.
- [ ] Basic Profile Hub screen (DESIGN.md §2.8) showing the merged snapshot.
**Exit criteria:** uploading a real resume produces a structured skills/experience object that a human reviewer confirms is accurate for at least 3 test resumes of varying quality/format.

## Phase 2 — Skill Gap Engine & Roadmap
**Goal:** Turn a profile into a gap report and roadmap.
- [ ] Seed 3–5 `target_role_profiles` manually (e.g., Backend Engineer, ML Engineer, Frontend Engineer).
- [ ] Deterministic skill-matching pass + LLM depth-reasoning pass (architecture.md §5.3), merged into `gap_reports`.
- [ ] Roadmap generation (background job) producing versioned `roadmap_milestones`.
- [ ] Skill Gap Report + Roadmap View screens (DESIGN.md §2.3, §2.4).
- [ ] Eval set for gap analysis quality (RULES.md §4) — reviewed before marking this phase done.
**Exit criteria:** a student can see gaps ranked by severity with a one-sentence reason each, and a generated roadmap with at least 3 ordered milestones.

## Phase 3 — Coding Practice
**Goal:** Practice tied to identified gaps, running safely.
- [ ] Sandboxed code execution service stood up and isolated (architecture.md §5.2) — verify it cannot reach the network or host filesystem.
- [ ] Challenge generation scoped by `{gap_skill, difficulty, target_role}`.
- [ ] Adaptive difficulty logic (2 correct → up, 2 incorrect → down).
- [ ] Coding Practice screen with editor + run/submit + feedback panel (DESIGN.md §2.5).
- [ ] Completing a challenge linked to a roadmap milestone marks that milestone's action done.
**Exit criteria:** a student completes a challenge tied to a specific roadmap item and sees it marked progressed in the same session; a deliberate malicious code submission (e.g., infinite loop, filesystem access attempt) is safely contained and times out/fails cleanly.

## Phase 4 — Mock Interviews & Communication Feedback
**Goal:** Simulate interviews and give usable, specific feedback.
- [x] Interview session flow (technical + behavioral), persisted turn-by-turn.
- [x] Adaptive follow-up logic based on the running transcript.
- [x] Post-session Communication Feedback referencing specific transcript lines (PRD.md §6.5).
- [x] Open-ended natural session end (LLM closing turn that cites a real answer; deterministic fallback so ending never depends on the model).
- [x] Mock Interview + Interview Feedback screens (DESIGN.md §2.6, §2.7).
- [x] Eval set for interview coherence + feedback specificity (RULES.md §4).
- [x] **User browser verification of /mock-interview + /interview-feedback (SIGNED OFF by user, 2026-08-30).**
**Exit criteria — DONE (user signed off in-browser + security check):** a full 5+ exchange mock interview session produces a non-repetitive transcript and feedback that quotes or references at least one specific answer; user personally verified chat UI, feedback↔transcript display, and narrow-width usability, plus the non-admin 403 rejection.

## Phase 5 — Admin Console & Polish
**Goal:** Make the platform operable and presentable without a developer.
- [x] **Backend:** Admin CRUD for `target_role_profiles` (`backend/api/roles.py`) and the challenge topic bank (`backend/models/topic.py` + `backend/api/admin_topics.py`). Admin bootstrap via out-of-band `backend/seed_admin.py`.
- [x] **Backend:** Server-side role gating on all admin routes (RULES.md §2 — `require_admin`); **verified live by user**: non-admin JWT → `HTTP 403 "Admin access required"` on all `/admin/roles` + `/admin/topics` endpoints.
- [x] **Frontend:** Admin console per DESIGN.md §2.9 — sidebar nav + inline-edit tables for `target_role_profiles` and challenge topics. **User browser pass DONE** (roles inline-edit, topics inline-edit, users enable/disable, usage dashboards all confirmed working in-browser, logged in as test admin).
- [x] **Frontend:** Admin usage dashboards (signups, feature usage, LLM cost per feature — pulls from `llm_usage_log`; cost labeled "not metered yet" per P5-3).
- [x] Responsive pass across every screen (mobile + desktop, DESIGN.md §5) — student app now has shared nav (desktop sidebar + mobile bottom tabs); practice stacks prompt/editor below `lg`; headers wrap on narrow; broken `/dashboard/roadmap` CTA fixed; forgot-password themed to match auth dark. **Typecheck + production build + dev compile verified; user phone-width browser sign-off is the last item before Phase 5 closes.**
- [x] **Non-admin direct-API gating re-verified live this session** (RULES §2): fresh student JWT → HTTP 403 on all 8 admin routes (roles/topics/users/usage GETs incl. per-user usage + DELETE + POST/PUT write paths with valid body).
**Exit criteria — DONE (Phase 5 SIGNED OFF by user 2026-08-31):** (1) non-developer admin adds a brand-new target role + challenge set without touching code — verified in-browser by user (P5-4); (2) a non-admin user's direct API calls to admin endpoints are rejected — user-verified (P5-0) + live curl re-verification on all 8 admin routes this session; (3) the app is fully usable end-to-end on a phone-width screen — user phone-width + tablet browser pass confirmed Dashboard/Roadmap/Practice/Interviews/Profile + admin tablet nav (P5-6).
**Exit criteria:** a non-developer admin adds a brand-new target role and challenge set without touching code (verified in-browser by user); a non-admin user's direct API calls to admin endpoints are rejected (DONE — user verified); the app is fully usable end-to-end on a phone-width screen.

## Phase 6 — Monetization & Metering Hardening
**Goal:** Make the platform actually sellable, not just feature-complete.
- [x] Verify `llm_usage_log` has been populated correctly since Phase 0 for every feature — audit for gaps. **DONE (P6-0):** 95 rows, all 6 features logged with user_id/feature/model/tokens/date; **cost_usd had been hardcoded 0.0** — now metered.
- [x] **Implement real cost metering (Task 1):** orchestrator now computes `cost_usd` from per-model token rates (approx, P7-0). **DONE (P6-5):** 6 tests pass, suite 135 pass; live recompute shows historical rows $0.0 → would-cost $0.081993; future calls write non-zero cost.
- [x] **Credit ledger + free-tier + deduction (Task 2):** `credit_transactions` append-only ledger + `backend/services/credit.py` engine (fixed cost per feature P6-1; free allowance per new user P6-2: 1 gap + 3 challenges + 1 interview + 1 roadmap). Server-side gates on gap/analyze, challenges/generate, interviews POST /sessions, roadmap regenerate (first roadmap generate free onboarding). Free uses counted in the ledger (no client bypass); paid uses deduct; refunds on failed work; insufficient → 402. Student balance/ledger endpoints + admin grant endpoint (require_admin). **DONE (P6-7):** 12 credit tests pass, full suite 147 pass, live before/after balance deltas demo'd end-to-end with audit invariant (balance==sum of ledger deltas) MATCH.
- [ ] Free-tier limits enforced (e.g., 1 gap analysis, N practice challenges before requiring credits) — **implemented as part of Task 2 (credit gate + free allowance); needs frontend surfacing + user-facing messaging** (see note below).
- [x] **Payment integration (Task 3): Stripe Checkout + mocked E2E.** `CreditOrder` model (provenance + idempotent fulfillment) + `backend/services/payments.py` + `POST /api/credits/checkout` + `GET /api/credits/packs` + `POST /api/credits/webhook` (sig-verified, idempotent on retry). **DONE (P6-8, mechanism):** 13 payment tests pass, full suite 160 pass, all with a MOCKED Stripe client (no live keys, P6-3).
- [x] **Credit-pack pricing + free-tier LOCKED by user (P6-13 margin analysis → P6-14).** Realistic per-use costs established (challenge $0.000441; full interview session + feedback $0.006292); Starter worked-example ≈99.5% margin; pricing covers LLM spend only (infra = fixed monthly barrier). **Final: Starter 50/$5, Pro 150/$12, Career 350/$20; free tier 1 gap + 3 challenges + 1 interview + 1 roadmap.** Set in `config.py credit_packs` (comment LOCKED) + `services/credit.py FREE_ALLOWANCE`. Closes PROMPT.md's open free-tier-limits item.
- [x] **Privacy Policy + Terms of Service pages (Task 4) live and linked from signup.** `frontend/app/privacy/page.tsx` + `frontend/app/terms/page.tsx` (shared `LegalLayout`), linked from the signup card footer. Content covers AI processing, token metering, Stripe payments, free tier, security, data choices. `tsc --noEmit` clean. **DONE (P6-10).**
**Exit criteria:** a new user can sign up, use the free tier, hit a limit, purchase credits, and have the correct balance deducted on next use — verified end to end.

## Phase 7 — Evaluation & Launch Hardening
**Goal:** Prove the AI outputs are good and the system holds up before real users pay for it.
- [ ] Full eval sets reviewed for all LLM-driven features (gap analysis, roadmap, challenges, interviews, feedback).
- [ ] Cost/latency review of OpenRouter usage per feature — confirm actual cost matches the pricing model's assumptions.
- [ ] Basic load test on the sandbox execution service (concurrent submissions).
- [ ] Security review against RULES.md §2 as a checklist.
**Exit criteria:** documented eval results per feature, a cost-per-user estimate that doesn't lose money at the chosen credit price, and no unresolved item from the RULES.md §2 checklist.
