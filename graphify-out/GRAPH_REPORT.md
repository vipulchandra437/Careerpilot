# Graph Report - major project  (2026-09-01)

## Corpus Check
- 147 files · ~95,950 words
- Verdict: corpus is large enough that graph structure adds value.

## Summary
- 1383 nodes · 3008 edges · 103 communities (80 shown, 23 thin omitted)
- Extraction: 94% EXTRACTED · 6% INFERRED · 0% AMBIGUOUS · INFERRED: 187 edges (avg confidence: 0.92)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `e2200ef7`
- Run `git rev-parse HEAD` and compare to check if the graph is stale.
- Run `graphify update .` after code changes (no API cost).

## Community Hubs (Navigation)
- test_interviews.py
- Base
- deterministic_pass
- get_settings
- test_payments.py
- compute_merge
- devDependencies
- test_cost_metering.py
- TargetRoleProfile
- test_admin_users_usage.py
- auth.ts
- test_credit.py
- architecture.md — system architecture doc
- test_coding_challenges.py
- coding_challenges.py
- challenges.py
- gap_engine.py
- compilerOptions
- services/github.py
- file_storage.py
- test_admin.py
- User
- test_github_cache.py
- admin_topics.py
- main.py
- parse_resume
- get_github_data
- resume_parser.py
- Graphify Skill
- resume_ai.py
- concurrent_test.py
- admin_users.py
- api/profile.py
- Judge0 Server Container
- encrypt_token
- test_roadmap_eval.py
- profile/page.tsx
- roadmap/page.tsx
- api/gap.py
- test_resume_ai.py
- TestParseResumeWithAI
- gap-report/page.tsx
- Credit Metering System
- OpenRouter LLM Orchestrator
- Phase 1 Side-by-Side Resume Parse Comparison
- privacy/page.tsx
- Phase 7 — Evaluation & Launch Hardening
- SignupPage
- interview-feedback/page.tsx
- LLM-Per-Turn Interview Engine
- app/page.tsx
- Phase 5 — Admin Console & Polish
- generate_roadmap
- runner.py
- Self-Hosted Judge0 Migration
- mock-interview/page.tsx
- Incremental Re-Extraction
- test_auth.py
- Sandbox Security Control
- practice/page.tsx
- Extraction Subagent Prompt
- Save Result Feedback Loop
- app/layout.tsx
- ui.tsx
- next.config.js
- next-env.d.ts
- Adaptive Difficulty Logic
- Career Platform
- live_audit.py
- Folder Watch Auto-Rebuild
- MCP Server Export
- Cross-Repo Graph Merge
- Whisper Transcription
- checkout
- grant_credits
- test_resume_parser.py
- tailwind.config.js
- Phase 1 Ambiguity Register and Assumptions
- Conflict Resolution UI Principle
- GitHub OAuth State Parameter Gap
- Merged Skills Display Transparency
- GitHub Token Encryption Assumption
- Oversized Resume Fixture
- admin_usage.py
- _parse_llm_json
- CreditOrder

## God Nodes (most connected - your core abstractions)
1. `Base` - 51 edges
2. `User` - 50 edges
3. `deterministic_pass()` - 29 edges
4. `LLMUsageLog` - 26 edges
5. `authorize_use()` - 25 edges
6. `TargetRoleProfile` - 24 edges
7. `start_session()` - 24 edges
8. `_profile()` - 23 edges
9. `get_settings()` - 22 edges
10. `get_turns()` - 22 edges

## Surprising Connections (you probably didn't know these)
- `GitHub Actions CI workflow (backend+frontend)` --implements--> `RULES.md — standing development rules`  [INFERRED]
  .github/workflows/ci.yml → RULES.md
- `test_caching_behavior()` --calls--> `get_github_data()`  [EXTRACTED]
  tests/test_github_caching.py → backend/services/github.py
- `test_expired_cache()` --calls--> `get_github_data()`  [EXTRACTED]
  tests/test_github_caching.py → backend/services/github.py
