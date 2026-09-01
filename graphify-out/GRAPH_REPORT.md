# Graph Report - major project  (2026-09-01)

## Corpus Check
- 1 files · ~94,274 words
- Verdict: corpus is large enough that graph structure adds value.

## Summary
- 1376 nodes · 2994 edges · 100 communities (78 shown, 22 thin omitted)
- Extraction: 94% EXTRACTED · 6% INFERRED · 0% AMBIGUOUS · INFERRED: 186 edges (avg confidence: 0.92)
- Token cost: 0 input · 0 output

## Community Hubs (Navigation)
- Interview Engine
- Gap Analysis Engine
- LinkedIn Import Parsing
- Stripe Payments Webhook
- Frontend npm Dependencies
- Credit Ledger Service
- Auth Login Flow
- Admin Console Layout
- Project Architecture Docs
- LLM Orchestrator Core
- Judge0 Sandbox Executor
- Challenge Adaptive Difficulty
- Admin Users Credits
- File Storage Service
- Challenge API Endpoints
- TypeScript Config
- Profile API Router
- Target Role Admin CRUD
- Challenge Data Models
- Resume Parsing Regex
- Admin Auth Tests
- Health Webhook Routes
- Roadmap Milestone Service
- GitHub Data Fetching
- GitHub Cache Tests
- Roadmap API Endpoints
- Challenge Topic Admin
- Resume Text Extraction
- Graphify Skill Docs
- Challenge Generation Service
- GitHub Token Encryption
- Roadmap Eval Guards
- Resume AI Parsing
- Gap Analysis API
- GitHub OAuth Connect
- Alembic Migrations Config
- Credits Checkout Endpoints
- Profile Page UI
- Roadmap Page UI
- Admin Usage Dashboards
- Resume AI Test Suite
- Gap Report Page UI
- Resume Fixture Tests
- PDF DOCX Text Extraction
- Legal Pages UI
- Signup Page UI
- Interview Feedback UI
- Admin Credit Grant
- Landing Page UI
- In-Container Code Runner
- Mock Interview UI
- Graphify Incremental Build
- Auth Dependencies
- Auth Unit Tests
- Practice Page UI
- Resume Audit Script
- Graphify Extraction Spec
- Graphify Query Loop
- Migration 001 Initial
- Migration 002 Profile Analysis
- Migration 002 Snapshots
- Migration 003 Merge Heads
- Forgot Password UI
- Graphify Folder Watch
- Graphify MCP Export
- Graphify Cross-Repo Merge
- Graphify Whisper
- package init
- package init
- package init
- package init
- package init
- Tailwind Config
- Next CLI
- Tailwind CLI
- Community 94
- Community 95
- Community 96
- Community 97
- Phase 1 Ambiguity Assumptions
- Conflict Resolution UI

## God Nodes (most connected - your core abstractions)
1. `Base` - 51 edges
2. `User` - 50 edges
3. `deterministic_pass()` - 29 edges
4. `LLMUsageLog` - 26 edges
5. `authorize_use()` - 25 edges
6. `start_session()` - 24 edges
7. `TargetRoleProfile` - 23 edges
8. `_profile()` - 23 edges
9. `get_turns()` - 22 edges
10. `parse_resume()` - 22 edges

## Surprising Connections (you probably didn't know these)
- `GitHub Actions CI workflow (backend+frontend)` --implements--> `RULES.md — standing development rules`  [INFERRED]
  .github/workflows/ci.yml → RULES.md
- `storage_isolation_http_test()` --calls--> `get_presigned_url()`  [EXTRACTED]
  tests/security/test_http_security.py → backend/services/file_storage.py
- `test_caching()` --calls--> `get_github_data()`  [EXTRACTED]
  tests/test_github_caching_raw.py → backend/services/github.py
- `test_token_sanitization()` --calls--> `decrypt_token()`  [EXTRACTED]
  tests/test_security.py → backend/services/github.py
- `test_caching_behavior()` --calls--> `encrypt_token()`  [EXTRACTED]
  tests/test_github_caching.py → backend/services/github.py

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

