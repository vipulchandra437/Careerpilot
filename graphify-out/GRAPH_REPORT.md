# Graph Report - major project  (2026-09-05)

## Corpus Check
- 133 files · ~83,465 words
- Verdict: corpus is large enough that graph structure adds value.

## Summary
- 1310 nodes · 2741 edges · 95 communities (59 shown, 17 thin omitted)
- Extraction: 94% EXTRACTED · 6% INFERRED · 0% AMBIGUOUS · INFERRED: 169 edges (avg confidence: 0.92)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `8451550f`
- Run `git rev-parse HEAD` and compare to check if the graph is stale.
- Run `graphify update .` after code changes (no API cost).

## Community Hubs (Navigation)
- test_interviews.py
- gap_engine.py
- coding_challenges.py
- executor.py
- test_feedback.py
- devDependencies
- LLMResponse
- api/gap.py
- test_admin_users_usage.py
- auth.ts
- compute_merge
- Career Platform
- architecture.md — system architecture doc
- test_coding_challenges.py
- Base
- compilerOptions
- user.py
- User
- services/github.py
- file_storage.py
- test_admin.py
- admin_topics.py
- services/roadmap.py
- _get_cached_data
- resume_parser.py
- get_github_data
- api/interviews.py
- challenges.py
- services/interviews.py
- main.py
- test_closed_loop.py
- concurrent_test.py
- admin_users.py
- Judge0 Server Container
- encrypt_token
- profile/page.tsx
- Career Platform Project Audit Report
- ui.tsx
- roadmap/page.tsx
- LLMUsageLog
- check_health
- RunResult
- gap-report/page.tsx
- Credit Metering System
- OpenRouter LLM Orchestrator
- Phase 1 Side-by-Side Resume Parse Comparison
- privacy/page.tsx
- Phase 7 — Evaluation & Launch Hardening
- SignupPage
- interview-feedback/page.tsx
- LLM-Per-Turn Interview Engine
- health.py
- app/page.tsx
- Phase 5 — Admin Console & Polish
- test_github_caching_raw.py
- runner.py
- Self-Hosted Judge0 Migration
- mock-interview/page.tsx
- clean_question
- test_auth.py
- Sandbox Security Control
- practice/page.tsx
- app/layout.tsx
- tailwind.config.js
- next.config.js
- next-env.d.ts
- Adaptive Difficulty Logic
- Career Platform
- live_audit.py
- update_milestone_status
- Phase 1 Ambiguity Register and Assumptions
- Conflict Resolution UI Principle
- GitHub OAuth State Parameter Gap
- Merged Skills Display Transparency
- GitHub Token Encryption Assumption
- Oversized Resume Fixture

## God Nodes (most connected - your core abstractions)
1. `Base` - 47 edges
2. `User` - 35 edges
3. `deterministic_pass()` - 29 edges
4. `LLMUsageLog` - 27 edges
5. `start_session()` - 26 edges
6. `generate_feedback()` - 25 edges
7. `TargetRoleProfile` - 24 edges
8. `get_turns()` - 24 edges
9. `RoadmapMilestone` - 23 edges
10. `_profile()` - 23 edges

## Surprising Connections (you probably didn't know these)
- `GitHub Actions CI workflow (backend+frontend)` --implements--> `RULES.md — standing development rules`  [INFERRED]
  .github/workflows/ci.yml → RULES.md
- `storage_isolation_http_test()` --calls--> `get_presigned_url()`  [EXTRACTED]
  tests/security/test_http_security.py → backend/services/file_storage.py
- `test_caching_behavior()` --calls--> `encrypt_token()`  [EXTRACTED]
  tests/test_github_caching.py → backend/services/github.py
- `test_expired_cache()` --calls--> `encrypt_token()`  [EXTRACTED]
  tests/test_github_caching.py → backend/services/github.py
- `test_token_sanitization()` --calls--> `decrypt_token()`  [EXTRACTED]
  tests/test_security.py → backend/services/github.py

## Import Cycles
- None detected.