- `OpenRouter orchestrator single choke point (call_llm)` --rationale_for--> `Rule: all LLM calls via orchestrator, never direct SDK`  [INFERRED]
  architecture.md → RULES.md
- `Skill gap analysis prompt, feature=gap_analysis` --conceptually_related_to--> `Skill Gap Engine (deterministic + LLM merge)`  [INFERRED]
  backend/ai/prompts/gap_analysis.txt → architecture.md

## Import Cycles
- None detected.

## Hyperedges (group relationships)
- **Graphify Reference Documentation Set** — _claude_skills_graphify_references_extraction_spec, _claude_skills_graphify_references_query, _claude_skills_graphify_references_update, _claude_skills_graphify_references_exports, _claude_skills_graphify_references_add_watch, _claude_skills_graphify_references_hooks, _claude_skills_graphify_references_transcribe, _claude_skills_graphify_references_github_and_merge [EXTRACTED 0.95]
- **Resume Parsing Test Fixture Set** — tests_fixtures_resume_clean, tests_fixtures_resume_messy, tests_fixtures_resume_minimal, tests_fixtures_resume_tabular, tests_fixtures_resume_chronological [EXTRACTED 0.95]
- **Credit Purchase Flow (Stripe Checkout → Ledger)** — memory_stripe_payments, memory_credit_packs, memory_idempotent_webhook, memory_credit_ledger, memory_credit_balance_dormant, memory_authorize_use, memory_refund_mechanism, memory_pricing_mechanism [EXTRACTED 1.00]
- **Judge0 Self-Hosted Deployment Stack** — deploy_judge0_compose_server, deploy_judge0_compose_worker, deploy_judge0_compose_db, deploy_judge0_compose_redis, deploy_judge0_compose_privileged, deploy_judge0_compose_healthcheck, deploy_judge0_compose_volumes, deploy_judge0_compose_logging, deploy_judge0_readme_authn_token, deploy_judge0_readme_vm_runbook, deploy_judge0_readme_config_switch, deploy_judge0_readme_tls_proxy [EXTRACTED 1.00]
- **OpenRouter LLM feature prompt files** — backend_ai_prompts_gap_analysis, backend_ai_prompts_roadmap, backend_ai_prompts_interview, backend_ai_prompts_interview_close, backend_ai_prompts_feedback, backend_ai_prompts_challenge_generation [EXTRACTED 1.00]
- **LLM Orchestration, Metering & Cost Pipeline** — memory_llm_orchestrator, memory_per_feature_max_tokens, memory_versioned_prompts, memory_llm_usage_log, memory_cost_metering, memory_cost_reconciliation, memory_credit_packs [EXTRACTED 1.00]
- **Core student pipeline: profile -> gap -> roadmap -> practice** — architecture_profilemerge, architecture_gap_engine, architecture_roadmap_generator, architecture_sandbox [INFERRED 0.85]

## Communities (103 total, 23 thin omitted)

### Community 0 - "test_interviews.py"
Cohesion: 0.05
Nodes (107): answer_question(), AnswerRequest, create_feedback(), create_session(), end_interview(), AsyncSession, BaseModel, get (+99 more)

### Community 1 - "Base"
Cohesion: 0.13
Nodes (25): patch, Roadmap API endpoints., Update a milestone's status and re-order the roadmap. Body: {"status":…, update_milestone(), Base, Roadmap models (architecture.md §3.5)., Roadmap, RoadmapMilestone (+17 more)

### Community 2 - "deterministic_pass"
Cohesion: 0.11
Nodes (20): _default_reason(), deterministic_pass(), _empty_resource(), merge_passes(), _phrase_in_text(), _present_skill_reason(), Word-boundary substring check for a normalized alias phrase in normalized text.…, Pure deterministic pass. Returns {skill: {matched, severity, weight}}. A… (+12 more)

### Community 3 - "get_settings"
Cohesion: 0.06
Nodes (47): do_run_migrations(), run_async_migrations(), run_migrations_online(), health_check(), HealthResponse, Judge0Health, AsyncSession, BaseModel (+39 more)