## Communities (100 total, 22 thin omitted)

### Community 0 - "Interview Engine"
Cohesion: 0.05
Nodes (108): LLMResponse, answer_question(), AnswerRequest, create_feedback(), create_session(), end_interview(), AsyncSession, BaseModel (+100 more)

### Community 1 - "Gap Analysis Engine"
Cohesion: 0.05
Nodes (75): ChallengeOut, create_challenge(), GenerateRequest, list_difficulties(), AsyncSession, BaseModel, get, post (+67 more)

### Community 2 - "LinkedIn Import Parsing"
Cohesion: 0.07
Nodes (39): _build_evidence_text(), build_gap_prompt(), _default_reason(), deterministic_pass(), _empty_resource(), load_gap_prompt(), merge_passes(), _norm() (+31 more)

### Community 3 - "Stripe Payments Webhook"
Cohesion: 0.07
Nodes (41): AsyncSession, health_check(), HealthResponse, Judge0Health, _auth_headers(), _b64(), _build_payload(), check_health() (+33 more)

### Community 4 - "Frontend npm Dependencies"
Cohesion: 0.09
Nodes (51): AsyncSession, post, webhook(), create_checkout_session(), event_session_id(), fulfill_order(), get_pack(), handle_checkout_completed() (+43 more)

### Community 5 - "Credit Ledger Service"
Cohesion: 0.08
Nodes (44): connect_github_endpoint(), import_linkedin_endpoint(), import_linkedin_paste_endpoint(), AsyncSession, post, Connect GitHub account via OAuth code., Import LinkedIn data from file upload (JSON/CSV export)., Import LinkedIn data from pasted text. (+36 more)

### Community 6 - "Auth Login Flow"
Cohesion: 0.04
Nodes (45): autoprefixer, class-variance-authority, clsx, eslint, eslint-config-next, dependencies, class-variance-authority, clsx (+37 more)

### Community 7 - "Admin Console Layout"
Cohesion: 0.07
Nodes (29): do_run_migrations(), run_async_migrations(), run_migrations_online(), Orchestrator, UUID, Max output tokens per feature (cost guard). Defaults to a small cap unless a…, Temperature per feature. Skill-gap reasoning is judged/reasoned text that…, Single entry point for all LLM calls. No feature module should import… (+21 more)

### Community 8 - "Project Architecture Docs"
Cohesion: 0.07
Nodes (44): analyze(), AnalyzeRequest, GapResponse, get_report(), list_target_roles(), AsyncSession, BaseModel, get (+36 more)

### Community 9 - "LLM Orchestrator Core"
Cohesion: 0.14
Nodes (34): login(), LoginRequest, AsyncSession, BaseModel, post, refresh(), RefreshRequest, signup() (+26 more)

### Community 10 - "Judge0 Sandbox Executor"
Cohesion: 0.10
Nodes (27): AdminLayout(), navItems, AdminRolesPage(), depthOptions, RequiredSkill, TargetRole, AdminTopicsPage(), Topic (+19 more)

### Community 11 - "Challenge Adaptive Difficulty"
Cohesion: 0.19
Nodes (33): create_access_token(), authorize_use(), free_uses_so_far(), AsyncSession, Reverse the most recent ledger row for a paid feature use (rollback). Used when…, Append a ledger row AND update the user's running balance atomically. Commits…, Count free uses already consumed for a feature (from the ledger)., Gate a feature use under the free-tier + credit model. Returns the ledger row… (+25 more)

### Community 12 - "Admin Users Credits"
Cohesion: 0.12
Nodes (31): AGENTS.md — repo entry point doc, architecture.md — system architecture doc, OpenRouter orchestrator single choke point (call_llm), Skill Gap Engine (deterministic + LLM merge), llm_usage_log metering table, ProfileSnapshot merge logic, Roadmap Generator (background job), Sandboxed code execution service (+23 more)