## Hyperedges (group relationships)
- **Resume Parsing Test Fixture Set** — tests_fixtures_resume_clean, tests_fixtures_resume_messy, tests_fixtures_resume_minimal, tests_fixtures_resume_tabular, tests_fixtures_resume_chronological [EXTRACTED 0.95]
- **Credit Purchase Flow (Stripe Checkout → Ledger)** — memory_stripe_payments, memory_credit_packs, memory_idempotent_webhook, memory_credit_ledger, memory_credit_balance_dormant, memory_authorize_use, memory_refund_mechanism, memory_pricing_mechanism [EXTRACTED 1.00]
- **Judge0 Self-Hosted Deployment Stack** — deploy_judge0_compose_server, deploy_judge0_compose_worker, deploy_judge0_compose_db, deploy_judge0_compose_redis, deploy_judge0_compose_privileged, deploy_judge0_compose_healthcheck, deploy_judge0_compose_volumes, deploy_judge0_compose_logging, deploy_judge0_readme_authn_token, deploy_judge0_readme_vm_runbook, deploy_judge0_readme_config_switch, deploy_judge0_readme_tls_proxy [EXTRACTED 1.00]
- **OpenRouter LLM feature prompt files** — backend_ai_prompts_gap_analysis, backend_ai_prompts_roadmap, backend_ai_prompts_interview, backend_ai_prompts_interview_close, backend_ai_prompts_feedback, backend_ai_prompts_challenge_generation [EXTRACTED 1.00]
- **LLM Orchestration, Metering & Cost Pipeline** — memory_llm_orchestrator, memory_per_feature_max_tokens, memory_versioned_prompts, memory_llm_usage_log, memory_cost_metering, memory_cost_reconciliation, memory_credit_packs [EXTRACTED 1.00]
- **Core student pipeline: profile -> gap -> roadmap -> practice** — architecture_profilemerge, architecture_gap_engine, architecture_roadmap_generator, architecture_sandbox [INFERRED 0.85]

## Communities (95 total, 17 thin omitted)

### Community 0 - "test_interviews.py"
Cohesion: 0.18
Nodes (29): clean_closing(), conclude_session(), get_turns(), Create a session and write turn 0 = the LLM opening question., Tolerate the usual wrapper noise; None if nothing usable remains., Naturally end an interview: append a specific closing message, then close. The…, start_session(), db() (+21 more)

### Community 1 - "gap_engine.py"
Cohesion: 0.07
Nodes (37): build_gap_prompt(), _default_reason(), deterministic_pass(), _empty_resource(), load_gap_prompt(), merge_passes(), _norm(), _parse_llm_json() (+29 more)

### Community 2 - "coding_challenges.py"
Cohesion: 0.18
Nodes (17): Challenge, A practice challenge scoped to {gap_skill, difficulty, target_role}., build_challenge_prompt(), check_solution(), generate_challenge(), get_or_make_progress(), load_challenge_prompt(), _mark_milestone_challenge_done() (+9 more)

### Community 3 - "executor.py"
Cohesion: 0.14
Nodes (22): _auth_headers(), _b64(), _build_payload(), _create_batch(), _decode(), _language_id(), _map_status(), _poll_results() (+14 more)

### Community 4 - "test_feedback.py"
Cohesion: 0.12
Nodes (31): InterviewFeedback, _deterministic_feedback(), generate_feedback(), _normalize_ws(), _parse_feedback_json(), Collapse whitespace so verbatim-quote matching survives line breaks., Guaranteed verbatim excerpt of a turn (used when the LLM quote is bad)., Extract the JSON object from the LLM reply (tolerates code fences/prose). (+23 more)

### Community 5 - "devDependencies"
Cohesion: 0.04
Nodes (45): autoprefixer, class-variance-authority, clsx, eslint, eslint-config-next, dependencies, class-variance-authority, clsx (+37 more)

### Community 6 - "LLMResponse"
Cohesion: 0.06
Nodes (31): LLMResponse, Orchestrator, UUID, Max output tokens per feature (cost guard). Defaults to a small cap unless a…, Temperature per feature. Skill-gap reasoning is judged/reasoned text that…, Single entry point for all LLM calls. No feature module should import…, Call LLM through OpenRouter. Logs to llm_usage_log via the caller., Approximate the USD cost of a call from per-model token prices. Uses… (+23 more)

### Community 7 - "api/gap.py"
Cohesion: 0.17
Nodes (17): get_current_user(), AsyncSession, Get current authenticated user from JWT token., analyze(), AnalyzeRequest, GapResponse, get_report(), list_target_roles() (+9 more)