### Community 4 - "test_payments.py"
Cohesion: 0.09
Nodes (55): list_packs(), Available credit packs (PLACEHOLDER pricing — re-priced before sign-off)., AsyncSession, post, webhook(), create_checkout_session(), event_session_id(), fulfill_order() (+47 more)

### Community 5 - "compute_merge"
Cohesion: 0.06
Nodes (57): _csv_rows(), _is_keyvalue_dump(), LinkedInProfile, _parse_columnar(), _parse_csv_export(), _parse_json_export(), _parse_keyvalue_dump(), parse_linkedin_import() (+49 more)

### Community 6 - "devDependencies"
Cohesion: 0.04
Nodes (45): autoprefixer, class-variance-authority, clsx, eslint, eslint-config-next, dependencies, class-variance-authority, clsx (+37 more)

### Community 7 - "test_cost_metering.py"
Cohesion: 0.08
Nodes (23): Orchestrator, UUID, Max output tokens per feature (cost guard). Defaults to a small cap unless a…, Temperature per feature. Skill-gap reasoning is judged/reasoned text that…, Single entry point for all LLM calls. No feature module should import…, Call LLM through OpenRouter. Logs to llm_usage_log via the caller., Approximate the USD cost of a call from per-model token prices. Uses…, Default model per feature. Configurable — revisit with real usage data. (+15 more)

### Community 8 - "TargetRoleProfile"
Cohesion: 0.17
Nodes (21): create_role(), delete_role(), get_role(), list_roles(), AsyncSession, BaseModel, delete, get (+13 more)

### Community 9 - "test_admin_users_usage.py"
Cohesion: 0.14
Nodes (34): login(), LoginRequest, AsyncSession, BaseModel, post, refresh(), RefreshRequest, signup() (+26 more)

### Community 10 - "auth.ts"
Cohesion: 0.10
Nodes (27): AdminLayout(), navItems, AdminRolesPage(), depthOptions, RequiredSkill, TargetRole, AdminTopicsPage(), Topic (+19 more)

### Community 11 - "test_credit.py"
Cohesion: 0.14
Nodes (40): create_access_token(), CreditTransaction, Credit ledger model (Phase 6, PROMPT.md hybrid pricing). `credit_transactions`…, authorize_use(), free_uses_so_far(), get_balance(), InsufficientCredits, AsyncSession (+32 more)

### Community 12 - "architecture.md — system architecture doc"
Cohesion: 0.12
Nodes (31): AGENTS.md — repo entry point doc, architecture.md — system architecture doc, OpenRouter orchestrator single choke point (call_llm), Skill Gap Engine (deterministic + LLM merge), llm_usage_log metering table, ProfileSnapshot merge logic, Roadmap Generator (background job), Sandboxed code execution service (+23 more)