### Community 13 - "File Storage Service"
Cohesion: 0.13
Nodes (27): apply_adaptive_result(), next_difficulty(), Validate a generated challenge and return a normalized dict, or None., Step one level in `direction` (+1 = harder, -1 = easier), clamped to the…, Return (new_difficulty, consecutive_correct, consecutive_wrong). Rules (PRD…, _validate_challenge(), _expr_test_case_challenge(), FakeProgress (+19 more)

### Community 14 - "Challenge API Endpoints"
Cohesion: 0.15
Nodes (16): Base, ChallengeAttempt, ChallengeProgress, Coding challenge models (architecture.md §3, PRD §6.3). The `Challenge` holds a…, One submission of a challenge, plus the adaptive-difficulty streak state.…, Per-(user, skill) adaptive-difficulty state (PRD §6.3). `consecutive_correct`…, CreditOrder, Credit order / purchase-fulfillment audit table (Phase 6 Task 3). Records every… (+8 more)

### Community 15 - "TypeScript Config"
Cohesion: 0.11
Nodes (23): checkout(), CheckoutRequest, list_packs(), my_balance(), my_ledger(), AsyncSession, BaseModel, get (+15 more)

### Community 16 - "Profile API Router"
Cohesion: 0.13
Nodes (24): compute_merge(), Conflict, _detect_conflicts(), _merge_skills(), Merge data from all sources. Priority: GitHub activity > resume > LinkedIn tags., Merge skills from all sources with priority: GitHub > resume > LinkedIn., Detect conflicts between data sources., Test GitHub skills have highest priority. (+16 more)

### Community 17 - "Target Role Admin CRUD"
Cohesion: 0.07
Nodes (26): compilerOptions, allowJs, esModuleInterop, incremental, isolatedModules, jsx, lib, module (+18 more)

### Community 18 - "Challenge Data Models"
Cohesion: 0.13
Nodes (20): GitHubToken, connect_github_account(), decrypt_token(), _encrypt_fernet(), exchange_code_for_token(), _fernet_key(), _fetch_user_info(), Connect a GitHub account via OAuth code. (+12 more)

### Community 19 - "Resume Parsing Regex"
Cohesion: 0.17
Nodes (19): delete_file(), _get_content_type(), get_presigned_url(), get_s3_client(), UUID, Upload a file to private S3 bucket. Returns the object key (never a direct URL)., Generate a presigned URL for authenticated access. Validates ownership., Delete a file. Validates ownership. (+11 more)

### Community 20 - "Admin Auth Tests"
Cohesion: 0.21
Nodes (21): client(), _make_user(), _override_get_db(), asyncio, fixture, Phase 5 admin tests (RULES §2, PHASE.md Phase 5, PRD §6.7). Runs against an…, The pre-existing target-role CRUD must be gated too (RULES §2)., Sanity: an admin is allowed through the same gate (not blanket-403). (+13 more)

### Community 21 - "Health Webhook Routes"
Cohesion: 0.17
Nodes (17): grant_credits(), GrantRequest, AsyncSession, BaseModel, post, Admin credit grant endpoint (Phase 6). Lets an administrator grant credits to a…, Grant (or, with negative amount, revoke) credits for a student., get_current_user() (+9 more)

### Community 22 - "Roadmap Milestone Service"
Cohesion: 0.20
Nodes (19): _get_cached_data(), Get cached GitHub data if within TTL., _mock_db(), asyncio, Build a MagicMock that mimics a ProfileSnapshot row., A mocked AsyncSession whose execute returns a result with scalar_one_or_none., Cache returns None when no snapshot exists., Cache returns None when snapshot has no github_data. (+11 more)

### Community 23 - "GitHub Data Fetching"
Cohesion: 0.22
Nodes (18): create_topic(), delete_topic(), list_topics(), _name_exists(), AsyncSession, BaseModel, delete, get (+10 more)

### Community 24 - "GitHub Cache Tests"
Cohesion: 0.15
Nodes (13): Stripe webhook receiver (Phase 6 Task 3). This endpoint has NO auth header —…, Roadmap API endpoints., get_db(), AsyncSession, _apply_lightweight_migrations(), lifespan(), Redact sensitive query-string values (OAuth auth codes, state, tokens) from…, Idempotent, non-destructive column migrations for pre-existing dev DBs. The… (+5 more)

### Community 25 - "Roadmap API Endpoints"
Cohesion: 0.14
Nodes (17): parse_resume(), Parse a resume file (PDF, DOCX, or TXT) into structured data., test_parse_resume_invalid_format(), Error boundary tests for resume parsing pipeline., Test zero-byte file upload., Test scanned/image-only PDF lacking text layer., Test corrupted/container-mismatched file., Test unsupported file format. (+9 more)

### Community 26 - "Challenge Topic Admin"
Cohesion: 0.14
Nodes (17): _cache_data(), _fetch_commit_activity(), _fetch_languages(), _fetch_repos(), get_github_data(), AsyncSession, UUID, Fetch languages for a specific repo. `repo_url` is the repo's `languages_url`… (+9 more)

### Community 27 - "Resume Text Extraction"
Cohesion: 0.21
Nodes (17): _append(), _extract_experience(), _extract_projects(), _extract_structured_data(), _fallback_experience_from_lines(), _is_bullet(), _is_description_continuation(), _looks_like_job_line() (+9 more)

### Community 28 - "Graphify Skill Docs"
Cohesion: 0.12
Nodes (17): Project CLAUDE.md, Graphify Trigger Instruction, Add URL and Watch Reference, Extra Exports Reference, Extraction Spec Reference, GitHub Clone and Cross-Repo Merge Reference, Commit Hook and CLAUDE.md Integration Reference, Native CLAUDE.md Integration (+9 more)

### Community 29 - "Challenge Generation Service"
Cohesion: 0.18
Nodes (15): _extract_text(), _log_usage(), parse_resume_with_ai(), AsyncSession, LLM-based structured resume extraction. Primary extractor for the brittle…, Persist llm_usage_log rows (Phase 6 requires this for every feature)., Parse a resume, preferring LLM extraction, falling back to regex. Returns a…, Delegates text extraction to the same helpers as the regex parser. (+7 more)

### Community 30 - "GitHub Token Encryption"
Cohesion: 0.24
Nodes (13): b64(), correct_one(), _decode(), headers(), hog_one(), http_json(), http_json_quiet(), main() (+5 more)

### Community 31 - "Roadmap Eval Guards"
Cohesion: 0.28
Nodes (12): list_users(), AsyncSession, BaseModel, get, patch, Admin user management (PRD §6.7, DESIGN §2.9). Server-side role-gated (RULES…, set_user_active(), _to_user_response() (+4 more)

### Community 32 - "Resume AI Parsing"
Cohesion: 0.22
Nodes (12): get_github_auth_url_endpoint(), get_github_data_endpoint(), get_snapshot_endpoint(), LinkedInPasteRequest, BaseModel, get, Get GitHub OAuth authorization URL., Get GitHub data for the current user. (+4 more)

### Community 33 - "Gap Analysis API"
Cohesion: 0.24
Nodes (12): PostgreSQL 16.2 Container, Container Health Checks, JSON-File Logging Rotation, Redis 7.2.4 Container, Judge0 Server Container, Persistent Data Volumes, Judge0 Worker Container, AUTHN_TOKEN Authentication (+4 more)

### Community 34 - "GitHub OAuth Connect"
Cohesion: 0.24
Nodes (9): encrypt_token(), Encrypt GitHub token at rest (Fernet authenticated encryption)., RULES.md §2 — GitHub OAuth token encryption at rest. Pins that tokens are…, test_ciphertext_differs_from_input_shape(), test_encrypt_does_not_leak_plaintext_prefix(), test_roundtrip(), test_tampered_ciphertext_rejected(), Verify GitHub tokens never appear in logs. (+1 more)

### Community 35 - "Alembic Migrations Config"
Cohesion: 0.24
Nodes (9): _extract_education(), _extract_skills(), Best-effort regex fallback for education (LLM is the primary path). Groups…, Extract skills using keyword matching., test_extract_education(), test_extract_experience(), test_extract_skills(), test_parse_resume_empty_content() (+1 more)

### Community 36 - "Credits Checkout Endpoints"
Cohesion: 0.20
Nodes (5): Conflict, pillColors, ProfileContent(), ProfileSnapshot, Skill

### Community 37 - "Profile Page UI"
Cohesion: 0.20
Nodes (7): actionIcons, GapReport, Milestone, pillColors, Roadmap, severityColors, statusColors

### Community 38 - "Roadmap Page UI"
Cohesion: 0.36
Nodes (8): FeatureUsage, AsyncSession, BaseModel, get, Admin read-only usage dashboards (PRD §6.7, DESIGN §2.9). Server-side role-…, SignupPoint, usage_summary(), UsageSummary

### Community 39 - "Admin Usage Dashboards"
Cohesion: 0.33
Nodes (3): _parse_llm_json(), Parse and normalize the LLM's JSON, tolerating markdown fences., TestParseLlmJson

### Community 40 - "Resume AI Test Suite"
Cohesion: 0.44
Nodes (3): _dummy_resp(), asyncio, TestParseResumeWithAI

### Community 41 - "Gap Report Page UI"
Cohesion: 0.22
Nodes (6): Gap, GapReport, pillColors, resourceIcons, severityIcons, TargetRole

### Community 42 - "Resume Fixture Tests"
Cohesion: 0.25
Nodes (9): Admin Credit Grant Endpoint, authorize_use Credit Gating, Credit Balance (User Model Field), Append-Only Credit Transactions Ledger, Credit Metering System, Fixed Credit Per Feature, Free Tier Allowances, Pricing Mechanism Decision (+1 more)

### Community 43 - "PDF DOCX Text Extraction"
Cohesion: 0.28
Nodes (9): Admin Usage Dashboards, Real Cost Metering, Deterministic Gap Engine + LLM Refinement, OpenRouter LLM Orchestrator, LLM Usage Log, Per-Feature Max Tokens Caps, Regex Parser Resilience Fallback, Regex-Based Skills Parsing (+1 more)

### Community 44 - "Legal Pages UI"
Cohesion: 0.33
Nodes (9): Resume Parser Implementation Assumption, Resume Parsing Quality Threshold Gap, Resume Fixture: Chronological, Resume Fixture: Clean, Resume Fixture: Messy, Resume Fixture: Minimal, Resume Fixture: Tabular, Phase 1 Side-by-Side Resume Parse Comparison (+1 more)

### Community 46 - "Interview Feedback UI"
Cohesion: 0.25
Nodes (8): Cost Reconciliation Against OpenRouter Invoice, Credit Pack Pricing, Fernet GitHub Token Encryption, Idempotent Webhook Fulfillment, Dev-Only JWT Fallback Encryption Key, Sensitive Query Param Redaction, Stripe Checkout Integration, Phase 7 — Evaluation & Launch Hardening

### Community 47 - "Admin Credit Grant"
Cohesion: 0.57
Nodes (6): SignupPage(), handleBlur(), handleSubmit(), validateConfirm(), validateEmail(), validatePassword()

### Community 48 - "Landing Page UI"
Cohesion: 0.29
Nodes (4): categoryColor, Feedback, FeedbackItem, Turn

### Community 49 - "In-Container Code Runner"
Cohesion: 0.29
Nodes (7): LLM-Per-Turn Interview Engine, Turn-Anchored Communication Feedback, Phase 0 — Project Setup, Phase 1 — Profile Analysis MVP, Phase 2 — Skill Gap Engine & Roadmap, Phase 3 — Coding Practice, Phase 4 — Mock Interviews & Feedback

### Community 50 - "Mock Interview UI"
Cohesion: 0.33
Nodes (3): codeTexture, features, navLinks

### Community 51 - "Graphify Incremental Build"
Cohesion: 0.33
Nodes (6): Server-Side Admin Role Gating, JWT Auth Token, is_active User Model Column, User Enable/Disable (is_active), Phase 5 — Admin Console & Polish, Phase 6 — Monetization & Metering

### Community 52 - "Auth Dependencies"
Cohesion: 0.53
Nodes (5): mock_fetch_languages(), mock_fetch_repos(), mock_fetch_user_info(), GitHub caching test with explicit API call counting., test_caching()

### Community 53 - "Auth Unit Tests"
Cohesion: 0.50
Nodes (4): main(), In-container code runner (architecture.md §5.2). This script executes INSIDE…, Run one test case under a wall-clock watchdog and return its result., _run_test()

### Community 54 - "Practice Page UI"
Cohesion: 0.40
Nodes (5): 2-Line .env Migration Switch, Judge0 Self-Hosted Deployment Kit, Config-Driven Sandbox Executor, Pre-Production Deployment Checklist, Self-Hosted Judge0 Migration

### Community 56 - "Graphify Extraction Spec"
Cohesion: 0.50
Nodes (4): URL Ingest, Post-Commit Auto-Rebuild Hook, Build Merge Replace-on-Re-Extract, Incremental Re-Extraction

### Community 57 - "Graphify Query Loop"
Cohesion: 0.67
Nodes (3): asyncio, test_login(), test_signup()

### Community 58 - "Migration 001 Initial"
Cohesion: 0.67
Nodes (4): privileged:true for isolate, Network Isolation (enable_network=false), Sandbox-Only Code Execution Rule, Sandbox Security Control

### Community 60 - "Migration 002 Snapshots"
Cohesion: 0.67
Nodes (3): Confidence Score Rubric, Node ID Formatting Rule, Extraction Subagent Prompt

### Community 61 - "Migration 003 Merge Heads"
Cohesion: 0.67
Nodes (3): Save Result Feedback Loop, Constrained Query Vocabulary Expansion, Work Memory Self-Improving Loop

## Knowledge Gaps
- **138 isolated node(s):** `Conflict`, `ProfileSnapshot`, `Skill`, `GapReport`, `Milestone` (+133 more)
  These have ≤1 connection - possible missing edges or undocumented components.
- **22 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `get_settings()` connect `Admin Console Layout` to `Interview Engine`, `Gap Analysis Engine`, `LinkedIn Import Parsing`, `Frontend npm Dependencies`, `LLM Orchestrator Core`, `Challenge API Endpoints`, `TypeScript Config`, `Challenge Data Models`, `Resume Parsing Regex`, `Challenge Generation Service`?**
  _High betweenness centrality (0.051) - this node is a cross-community bridge._
- **Why does `Base` connect `Challenge API Endpoints` to `Interview Engine`, `Gap Analysis Engine`, `Frontend npm Dependencies`, `Admin Console Layout`, `Project Architecture Docs`, `LLM Orchestrator Core`, `Challenge Adaptive Difficulty`, `TypeScript Config`, `Challenge Data Models`, `Admin Auth Tests`, `Health Webhook Routes`, `GitHub Data Fetching`, `GitHub Cache Tests`?**
  _High betweenness centrality (0.044) - this node is a cross-community bridge._
- **Why does `User` connect `Health Webhook Routes` to `Resume AI Parsing`, `Frontend npm Dependencies`, `Credit Ledger Service`, `Roadmap Page UI`, `Project Architecture Docs`, `LLM Orchestrator Core`, `Challenge Adaptive Difficulty`, `Challenge API Endpoints`, `TypeScript Config`, `Admin Auth Tests`, `Roadmap Eval Guards`?**
  _High betweenness centrality (0.042) - this node is a cross-community bridge._
- **Are the 9 inferred relationships involving `Base` (e.g. with `lifespan()` and `main()`) actually correct?**
  _`Base` has 9 INFERRED edges - model-reasoned connections that need verification._
- **Are the 30 inferred relationships involving `User` (e.g. with `grant_credits()` and `usage_summary()`) actually correct?**
  _`User` has 30 INFERRED edges - model-reasoned connections that need verification._
- **Are the 3 inferred relationships involving `LLMUsageLog` (e.g. with `usage_summary()` and `user_usage()`) actually correct?**
  _`LLMUsageLog` has 3 INFERRED edges - model-reasoned connections that need verification._
- **Are the 2 inferred relationships involving `authorize_use()` (e.g. with `CreditTransaction` and `User`) actually correct?**
  _`authorize_use()` has 2 INFERRED edges - model-reasoned connections that need verification._