### Community 8 - "test_admin_users_usage.py"
Cohesion: 0.14
Nodes (35): login(), LoginRequest, AsyncSession, BaseModel, post, refresh(), RefreshRequest, signup() (+27 more)

### Community 9 - "auth.ts"
Cohesion: 0.10
Nodes (27): AdminLayout(), navItems, AdminRolesPage(), depthOptions, RequiredSkill, TargetRole, AdminTopicsPage(), Topic (+19 more)

### Community 10 - "compute_merge"
Cohesion: 0.06
Nodes (57): _csv_rows(), _is_keyvalue_dump(), LinkedInProfile, _parse_columnar(), _parse_csv_export(), _parse_json_export(), _parse_keyvalue_dump(), parse_linkedin_import() (+49 more)

### Community 11 - "Career Platform"
Cohesion: 0.07
Nodes (26): 1) Clone and install backend dependencies, 2) Configure environment variables, 3) Run the backend, 4) Run the frontend, Admin console, AI / services, Backend, Backend (+18 more)

### Community 12 - "architecture.md — system architecture doc"
Cohesion: 0.12
Nodes (31): AGENTS.md — repo entry point doc, architecture.md — system architecture doc, OpenRouter orchestrator single choke point (call_llm), Skill Gap Engine (deterministic + LLM merge), llm_usage_log metering table, ProfileSnapshot merge logic, Roadmap Generator (background job), Sandboxed code execution service (+23 more)