### Community 13 - "test_coding_challenges.py"
Cohesion: 0.13
Nodes (27): apply_adaptive_result(), next_difficulty(), Validate a generated challenge and return a normalized dict, or None., Step one level in `direction` (+1 = harder, -1 = easier), clamped to the…, Return (new_difficulty, consecutive_correct, consecutive_wrong). Rules (PRD…, _validate_challenge(), _expr_test_case_challenge(), FakeProgress (+19 more)

### Community 14 - "coding_challenges.py"
Cohesion: 0.13
Nodes (25): LLMResponse, Challenge, ChallengeAttempt, ChallengeProgress, Coding challenge models (architecture.md §3, PRD §6.3). The `Challenge` holds a…, A practice challenge scoped to {gap_skill, difficulty, target_role}., One submission of a challenge, plus the adaptive-difficulty streak state.…, Per-(user, skill) adaptive-difficulty state (PRD §6.3). `consecutive_correct`… (+17 more)

### Community 15 - "challenges.py"
Cohesion: 0.18
Nodes (19): ChallengeOut, create_challenge(), GenerateRequest, list_difficulties(), AsyncSession, BaseModel, get, post (+11 more)

### Community 16 - "gap_engine.py"
Cohesion: 0.14
Nodes (22): GapReport, Result of a skill-gap analysis (architecture.md §3.4). Upsert semantics: one…, _build_evidence_text(), build_gap_prompt(), load_gap_prompt(), _norm(), _profile_evidence(), AsyncSession (+14 more)

### Community 17 - "compilerOptions"
Cohesion: 0.07
Nodes (26): compilerOptions, allowJs, esModuleInterop, incremental, isolatedModules, jsx, lib, module (+18 more)

### Community 18 - "services/github.py"
Cohesion: 0.13
Nodes (17): GitHubToken, connect_github_account(), _encrypt_fernet(), exchange_code_for_token(), _fernet_key(), _fetch_commit_activity(), _fetch_languages(), _fetch_user_info() (+9 more)

### Community 19 - "file_storage.py"
Cohesion: 0.13
Nodes (24): delete_file(), _get_content_type(), get_presigned_url(), get_s3_client(), UUID, Upload a file to private S3 bucket. Returns the object key (never a direct URL)., Generate a presigned URL for authenticated access. Validates ownership., Delete a file. Validates ownership. (+16 more)

### Community 20 - "test_admin.py"
Cohesion: 0.21
Nodes (21): client(), _make_user(), _override_get_db(), asyncio, fixture, Phase 5 admin tests (RULES §2, PHASE.md Phase 5, PRD §6.7). Runs against an…, The pre-existing target-role CRUD must be gated too (RULES §2)., Sanity: an admin is allowed through the same gate (not blanket-403). (+13 more)

### Community 21 - "User"
Cohesion: 0.22
Nodes (14): Admin credit grant endpoint (Phase 6). Lets an administrator grant credits to a…, Credit balance + ledger endpoints (Phase 6). Students read their own running…, get_current_user(), AsyncSession, Get current authenticated user from JWT token., require_admin(), get_db(), AsyncSession (+6 more)

### Community 22 - "test_github_cache.py"
Cohesion: 0.21
Nodes (17): _mock_db(), asyncio, Build a MagicMock that mimics a ProfileSnapshot row., A mocked AsyncSession whose execute returns a result with scalar_one_or_none., Cache returns None when no snapshot exists., Cache returns None when snapshot has no github_data., Cache returns data within the 24h TTL without re-fetching., Cache returns None when the fetched_at is older than 24h. (+9 more)

### Community 23 - "admin_topics.py"
Cohesion: 0.20
Nodes (17): create_topic(), delete_topic(), list_topics(), _name_exists(), AsyncSession, BaseModel, delete, get (+9 more)

### Community 24 - "main.py"
Cohesion: 0.17
Nodes (10): Stripe webhook receiver (Phase 6 Task 3). This endpoint has NO auth header —…, _apply_lightweight_migrations(), lifespan(), Redact sensitive query-string values (OAuth auth codes, state, tokens) from…, Idempotent, non-destructive column migrations for pre-existing dev DBs. The…, RedactSensitiveQueryParams, asyncio, test_health() (+2 more)

### Community 25 - "parse_resume"
Cohesion: 0.14
Nodes (17): parse_resume(), Parse a resume file (PDF, DOCX, or TXT) into structured data., test_parse_resume_invalid_format(), Error boundary tests for resume parsing pipeline., Test zero-byte file upload., Test scanned/image-only PDF lacking text layer., Test corrupted/container-mismatched file., Test unsupported file format. (+9 more)

### Community 26 - "get_github_data"
Cohesion: 0.20
Nodes (15): _cache_data(), _fetch_repos(), _get_cached_data(), get_github_data(), AsyncSession, UUID, Get GitHub data for a user, using cache if available., Get cached GitHub data if within TTL. (+7 more)

### Community 27 - "resume_parser.py"
Cohesion: 0.21
Nodes (17): _append(), _extract_experience(), _extract_projects(), _extract_structured_data(), _fallback_experience_from_lines(), _is_bullet(), _is_description_continuation(), _looks_like_job_line() (+9 more)

### Community 28 - "Graphify Skill"
Cohesion: 0.12
Nodes (17): Project CLAUDE.md, Graphify Trigger Instruction, Add URL and Watch Reference, Extra Exports Reference, Extraction Spec Reference, GitHub Clone and Cross-Repo Merge Reference, Commit Hook and CLAUDE.md Integration Reference, Native CLAUDE.md Integration (+9 more)

### Community 29 - "resume_ai.py"
Cohesion: 0.18
Nodes (15): _extract_text(), _log_usage(), parse_resume_with_ai(), AsyncSession, LLM-based structured resume extraction. Primary extractor for the brittle…, Persist llm_usage_log rows (Phase 6 requires this for every feature)., Parse a resume, preferring LLM extraction, falling back to regex. Returns a…, Delegates text extraction to the same helpers as the regex parser. (+7 more)

### Community 30 - "concurrent_test.py"
Cohesion: 0.24
Nodes (13): b64(), correct_one(), _decode(), headers(), hog_one(), http_json(), http_json_quiet(), main() (+5 more)

### Community 31 - "admin_users.py"
Cohesion: 0.28
Nodes (12): list_users(), AsyncSession, BaseModel, get, patch, Admin user management (PRD §6.7, DESIGN §2.9). Server-side role-gated (RULES…, set_user_active(), _to_user_response() (+4 more)

### Community 32 - "api/profile.py"
Cohesion: 0.14
Nodes (24): connect_github_endpoint(), get_github_auth_url_endpoint(), get_github_data_endpoint(), get_snapshot_endpoint(), import_linkedin_endpoint(), import_linkedin_paste_endpoint(), LinkedInPasteRequest, AsyncSession (+16 more)

### Community 33 - "Judge0 Server Container"
Cohesion: 0.24
Nodes (12): PostgreSQL 16.2 Container, Container Health Checks, JSON-File Logging Rotation, Redis 7.2.4 Container, Judge0 Server Container, Persistent Data Volumes, Judge0 Worker Container, AUTHN_TOKEN Authentication (+4 more)

### Community 34 - "encrypt_token"
Cohesion: 0.15
Nodes (16): decrypt_token(), encrypt_token(), Encrypt GitHub token at rest (Fernet authenticated encryption)., Decrypt a Fernet-encrypted GitHub token. Raises ValueError on tamper/old data…, RULES.md §2 — GitHub OAuth token encryption at rest. Pins that tokens are…, test_ciphertext_differs_from_input_shape(), test_encrypt_does_not_leak_plaintext_prefix(), test_roundtrip() (+8 more)

### Community 35 - "test_roadmap_eval.py"
Cohesion: 0.19
Nodes (15): _build_gap_summary(), _fallback_milestones(), Generate basic milestones without LLM when unavailable., Format gaps into a concise summary for the prompt., Validate milestones against gap skills, discard invalid ones., _validate_milestones(), RULES.md §4 eval set — roadmap generation deterministic guards. The full…, test_build_gap_summary_lists_all_with_severity() (+7 more)

### Community 36 - "profile/page.tsx"
Cohesion: 0.18
Nodes (5): Conflict, pillColors, ProfileContent(), ProfileSnapshot, Skill

### Community 37 - "roadmap/page.tsx"
Cohesion: 0.20
Nodes (7): actionIcons, GapReport, Milestone, pillColors, Roadmap, severityColors, statusColors

### Community 38 - "api/gap.py"
Cohesion: 0.24
Nodes (13): analyze(), AnalyzeRequest, GapResponse, get_report(), list_target_roles(), AsyncSession, BaseModel, get (+5 more)

### Community 39 - "test_resume_ai.py"
Cohesion: 0.33
Nodes (3): _parse_llm_json(), Parse and normalize the LLM's JSON, tolerating markdown fences., TestParseLlmJson

### Community 40 - "TestParseResumeWithAI"
Cohesion: 0.44
Nodes (3): _dummy_resp(), asyncio, TestParseResumeWithAI

### Community 41 - "gap-report/page.tsx"
Cohesion: 0.22
Nodes (6): Gap, GapReport, pillColors, resourceIcons, severityIcons, TargetRole

### Community 42 - "Credit Metering System"
Cohesion: 0.25
Nodes (9): Admin Credit Grant Endpoint, authorize_use Credit Gating, Credit Balance (User Model Field), Append-Only Credit Transactions Ledger, Credit Metering System, Fixed Credit Per Feature, Free Tier Allowances, Pricing Mechanism Decision (+1 more)

### Community 43 - "OpenRouter LLM Orchestrator"
Cohesion: 0.28
Nodes (9): Admin Usage Dashboards, Real Cost Metering, Deterministic Gap Engine + LLM Refinement, OpenRouter LLM Orchestrator, LLM Usage Log, Per-Feature Max Tokens Caps, Regex Parser Resilience Fallback, Regex-Based Skills Parsing (+1 more)

### Community 44 - "Phase 1 Side-by-Side Resume Parse Comparison"
Cohesion: 0.33
Nodes (9): Resume Parser Implementation Assumption, Resume Parsing Quality Threshold Gap, Resume Fixture: Chronological, Resume Fixture: Clean, Resume Fixture: Messy, Resume Fixture: Minimal, Resume Fixture: Tabular, Phase 1 Side-by-Side Resume Parse Comparison (+1 more)

### Community 46 - "Phase 7 — Evaluation & Launch Hardening"
Cohesion: 0.25
Nodes (8): Cost Reconciliation Against OpenRouter Invoice, Credit Pack Pricing, Fernet GitHub Token Encryption, Idempotent Webhook Fulfillment, Dev-Only JWT Fallback Encryption Key, Sensitive Query Param Redaction, Stripe Checkout Integration, Phase 7 — Evaluation & Launch Hardening

### Community 47 - "SignupPage"
Cohesion: 0.57
Nodes (6): SignupPage(), handleBlur(), handleSubmit(), validateConfirm(), validateEmail(), validatePassword()

### Community 48 - "interview-feedback/page.tsx"
Cohesion: 0.29
Nodes (4): categoryColor, Feedback, FeedbackItem, Turn

### Community 49 - "LLM-Per-Turn Interview Engine"
Cohesion: 0.29
Nodes (7): LLM-Per-Turn Interview Engine, Turn-Anchored Communication Feedback, Phase 0 — Project Setup, Phase 1 — Profile Analysis MVP, Phase 2 — Skill Gap Engine & Roadmap, Phase 3 — Coding Practice, Phase 4 — Mock Interviews & Feedback

### Community 50 - "app/page.tsx"
Cohesion: 0.33
Nodes (4): features, logos, navLinks, steps

### Community 51 - "Phase 5 — Admin Console & Polish"
Cohesion: 0.33
Nodes (6): Server-Side Admin Role Gating, JWT Auth Token, is_active User Model Column, User Enable/Disable (is_active), Phase 5 — Admin Console & Polish, Phase 6 — Monetization & Metering

### Community 52 - "generate_roadmap"
Cohesion: 0.21
Nodes (12): generate_roadmap(), _generate_roadmap_background(), get_roadmap(), AsyncSession, get, post, Background task to generate roadmap. `refund_feature` is the metered feature to…, Get the roadmap and milestones for a gap report. (+4 more)

### Community 53 - "runner.py"
Cohesion: 0.50
Nodes (4): main(), In-container code runner (architecture.md §5.2). This script executes INSIDE…, Run one test case under a wall-clock watchdog and return its result., _run_test()

### Community 54 - "Self-Hosted Judge0 Migration"
Cohesion: 0.40
Nodes (5): 2-Line .env Migration Switch, Judge0 Self-Hosted Deployment Kit, Config-Driven Sandbox Executor, Pre-Production Deployment Checklist, Self-Hosted Judge0 Migration

### Community 56 - "Incremental Re-Extraction"
Cohesion: 0.50
Nodes (4): URL Ingest, Post-Commit Auto-Rebuild Hook, Build Merge Replace-on-Re-Extract, Incremental Re-Extraction

### Community 57 - "test_auth.py"
Cohesion: 0.67
Nodes (3): asyncio, test_login(), test_signup()

### Community 58 - "Sandbox Security Control"
Cohesion: 0.67
Nodes (4): privileged:true for isolate, Network Isolation (enable_network=false), Sandbox-Only Code Execution Rule, Sandbox Security Control

### Community 60 - "Extraction Subagent Prompt"
Cohesion: 0.67
Nodes (3): Confidence Score Rubric, Node ID Formatting Rule, Extraction Subagent Prompt

### Community 61 - "Save Result Feedback Loop"
Cohesion: 0.67
Nodes (3): Save Result Feedback Loop, Constrained Query Vocabulary Expansion, Work Memory Self-Improving Loop

### Community 83 - "checkout"
Cohesion: 0.20
Nodes (11): checkout(), CheckoutRequest, my_balance(), my_ledger(), AsyncSession, BaseModel, get, post (+3 more)

### Community 84 - "grant_credits"
Cohesion: 0.33
Nodes (6): grant_credits(), GrantRequest, AsyncSession, BaseModel, post, Grant (or, with negative amount, revoke) credits for a student.

### Community 85 - "test_resume_parser.py"
Cohesion: 0.24
Nodes (9): _extract_education(), _extract_skills(), Best-effort regex fallback for education (LLM is the primary path). Groups…, Extract skills using keyword matching., test_extract_education(), test_extract_experience(), test_extract_skills(), test_parse_resume_empty_content() (+1 more)

### Community 100 - "admin_usage.py"
Cohesion: 0.36
Nodes (8): FeatureUsage, AsyncSession, BaseModel, get, Admin read-only usage dashboards (PRD §6.7, DESIGN §2.9). Server-side role-…, SignupPoint, usage_summary(), UsageSummary

## Knowledge Gaps
- **141 isolated node(s):** `_FakeUsage`, `_M`, `_Usage`, `Gap`, `GapReport` (+136 more)
  These have ≤1 connection - possible missing edges or undocumented components.
- **23 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `get_settings()` connect `get_settings` to `test_payments.py`, `test_cost_metering.py`, `test_admin_users_usage.py`, `coding_challenges.py`, `gap_engine.py`, `services/github.py`, `file_storage.py`, `User`, `resume_ai.py`?**
  _High betweenness centrality (0.060) - this node is a cross-community bridge._
- **Why does `User` connect `User` to `api/profile.py`, `Base`, `admin_usage.py`, `test_payments.py`, `api/gap.py`, `test_admin_users_usage.py`, `test_credit.py`, `coding_challenges.py`, `checkout`, `grant_credits`, `test_admin.py`, `admin_users.py`?**
  _High betweenness centrality (0.052) - this node is a cross-community bridge._
- **Why does `Base` connect `Base` to `test_interviews.py`, `api/profile.py`, `get_settings`, `test_payments.py`, `CreditOrder`, `TargetRoleProfile`, `test_admin_users_usage.py`, `test_credit.py`, `coding_challenges.py`, `gap_engine.py`, `services/github.py`, `test_admin.py`, `User`, `main.py`?**
  _High betweenness centrality (0.040) - this node is a cross-community bridge._
- **Are the 9 inferred relationships involving `Base` (e.g. with `lifespan()` and `main()`) actually correct?**
  _`Base` has 9 INFERRED edges - model-reasoned connections that need verification._
- **Are the 30 inferred relationships involving `User` (e.g. with `grant_credits()` and `usage_summary()`) actually correct?**
  _`User` has 30 INFERRED edges - model-reasoned connections that need verification._
- **Are the 3 inferred relationships involving `LLMUsageLog` (e.g. with `usage_summary()` and `user_usage()`) actually correct?**
  _`LLMUsageLog` has 3 INFERRED edges - model-reasoned connections that need verification._
- **Are the 2 inferred relationships involving `authorize_use()` (e.g. with `CreditTransaction` and `User`) actually correct?**
  _`authorize_use()` has 2 INFERRED edges - model-reasoned connections that need verification._