### Community 13 - "test_coding_challenges.py"
Cohesion: 0.13
Nodes (27): apply_adaptive_result(), next_difficulty(), Validate a generated challenge and return a normalized dict, or None., Step one level in `direction` (+1 = harder, -1 = easier), clamped to the…, Return (new_difficulty, consecutive_correct, consecutive_wrong). Rules (PRD…, _validate_challenge(), _expr_test_case_challenge(), FakeProgress (+19 more)

### Community 14 - "Base"
Cohesion: 0.15
Nodes (15): Roadmap API endpoints., Base, ChallengeAttempt, ChallengeProgress, Coding challenge models (architecture.md §3, PRD §6.3). The `Challenge` holds a…, One submission of a challenge, plus the adaptive-difficulty streak state.…, Per-(user, skill) adaptive-difficulty state (PRD §6.3). `consecutive_correct`…, Communication-feedback model (architecture.md §3.7, PRD §6.5). Generated post-… (+7 more)

### Community 15 - "compilerOptions"
Cohesion: 0.07
Nodes (26): compilerOptions, allowJs, esModuleInterop, incremental, isolatedModules, jsx, lib, module (+18 more)

### Community 16 - "user.py"
Cohesion: 0.27
Nodes (7): do_run_migrations(), run_async_migrations(), run_migrations_online(), UserRole, main(), Admin bootstrap: promote an existing user to the `admin` role. There is…, str

### Community 17 - "User"
Cohesion: 0.15
Nodes (27): connect_github_endpoint(), get_github_auth_url_endpoint(), get_github_data_endpoint(), get_snapshot_endpoint(), import_linkedin_endpoint(), import_linkedin_paste_endpoint(), LinkedInPasteRequest, AsyncSession (+19 more)

### Community 18 - "services/github.py"
Cohesion: 0.13
Nodes (20): GitHubToken, connect_github_account(), decrypt_token(), _encrypt_fernet(), exchange_code_for_token(), _fernet_key(), _fetch_user_info(), Connect a GitHub account via OAuth code. (+12 more)

### Community 19 - "file_storage.py"
Cohesion: 0.17
Nodes (19): delete_file(), _get_content_type(), get_presigned_url(), get_s3_client(), UUID, Upload a file to private S3 bucket. Returns the object key (never a direct URL)., Generate a presigned URL for authenticated access. Validates ownership., Delete a file. Validates ownership. (+11 more)

### Community 20 - "test_admin.py"
Cohesion: 0.21
Nodes (21): client(), _make_user(), _override_get_db(), asyncio, fixture, Phase 5 admin tests (RULES §2, PHASE.md Phase 5, PRD §6.7). Runs against an…, The pre-existing target-role CRUD must be gated too (RULES §2)., Sanity: an admin is allowed through the same gate (not blanket-403). (+13 more)

### Community 21 - "admin_topics.py"
Cohesion: 0.19
Nodes (19): create_topic(), delete_topic(), list_topics(), _name_exists(), AsyncSession, BaseModel, delete, get (+11 more)

### Community 22 - "services/roadmap.py"
Cohesion: 0.06
Nodes (63): generate_roadmap(), _generate_roadmap_background(), get_roadmap(), AsyncSession, get, post, Background task to generate a roadmap., Get the roadmap and milestones for a gap report. (+55 more)

### Community 23 - "_get_cached_data"
Cohesion: 0.20
Nodes (19): _get_cached_data(), Get cached GitHub data if within TTL., _mock_db(), asyncio, Build a MagicMock that mimics a ProfileSnapshot row., A mocked AsyncSession whose execute returns a result with scalar_one_or_none., Cache returns None when no snapshot exists., Cache returns None when snapshot has no github_data. (+11 more)

### Community 24 - "resume_parser.py"
Cohesion: 0.05
Nodes (61): _extract_text(), _log_usage(), _parse_llm_json(), parse_resume_with_ai(), AsyncSession, LLM-based structured resume extraction. Primary extractor for the brittle…, Persist llm_usage_log rows (Phase 6 requires this for every feature)., Parse a resume, preferring LLM extraction, falling back to regex. Returns a… (+53 more)

### Community 25 - "get_github_data"
Cohesion: 0.14
Nodes (17): _cache_data(), _fetch_commit_activity(), _fetch_languages(), _fetch_repos(), get_github_data(), AsyncSession, UUID, Fetch languages for a specific repo. `repo_url` is the repo's `languages_url`… (+9 more)

### Community 26 - "api/interviews.py"
Cohesion: 0.15
Nodes (24): answer_question(), AnswerRequest, create_feedback(), create_session(), end_interview(), AsyncSession, BaseModel, get (+16 more)

### Community 27 - "challenges.py"
Cohesion: 0.17
Nodes (21): ChallengeOut, create_challenge(), GenerateRequest, list_difficulties(), AsyncSession, BaseModel, get, post (+13 more)

### Community 28 - "services/interviews.py"
Cohesion: 0.19
Nodes (20): InterviewSession, InterviewTurn, Mock-interview models (architecture.md section 3.7). - InterviewSession: one…, build_transcript(), end_session(), get_feedback(), get_session(), _next_order() (+12 more)

### Community 29 - "main.py"
Cohesion: 0.21
Nodes (9): _apply_lightweight_migrations(), lifespan(), Redact sensitive query-string values (OAuth auth codes, state, tokens) from…, Idempotent, non-destructive column migrations for pre-existing dev DBs. The…, RedactSensitiveQueryParams, asyncio, test_health(), FastAPI (+1 more)

### Community 30 - "test_closed_loop.py"
Cohesion: 0.23
Nodes (20): RoadmapMilestone, _link_weak_topics_to_roadmap(), Closed-loop wiring (PRD §6.4): turn evolved weak topics into roadmap actions…, db(), _ended_session(), FakeChallenge, _feedback_payload(), _make_roadmap() (+12 more)

### Community 31 - "concurrent_test.py"
Cohesion: 0.24
Nodes (13): b64(), correct_one(), _decode(), headers(), hog_one(), http_json(), http_json_quiet(), main() (+5 more)

### Community 32 - "admin_users.py"
Cohesion: 0.28
Nodes (12): list_users(), AsyncSession, BaseModel, get, patch, Admin user management (PRD §6.7, DESIGN §2.9). Server-side role-gated (RULES…, set_user_active(), _to_user_response() (+4 more)

### Community 33 - "Judge0 Server Container"
Cohesion: 0.24
Nodes (12): PostgreSQL 16.2 Container, Container Health Checks, JSON-File Logging Rotation, Redis 7.2.4 Container, Judge0 Server Container, Persistent Data Volumes, Judge0 Worker Container, AUTHN_TOKEN Authentication (+4 more)

### Community 34 - "encrypt_token"
Cohesion: 0.24
Nodes (9): encrypt_token(), Encrypt GitHub token at rest (Fernet authenticated encryption)., RULES.md §2 — GitHub OAuth token encryption at rest. Pins that tokens are…, test_ciphertext_differs_from_input_shape(), test_encrypt_does_not_leak_plaintext_prefix(), test_roundtrip(), test_tampered_ciphertext_rejected(), Verify GitHub tokens never appear in logs. (+1 more)

### Community 35 - "profile/page.tsx"
Cohesion: 0.18
Nodes (5): Conflict, pillColors, ProfileContent(), ProfileSnapshot, Skill

### Community 36 - "Career Platform Project Audit Report"
Cohesion: 0.10
Nodes (19): Access-token refresh is not wired in the frontend, Career Platform Project Audit Report, Conclusion, Confirmed findings, Executive summary, Fixed: Admin usage query is database-neutral, Fixed: Alembic migration branch duplication, Fixed: Credit deductions are serialized on PostgreSQL (+11 more)

### Community 38 - "roadmap/page.tsx"
Cohesion: 0.20
Nodes (7): actionIcons, GapReport, Milestone, pillColors, Roadmap, severityColors, statusColors

### Community 39 - "LLMUsageLog"
Cohesion: 0.23
Nodes (12): FeatureUsage, AsyncSession, BaseModel, get, Admin read-only usage dashboards (PRD §6.7, DESIGN §2.9). Server-side role-…, SignupPoint, usage_summary(), UsageSummary (+4 more)

### Community 40 - "check_health"
Cohesion: 0.26
Nodes (11): check_health(), Probe the configured Judge0 instance and report its reachability + version.…, _make_resp(), _patch_client(), Tests for the config-driven Judge0 health check (RULES.md §4). Network-…, _Resp, test_health_hits_configured_base_url(), test_health_non_200_raises_sandbox_error() (+3 more)

### Community 42 - "gap-report/page.tsx"
Cohesion: 0.22
Nodes (6): Gap, GapReport, pillColors, resourceIcons, severityIcons, TargetRole

### Community 43 - "Credit Metering System"
Cohesion: 0.25
Nodes (9): Admin Credit Grant Endpoint, authorize_use Credit Gating, Credit Balance (User Model Field), Append-Only Credit Transactions Ledger, Credit Metering System, Fixed Credit Per Feature, Free Tier Allowances, Pricing Mechanism Decision (+1 more)

### Community 44 - "OpenRouter LLM Orchestrator"
Cohesion: 0.28
Nodes (9): Admin Usage Dashboards, Real Cost Metering, Deterministic Gap Engine + LLM Refinement, OpenRouter LLM Orchestrator, LLM Usage Log, Per-Feature Max Tokens Caps, Regex Parser Resilience Fallback, Regex-Based Skills Parsing (+1 more)

### Community 45 - "Phase 1 Side-by-Side Resume Parse Comparison"
Cohesion: 0.33
Nodes (9): Resume Parser Implementation Assumption, Resume Parsing Quality Threshold Gap, Resume Fixture: Chronological, Resume Fixture: Clean, Resume Fixture: Messy, Resume Fixture: Minimal, Resume Fixture: Tabular, Phase 1 Side-by-Side Resume Parse Comparison (+1 more)

### Community 47 - "Phase 7 — Evaluation & Launch Hardening"
Cohesion: 0.25
Nodes (8): Cost Reconciliation Against OpenRouter Invoice, Credit Pack Pricing, Fernet GitHub Token Encryption, Idempotent Webhook Fulfillment, Dev-Only JWT Fallback Encryption Key, Sensitive Query Param Redaction, Stripe Checkout Integration, Phase 7 — Evaluation & Launch Hardening

### Community 48 - "SignupPage"
Cohesion: 0.57
Nodes (6): SignupPage(), handleBlur(), handleSubmit(), validateConfirm(), validateEmail(), validatePassword()

### Community 49 - "interview-feedback/page.tsx"
Cohesion: 0.29
Nodes (4): categoryColor, Feedback, FeedbackItem, Turn

### Community 50 - "LLM-Per-Turn Interview Engine"
Cohesion: 0.29
Nodes (7): LLM-Per-Turn Interview Engine, Turn-Anchored Communication Feedback, Phase 0 — Project Setup, Phase 1 — Profile Analysis MVP, Phase 2 — Skill Gap Engine & Roadmap, Phase 3 — Coding Practice, Phase 4 — Mock Interviews & Feedback

### Community 51 - "health.py"
Cohesion: 0.43
Nodes (6): health_check(), HealthResponse, Judge0Health, AsyncSession, BaseModel, get

### Community 52 - "app/page.tsx"
Cohesion: 0.29
Nodes (5): features, logos, metrics, navLinks, steps

### Community 53 - "Phase 5 — Admin Console & Polish"
Cohesion: 0.33
Nodes (6): Server-Side Admin Role Gating, JWT Auth Token, is_active User Model Column, User Enable/Disable (is_active), Phase 5 — Admin Console & Polish, Phase 6 — Monetization & Metering

### Community 54 - "test_github_caching_raw.py"
Cohesion: 0.53
Nodes (5): mock_fetch_languages(), mock_fetch_repos(), mock_fetch_user_info(), GitHub caching test with explicit API call counting., test_caching()

### Community 55 - "runner.py"
Cohesion: 0.50
Nodes (4): main(), In-container code runner (architecture.md §5.2). This script executes INSIDE…, Run one test case under a wall-clock watchdog and return its result., _run_test()

### Community 56 - "Self-Hosted Judge0 Migration"
Cohesion: 0.40
Nodes (5): 2-Line .env Migration Switch, Judge0 Self-Hosted Deployment Kit, Config-Driven Sandbox Executor, Pre-Production Deployment Checklist, Self-Hosted Judge0 Migration

### Community 57 - "mock-interview/page.tsx"
Cohesion: 0.33
Nodes (3): domains, Turn, typeMeta

### Community 58 - "clean_question"
Cohesion: 0.50
Nodes (4): clean_question(), Strip wrapper noise the LLM may leave around the single question., test_clean_question_rejects_empty(), test_clean_question_strips_surrounding_noise()

### Community 59 - "test_auth.py"
Cohesion: 0.67
Nodes (3): asyncio, test_login(), test_signup()

### Community 60 - "Sandbox Security Control"
Cohesion: 0.67
Nodes (4): privileged:true for isolate, Network Isolation (enable_network=false), Sandbox-Only Code Execution Rule, Sandbox Security Control

### Community 87 - "update_milestone_status"
Cohesion: 0.40
Nodes (5): patch, Update a milestone's status and re-order the roadmap. Body: {"status":…, update_milestone(), Update a milestone's status and re-order the roadmap. Re-ordering logic: -…, update_milestone_status()

## Knowledge Gaps
- **160 isolated node(s):** `_FakeUsage`, `_M`, `_Usage`, `Gap`, `GapReport` (+155 more)
  These have ≤1 connection - possible missing edges or undocumented components. (Counts symbols only; 507 node(s) total have ≤1 connection when file, concept and rationale nodes are included.)
- **17 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `LLMUsageLog` connect `LLMUsageLog` to `admin_users.py`, `gap_engine.py`, `coding_challenges.py`, `test_interviews.py`, `test_feedback.py`, `test_admin_users_usage.py`, `Base`, `user.py`, `services/roadmap.py`, `resume_parser.py`, `services/interviews.py`, `test_closed_loop.py`?**
  _High betweenness centrality (0.045) - this node is a cross-community bridge._
- **Why does `get_settings()` connect `LLMResponse` to `gap_engine.py`, `coding_challenges.py`, `executor.py`, `test_admin_users_usage.py`, `Base`, `user.py`, `services/github.py`, `file_storage.py`, `services/roadmap.py`, `resume_parser.py`?**
  _High betweenness centrality (0.039) - this node is a cross-community bridge._
- **Why does `parse_resume()` connect `resume_parser.py` to `User`?**
  _High betweenness centrality (0.029) - this node is a cross-community bridge._
- **Are the 8 inferred relationships involving `Base` (e.g. with `lifespan()` and `main()`) actually correct?**
  _`Base` has 8 INFERRED edges - model-reasoned connections that need verification._
- **Are the 21 inferred relationships involving `User` (e.g. with `usage_summary()` and `list_users()`) actually correct?**
  _`User` has 21 INFERRED edges - model-reasoned connections that need verification._
- **Are the 3 inferred relationships involving `LLMUsageLog` (e.g. with `usage_summary()` and `user_usage()`) actually correct?**
  _`LLMUsageLog` has 3 INFERRED edges - model-reasoned connections that need verification._
- **What connects `_FakeUsage`, `_M`, `_Usage` to the rest of the system?**
  _160 weakly-connected nodes found - possible documentation gaps or missing edges._