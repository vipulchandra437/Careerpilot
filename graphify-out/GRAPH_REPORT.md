# Graph Report - major project  (2026-09-25)

## Corpus Check
- 157 files · ~90,891 words
- Verdict: corpus is large enough that graph structure adds value.
- Unclassified: 9 file(s) not represented in the graph (top: (none) 4, .example 1, .ini 1)

## Summary
- 1528 nodes · 3338 edges · 100 communities (81 shown, 19 thin omitted)
- Extraction: 93% EXTRACTED · 7% INFERRED · 0% AMBIGUOUS · INFERRED: 238 edges (avg confidence: 0.9)
- Token cost: 0 input · 0 output

## Community Hubs (Navigation)
- Interview Session API
- Judge0 Health and Executor
- Alembic Migration History
- LinkedIn Import Parsers
- Reticle Agent Instructions
- OpenRouter Orchestrator
- Roadmap API and Challenge Models
- Alembic Env and Auth Models
- Adaptive Difficulty Logic
- Profile Merge Engine
- In-Container Code Runner
- Admin Topics and Roles UI
- Admin Usage Dashboard API
- Profile Connect Endpoints
- Admin Users and Legal UI
- Admin User Management API
- Resume Regex Parser
- S3 File Storage
- Gap Engine Deterministic Pass
- Admin API Tests
- Open Product Decisions
- Roadmap Milestone Closed Loop
- GitHub API Client
- LLM Resume Extraction Pipeline
- Gap Analysis Prompt Builder
- Agent Doc Rules and Design Principles
- Gap Analyze Endpoint
- GitHub Token Encryption
- GitHub Cache Tests
- Marketing Landing Page
- Practice and Roadmap Screen Specs
- Gap Analysis Orchestration
- Challenge Generation Service
- Target Role CRUD
- Roadmap Generation Service
- TypeScript Config
- Auth Login and Refresh
- Resume Experience Extraction
- LLM Usage Metering
- Frontend Package Manifest
- Live Audit and Error Boundary Tests
- Gap and Target Role Schemas
- Interview and Feedback Prompts
- Roadmap Background Job API
- Challenge Generation Prompt
- Sandboxed Execution Architecture
- Roadmap Fallback Milestones
- Profile Snapshot Schema and Merge
- Locked Tech Stack Decisions
- Challenge Create Endpoint
- Frontend Dev Dependencies
- OAuth Exchange and HTTP Security Tests
- Dashboard Page and UI Primitives
- Profile Hub UI
- Interview Screens and Schemas
- Gap Analysis Prompt
- LLM JSON Parsing Tests
- Judge0 Docker Deployment
- Admin Layout and Login UI
- Roadmap View UI
- Resume LLM Extraction with Fallback
- Resume AI Parse Tests
- Legal Pages Layout
- Gap Report UI
- Root Layout and Reticle Dev
- Frontend Runtime Dependencies
- GitHub Caching Tests
- CI Pipeline
- Audit Report and User Schema
- Credits and Monetization
- Auth and Health Tests
- Gap Engine Eval Set
- Interview Engine Design
- Roadmap Generation Prompt
- Resume Parsing Dependencies
- Judge0 Config-Driven Executor
- Signup Form Validation
- Frontend npm Scripts
- Access Log Redaction
- Next.js Config
- Backend Python Dependencies
- Tailwind Config
- Dashboard and Onboarding Screens
- GitHub OAuth Callback Route
- GitHub OAuth Scopes
- Roadmap Background Job
- Alembic Branch Merge
- Frontend Proxy Configuration
- Auth Crypto Dependencies
- Reticle Intent Capture
- Reticle Store Registration
- Next.js Generated Types
- Data Freshness and Import Formats
- Scalability and Cost Notes

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
10. `parse_resume()` - 22 edges

## Surprising Connections (you probably didn't know these)
- `Never execute student code in the main backend process` --semantically_similar_to--> `Security Controls Verified by Existing Project Evidence`  [INFERRED] [semantically similar]
  RULES.md → PROJECT_AUDIT_REPORT.md
- `README Validation and Testing Commands` --semantically_similar_to--> `CI Backend Job (ruff + pytest)`  [INFERRED] [semantically similar]
  README.md → .github/workflows/ci.yml
- `Risk: public Judge0 remains a development dependency` --semantically_similar_to--> `Public Judge0 CE is a dev-only limitation (must self-host pre-launch)`  [INFERRED] [semantically similar]
  PROJECT_AUDIT_REPORT.md → MEMORY.md
- `Fixed: Alembic migration branch duplication (002 branches then merge)` --semantically_similar_to--> `Alembic merge resolution: single linear head 003_merge_heads, live DB stamped`  [INFERRED] [semantically similar]
  PROJECT_AUDIT_REPORT.md → MEMORY.md
- `Self-hosted Judge0 migration kit delivered (deploy/judge0)` --semantically_similar_to--> `Risk: public Judge0 remains a development dependency`  [INFERRED] [semantically similar]
  MEMORY.md → PROJECT_AUDIT_REPORT.md

## Import Cycles
- None detected.

## Hyperedges (group relationships)
- **Orchestrator Choke Point: one call_llm entry with logging, cost metering and token caps** — rules_llm_orchestrator_chokepoint, architecture_orchestrator_module, memory_llm_usage_log_decision, memory_max_tokens_caps, memory_cost_usd_metering, memory_versioned_prompt_files [EXTRACTED 1.00]
- **Sandboxed Code Execution Control (never in the API process)** — rules_sandbox_only_execution, architecture_sandbox_service, memory_judge0_selection, memory_config_driven_sandbox_client, memory_sandbox_load_test, memory_judge0_selfhosted_kit, audit_public_judge0_dev_dependency [EXTRACTED 1.00]
- **Turn-Anchored Communication Feedback Loop (transcript to specific advice to roadmap)** — prd_communication_feedback, design_interview_feedback_screen, memory_turn_anchored_feedback, memory_natural_session_end, memory_interview_closed_loop, rules_eval_feedback_anchor [EXTRACTED 1.00]
- **AI Feature Prompt Pipeline (served by the OpenAI-compatible LLM client)** — backend_ai_prompts_gap_analysis, backend_ai_prompts_roadmap, backend_ai_prompts_challenge_generation, backend_ai_prompts_interview, backend_ai_prompts_interview_close, backend_ai_prompts_feedback, backend_requirements_openai [INFERRED 0.85]
- **Reticle Verification Honesty Rules** — frontend_agents_verdict_tools, frontend_agents_honesty_unknown_not_pass, frontend_agents_honesty_no_fault_not_pass, frontend_agents_never_weaken_check, frontend_cursor_commands_reticle_do_not_weaken_assertion, frontend_cursor_commands_reticle_verdict_producing_tools [INFERRED 0.85]
- **Self-Hosted Judge0 CE Runtime Stack** — deploy_judge0_docker_compose_server, deploy_judge0_docker_compose_worker, deploy_judge0_docker_compose_db, deploy_judge0_docker_compose_redis, deploy_judge0_docker_compose_judge0_conf [EXTRACTED 1.00]
- **Phase 1 Hybrid Extraction Contract (regex skills, LLM for everything else)** — tests_phase1_side_by_side_hybrid_regex_llm_extraction, tests_ambiguity_register_regex_only_resume_parsing, tests_phase1_side_by_side_resume_clean_parsed, tests_phase1_side_by_side_resume_messy_parsed, tests_phase1_side_by_side_resume_minimal_parsed, tests_phase1_side_by_side_resume_tabular_parsed, tests_phase1_side_by_side_resume_chronological_parsed [EXTRACTED 1.00]
- **GitHub Integration v1 Shortcuts Deferred to Production** — tests_ambiguity_register_xor_token_encryption, tests_ambiguity_register_github_oauth_state_unvalidated, tests_ambiguity_register_github_oauth_scopes, tests_ambiguity_register_github_cache_ttl_24h [INFERRED 0.85]
- **Resume Format Coverage Matrix (parser robustness fixtures)** — tests_fixtures_resume_clean_clean_format_resume_fixture, tests_fixtures_resume_messy_messy_format_resume_fixture, tests_fixtures_resume_minimal_minimal_format_resume_fixture, tests_fixtures_resume_tabular_tabular_format_resume_fixture, tests_fixtures_resume_chronological_chronological_format_resume_fixture, tests_oversized_resume_oversized_upload_fixture, tests_ambiguity_register_resume_file_formats [INFERRED 0.85]

## Communities (100 total, 19 thin omitted)

### Community 0 - "Interview Session API"
Cohesion: 0.05
Nodes (106): answer_question(), AnswerRequest, create_feedback(), create_session(), end_interview(), AsyncSession, BaseModel, post (+98 more)

### Community 1 - "Judge0 Health and Executor"
Cohesion: 0.06
Nodes (47): health_check(), HealthResponse, Judge0Health, AsyncSession, BaseModel, _auth_headers(), _b64(), _build_payload() (+39 more)

### Community 2 - "Alembic Migration History"
Cohesion: 0.07
Nodes (20): alembic, create_topic(), delete_topic(), list_topics(), _name_exists(), AsyncSession, BaseModel, delete (+12 more)

### Community 3 - "LinkedIn Import Parsers"
Cohesion: 0.09
Nodes (35): _csv_rows(), _is_keyvalue_dump(), LinkedInProfile, _parse_columnar(), _parse_csv_export(), _parse_json_export(), _parse_keyvalue_dump(), parse_linkedin_import() (+27 more)

### Community 4 - "Reticle Agent Instructions"
Cohesion: 0.06
Nodes (37): Frontend Agent Instructions (Reticle block), Four Non-Optional Dev-Server Guards, verified: "no-fault" Is Not a Pass, verified: "unknown" Is Not a Pass, Never Weaken a Check to Make It Green, Defers Detail to RETICLE.md, reticle_run Escape Hatch for Unadvertised Tools, /reticle Skill Runs the Whole Loop (+29 more)

### Community 5 - "OpenRouter Orchestrator"
Cohesion: 0.08
Nodes (23): Orchestrator, UUID, Max output tokens per feature (cost guard). Defaults to a small cap unless a…, Temperature per feature. Skill-gap reasoning is judged/reasoned text that…, Single entry point for all LLM calls. No feature module should import…, Call LLM through OpenRouter. Logs to llm_usage_log via the caller., Approximate the USD cost of a call from per-model token prices. Uses…, Default model per feature. Configurable — revisit with real usage data. (+15 more)

### Community 6 - "Roadmap API and Challenge Models"
Cohesion: 0.18
Nodes (21): Roadmap API endpoints., Base, Challenge, ChallengeAttempt, ChallengeProgress, Coding challenge models (architecture.md §3, PRD §6.3). The `Challenge` holds a…, A practice challenge scoped to {gap_skill, difficulty, target_role}., One submission of a challenge, plus the adaptive-difficulty streak state.… (+13 more)

### Community 7 - "Alembic Env and Auth Models"
Cohesion: 0.13
Nodes (29): do_run_migrations(), run_async_migrations(), run_migrations_online(), hash_password(), backend_models, LLMUsageLog, client(), _override_get_db() (+21 more)

### Community 8 - "Adaptive Difficulty Logic"
Cohesion: 0.13
Nodes (27): apply_adaptive_result(), next_difficulty(), Validate a generated challenge and return a normalized dict, or None., Step one level in `direction` (+1 = harder, -1 = easier), clamped to the…, Return (new_difficulty, consecutive_correct, consecutive_wrong). Rules (PRD…, _validate_challenge(), _expr_test_case_challenge(), FakeProgress (+19 more)

### Community 9 - "Profile Merge Engine"
Cohesion: 0.12
Nodes (25): compute_merge(), Conflict, _detect_conflicts(), _merge_skills(), Merge skills from all sources with priority: GitHub > resume > LinkedIn., Return only explicit contradictions between source records. A missing mention…, Merge data from all sources. Priority: GitHub activity > resume > LinkedIn tags., Skill (+17 more)

### Community 10 - "In-Container Code Runner"
Cohesion: 0.10
Nodes (25): main(), In-container code runner (architecture.md §5.2). This script executes INSIDE…, Run one test case under a wall-clock watchdog and return its result., _run_test(), concurrent_futures, b64(), correct_one(), _decode() (+17 more)

### Community 11 - "Admin Topics and Roles UI"
Cohesion: 0.13
Nodes (20): AdminRolesPage(), depthOptions, RequiredSkill, TargetRole, AdminTopicsPage(), Topic, AdminUsagePage(), FeatureUsage (+12 more)

### Community 12 - "Admin Usage Dashboard API"
Cohesion: 0.13
Nodes (22): FeatureUsage, AsyncSession, BaseModel, Admin read-only usage dashboards (PRD §6.7, DESIGN §2.9). Server-side role-…, SignupPoint, usage_summary(), UsageSummary, Coding challenge API endpoints (PRD §6.3, DESIGN.md §2.5). Thin router only —… (+14 more)

### Community 13 - "Profile Connect Endpoints"
Cohesion: 0.14
Nodes (25): connect_github_endpoint(), get_github_auth_url_endpoint(), get_github_data_endpoint(), get_snapshot_endpoint(), import_linkedin_endpoint(), import_linkedin_paste_endpoint(), LinkedInPasteRequest, AsyncSession (+17 more)

### Community 14 - "Admin Users and Legal UI"
Cohesion: 0.11
Nodes (11): categoryColor, Feedback, FeedbackItem, Turn, domains, Turn, typeMeta, TestResult (+3 more)

### Community 15 - "Admin User Management API"
Cohesion: 0.19
Nodes (19): list_users(), AsyncSession, BaseModel, patch, Admin user management (PRD §6.7, DESIGN §2.9). Server-side role-gated (RULES…, set_user_active(), _to_user_response(), user_usage() (+11 more)

### Community 16 - "Resume Regex Parser"
Cohesion: 0.10
Nodes (21): _extract_education(), parse_resume(), Best-effort regex fallback for education (LLM is the primary path). Groups…, Parse a resume file (PDF, DOCX, or TXT) into structured data., test_extract_education(), test_extract_experience(), test_parse_resume_empty_content(), test_parse_resume_invalid_format() (+13 more)

### Community 17 - "S3 File Storage"
Cohesion: 0.16
Nodes (20): delete_file(), _get_content_type(), get_presigned_url(), get_s3_client(), UUID, Upload a file to private S3 bucket. Returns the object key (never a direct URL)., Generate a presigned URL for authenticated access. Validates ownership., Delete a file. Validates ownership. (+12 more)

### Community 18 - "Gap Engine Deterministic Pass"
Cohesion: 0.22
Nodes (8): deterministic_pass(), _empty_resource(), merge_passes(), Pure deterministic pass. Returns {skill: {matched, severity, weight}}. A…, Merge deterministic + LLM passes into the final gap list (arch §5.3)., _profile(), TestDeterministicPass, TestMergePasses

### Community 19 - "Admin API Tests"
Cohesion: 0.21
Nodes (21): client(), _make_user(), _override_get_db(), asyncio, fixture, Phase 5 admin tests (RULES §2, PHASE.md Phase 5, PRD §6.7). Runs against an…, The pre-existing target-role CRUD must be gated too (RULES §2)., Sanity: an admin is allowed through the same gate (not blanket-403). (+13 more)

### Community 20 - "Open Product Decisions"
Cohesion: 0.15
Nodes (22): Manual Conflict Resolution Surfaced in UI, Merged Skills View with Source and Confidence Labels, MinIO as Default S3-Compatible Storage Backend, Regex-Only Resume Parsing (v1 decision), Resume Upload Formats: PDF, DOCX, TXT, Resume Parsing Accuracy Threshold (Unspecified), Profile Snapshot Versioning Gap (computed_at as Freshness), Profile Snapshot Update-In-Place (No New Versions) (+14 more)

### Community 21 - "Roadmap Milestone Closed Loop"
Cohesion: 0.14
Nodes (16): get_settings(), Settings, _extract_text(), LLM-based structured resume extraction. Primary extractor for the brittle…, Delegates text extraction to the same helpers as the regex parser., _extract_text_from_docx(), _extract_text_from_pdf(), _extract_text_from_txt() (+8 more)

### Community 22 - "GitHub API Client"
Cohesion: 0.15
Nodes (20): GitHubToken, _cache_data(), connect_github_account(), _fetch_commit_activity(), _fetch_languages(), _fetch_repos(), _fetch_user_info(), get_github_data() (+12 more)

### Community 23 - "LLM Resume Extraction Pipeline"
Cohesion: 0.25
Nodes (19): RoadmapMilestone, _link_weak_topics_to_roadmap(), Closed-loop wiring (PRD §6.4): turn evolved weak topics into roadmap actions…, db(), _ended_session(), FakeChallenge, _feedback_payload(), _make_roadmap() (+11 more)

### Community 24 - "Gap Analysis Prompt Builder"
Cohesion: 0.14
Nodes (18): _build_evidence_text(), build_gap_prompt(), _default_reason(), load_gap_prompt(), _norm(), _phrase_in_text(), _present_skill_reason(), _profile_evidence() (+10 more)

### Community 25 - "Agent Doc Rules and Design Principles"
Cohesion: 0.12
Nodes (20): Claude Code Auto-Load Pointer (.claude/CLAUDE.md -> AGENTS.md), Document Precedence (PRD=what, architecture+RULES=how, security absolute), AGENTS.md - Agent Entry Point, Ground Rules for Repo Agents, Doc Read Order (MEMORY, PRD, architecture, DESIGN, RULES, PHASE, PROMPT), architecture.md - System Architecture, Accessibility Rules (never color alone, keyboard nav, WCAG AA), Design Principles (clarity, visible progress, mentor-like feedback) (+12 more)

### Community 26 - "Gap Analyze Endpoint"
Cohesion: 0.15
Nodes (19): list_difficulties(), Adapter-friendly list of supported difficulties., get_current_user(), AsyncSession, Get current authenticated user from JWT token., analyze(), AnalyzeRequest, GapResponse (+11 more)

### Community 27 - "GitHub Token Encryption"
Cohesion: 0.14
Nodes (17): backend_services, decrypt_token(), _encrypt_fernet(), encrypt_token(), _fernet_key(), Encrypt GitHub token at rest (Fernet authenticated encryption)., Decrypt a Fernet-encrypted GitHub token. Raises ValueError on tamper/old data…, RULES.md §2 — GitHub OAuth token encryption at rest. Pins that tokens are… (+9 more)

### Community 28 - "GitHub Cache Tests"
Cohesion: 0.20
Nodes (19): _get_cached_data(), Get cached GitHub data if within TTL., _mock_db(), asyncio, Build a MagicMock that mimics a ProfileSnapshot row., A mocked AsyncSession whose execute returns a result with scalar_one_or_none., Cache returns None when no snapshot exists., Cache returns None when snapshot has no github_data. (+11 more)

### Community 29 - "Marketing Landing Page"
Cohesion: 0.14
Nodes (16): features, logos, metrics, navLinks, steps, Demo(), settings, clamp() (+8 more)

### Community 30 - "Practice and Roadmap Screen Specs"
Cohesion: 0.13
Nodes (19): coding_challenges and challenge_submissions Schemas, Skill Gap Engine (deterministic pass + one LLM pass, merged), roadmaps and roadmap_milestones Schemas, 2.5 Coding Practice Screen (split view, Run vs Submit), 2.4 Roadmap View Screen, Adaptive difficulty wiring gap found and fixed (difficulty=adaptive), Skill Gap Engine calibration round (anti-fabrication, temperature 0.0), Gap engine: deterministic first, one LLM call, LLM cannot clear a hard miss (+11 more)

### Community 31 - "Gap Analysis Orchestration"
Cohesion: 0.19
Nodes (11): LLMResponse, _parse_llm_json(), AsyncSession, Run deterministic + (optional) LLM passes and upsert the GapReport., run_gap_analysis(), _upsert_report(), asyncio, TestParseLlmJson (+3 more)

### Community 32 - "Challenge Generation Service"
Cohesion: 0.17
Nodes (18): Run a submission through the sandbox and return graded results. Returns 503 if…, submit(), build_challenge_prompt(), generate_challenge(), get_challenge(), get_or_make_progress(), load_challenge_prompt(), _mark_milestone_challenge_done() (+10 more)

### Community 33 - "Target Role CRUD"
Cohesion: 0.22
Nodes (18): create_role(), delete_role(), get_role(), list_roles(), AsyncSession, BaseModel, delete, post (+10 more)

### Community 34 - "Roadmap Generation Service"
Cohesion: 0.18
Nodes (18): Roadmap, _build_gap_summary(), build_roadmap_prompt(), get_roadmap_by_id_with_milestones(), get_roadmap_with_milestones(), load_roadmap_prompt(), _parse_roadmap_json(), AsyncSession (+10 more)

### Community 35 - "TypeScript Config"
Cohesion: 0.11
Nodes (18): compilerOptions, allowJs, esModuleInterop, incremental, isolatedModules, jsx, lib, module (+10 more)

### Community 36 - "Auth Login and Refresh"
Cohesion: 0.27
Nodes (16): login(), LoginRequest, AsyncSession, BaseModel, post, refresh(), RefreshRequest, signup() (+8 more)

### Community 37 - "Resume Experience Extraction"
Cohesion: 0.21
Nodes (17): _append(), _extract_experience(), _extract_projects(), _extract_structured_data(), _fallback_experience_from_lines(), _is_bullet(), _is_description_continuation(), _looks_like_job_line() (+9 more)

### Community 38 - "LLM Usage Metering"
Cohesion: 0.13
Nodes (17): llm_usage_log Table Schema (metering), OpenRouter Orchestration Module (single call_llm entry point), Real cost metering via _estimate_cost_usd + llm_pricing rate table, LLM-via-orchestrator for resume experience/education/projects, LLM parses logged to llm_usage_log, Per-feature max_tokens caps in orchestrator.call_llm, LLM project-grouping extraction is lossy (deferred polish), Regex parser retained as resilience fallback (+9 more)

### Community 39 - "Frontend Package Manifest"
Cohesion: 0.12
Nodes (16): name, private, version, autoprefixer, class-variance-authority, eslint, eslint-config-next, postcss (+8 more)

### Community 40 - "Live Audit and Error Boundary Tests"
Cohesion: 0.17
Nodes (12): httpx, json, sys, Live audit tests against running backend., Error boundary tests for resume parsing pipeline., mock_fetch_languages(), mock_fetch_repos(), mock_fetch_user_info() (+4 more)

### Community 41 - "Gap and Target Role Schemas"
Cohesion: 0.13
Nodes (16): gap_reports Table Schema, target_role_profiles Table Schema, Fixed: admin usage query is database-neutral (EXTRACT year/month), 2.9 Admin Console (sidebar nav, inline-edit tables, light charts), Responsive Behavior (mobile bottom tabs, desktop sidebar), 2.3 Skill Gap Report Screen, Admin usage dashboards are lightweight CSS charts, no chart library, gap_reports upsert by (snapshot_id, target_role_id) (+8 more)

### Community 42 - "Interview and Feedback Prompts"
Cohesion: 0.12
Nodes (16): Communication Feedback Prompt, Topic Actionability Constraint, Conservative Scoring Rubric, PRD-Mandated Three Dimensions (Clarity/Structure/Conciseness), Turn-ID Anchoring and Verbatim Quote Rule, Weak Topic Extraction, Mock Interview Prompt, Interview Close Prompt (+8 more)

### Community 43 - "Roadmap Background Job API"
Cohesion: 0.17
Nodes (16): generate_roadmap(), _generate_roadmap_background(), get_roadmap(), AsyncSession, patch, post, Background task to generate a roadmap., Get the roadmap and milestones for a gap report. (+8 more)

### Community 44 - "Challenge Generation Prompt"
Cohesion: 0.14
Nodes (15): Challenge Generation Prompt, Mandatory Edge Case Coverage, Literal Test Case Constraint, Stdin/Stdout Challenge Contract, Python Stdlib Only Rule, Strict JSON Output Contract, Evidence Groundedness Rule (Never Fabricate), Judge0 Production Compose Stack (+7 more)

### Community 45 - "Sandboxed Execution Architecture"
Cohesion: 0.21
Nodes (14): Sandboxed Code Execution Service (separate process, hard limits), Fixed: production configuration validation in config.py, Risk: public Judge0 remains a development dependency, Sandbox client is config-driven (base URL + auth headers), GitHub token encryption migrated XOR to cryptography.Fernet, External code execution service = Judge0 CE (not local Docker), Self-hosted Judge0 migration kit delivered (deploy/judge0), Public Judge0 CE is a dev-only limitation (must self-host pre-launch) (+6 more)

### Community 46 - "Roadmap Fallback Milestones"
Cohesion: 0.24
Nodes (12): _fallback_milestones(), Generate basic milestones without LLM when unavailable., Validate milestones against gap skills, discard invalid ones., _validate_milestones(), RULES.md §4 eval set — roadmap generation deterministic guards. The full…, test_fallback_orders_critical_first(), test_validate_defaults_estimated_hours_by_severity(), test_validate_discards_missing_action_id() (+4 more)

### Community 47 - "Profile Snapshot Schema and Merge"
Cohesion: 0.21
Nodes (12): profile_snapshots Table Schema, ProfileSnapshot Merge Logic (highest-confidence signal wins, keep raw), Security Controls Verified by Existing Project Evidence, 2.8 Profile Hub Screen (conflict surfacing), GitHub language aggregation via languages_url (double-languages 404 bug fixed), RedactSensitiveQueryParams log filter for uvicorn access logs, Phase 1 - Profile Analysis MVP, 6.6 Resume, LinkedIn, GitHub and Project Analysis (+4 more)

### Community 48 - "Locked Tech Stack Decisions"
Cohesion: 0.17
Nodes (12): Locked Tech Stack (Next.js, FastAPI, Postgres, OpenRouter, S3), Fixed: startup no longer runs SQLite migration SQL on PostgreSQL, Component and Style Direction (Tailwind + shadcn/ui, Monaco), Full-codebase frontend-backend contract audit and bug fixes, Stripe/credits/payments subsystem removed as out-of-scope, Reticle browser verification NOT yet wired (no .reticle.json/SDK), Local dev DB = SQLite (create_all, no Alembic replay), Non-Goals (Out of Scope for v1) (+4 more)

### Community 49 - "Challenge Create Endpoint"
Cohesion: 0.23
Nodes (12): ChallengeOut, create_challenge(), GenerateRequest, AsyncSession, BaseModel, post, Fetch a challenge's prompt/starter (test-case answers are never exposed)., Run code in the sandbox and return results WITHOUT recording a submission. Used… (+4 more)

### Community 50 - "Frontend Dev Dependencies"
Cohesion: 0.17
Nodes (12): devDependencies, autoprefixer, eslint, eslint-config-next, postcss, @reticlehq/next, @reticlehq/react, tailwindcss (+4 more)

### Community 51 - "OAuth Exchange and HTTP Security Tests"
Cohesion: 0.20
Nodes (10): asyncio, exchange_code_for_token(), Exchange OAuth code for access token., forced_error_token_check(), Direct HTTP-level security verification., Simulate cross-user file access attempt., Search for token patterns in codebase to verify they're not logged., Force an error in GitHub OAuth and verify token doesn't appear. (+2 more)

### Community 52 - "Dashboard Page and UI Primitives"
Cohesion: 0.20
Nodes (3): badgeTones, PageHeader(), clsx

### Community 53 - "Profile Hub UI"
Cohesion: 0.18
Nodes (5): Conflict, pillColors, ProfileContent(), ProfileSnapshot, Skill

### Community 54 - "Interview Screens and Schemas"
Cohesion: 0.29
Nodes (10): interview_sessions, interview_turns, interview_feedback Schemas, 2.7 Interview Feedback Screen (transcript-linked feedback), 2.6 Mock Interview Screen (chat UI), Interview weak topics auto-dock as roadmap milestones + challenges, Natural session end = LLM closing turn + deterministic fallback closer, Communication Feedback is turn-anchored by hard validation, Phase 4 - Mock Interviews and Communication Feedback, 6.4 AI Mock Interviews (+2 more)

### Community 55 - "Gap Analysis Prompt"
Cohesion: 0.20
Nodes (10): Skill Gap Analysis Prompt, Depth vs Bare Mention, Gap Severity Scale, Domain-First-Class Questioning, Severity-Ordered Sequenced Milestones, Backend Python Dependencies, boto3 (AWS SDK), fastapi (+2 more)

### Community 56 - "LLM JSON Parsing Tests"
Cohesion: 0.29
Nodes (3): _parse_llm_json(), Parse and normalize the LLM's JSON, tolerating markdown fences., TestParseLlmJson

### Community 57 - "Judge0 Docker Deployment"
Cohesion: 0.31
Nodes (10): Postgres 16.2 Service, Healthcheck-Gated Startup Ordering, judge0.conf Read-Only Mount / env_file, Persistent Volumes (judge0-data, judge0-redis), Privileged Mode Required by isolate Sandbox, Redis 7.2.4 Service (requirepass + appendonly), judge0/judge0:1.13.1 Server Service, Judge0 Worker Service (+2 more)

### Community 58 - "Admin Layout and Login UI"
Cohesion: 0.29
Nodes (7): AdminLayout(), navItems, LoginContent(), handleSubmit(), decodeToken(), getRole(), isAdmin()

### Community 59 - "Roadmap View UI"
Cohesion: 0.20
Nodes (7): actionIcons, GapReport, Milestone, pillColors, Roadmap, severityColors, statusColors

### Community 60 - "Resume LLM Extraction with Fallback"
Cohesion: 0.25
Nodes (9): _log_usage(), parse_resume_with_ai(), AsyncSession, Persist llm_usage_log rows (Phase 6 requires this for every feature)., Parse a resume, preferring LLM extraction, falling back to regex. Returns a…, _extract_skills(), ParsedResume, Extract skills using keyword matching. (+1 more)

### Community 61 - "Resume AI Parse Tests"
Cohesion: 0.44
Nodes (3): _dummy_resp(), asyncio, TestParseResumeWithAI

### Community 63 - "Gap Report UI"
Cohesion: 0.22
Nodes (6): Gap, GapReport, pillColors, resourceIcons, severityIcons, TargetRole

### Community 64 - "Root Layout and Reticle Dev"
Cohesion: 0.25
Nodes (5): frontend_app_globals, metadata, ReticleDev(), next, @reticlehq/react

### Community 65 - "Frontend Runtime Dependencies"
Cohesion: 0.22
Nodes (9): dependencies, class-variance-authority, clsx, lucide-react, next, @radix-ui/react-slot, react, react-dom (+1 more)

### Community 66 - "GitHub Caching Tests"
Cohesion: 0.25
Nodes (7): GitHub caching verification test. Run directly: python…, Verify that a second load within TTL uses cache, not GitHub API calls., Verify that an expired cache triggers a fresh fetch (no stale data)., test_caching_behavior(), _execute_side_effect(), test_expired_cache(), unittest_mock

### Community 67 - "CI Pipeline"
Cohesion: 0.25
Nodes (8): CI Backend Job (ruff + pytest), CI Pipeline (GitHub Actions), CI Frontend Job (lint + typecheck), Frontend Type Check Step, Ruff Lint Step, README Validation and Testing Commands, Exit criteria must be demonstrated, not assumed, Deterministic logic gets real unit tests; LLM content gets spot-check review

### Community 68 - "Audit Report and User Schema"
Cohesion: 0.25
Nodes (8): users Table Schema, Audit Conclusion (green for local dev, not yet production-ready), Audit Executive Summary, Recommended Release Order, Risk: access-token refresh not wired in the frontend, Audit Verification Performed (188 tests, typecheck, 22-route build), Career Platform Project Audit Report, README Project Status Claims

### Community 69 - "Credits and Monetization"
Cohesion: 0.36
Nodes (8): Fixed: credit deductions serialized on PostgreSQL (SELECT FOR UPDATE), Fixed: Stripe fulfillment validation and concurrency protection, Credit ledger + free tier + deduction engine, Credit-pack pricing LOCKED: Starter 50/$5, Pro 150/$12, Career 350/$20, Stripe Checkout + idempotent webhook fulfillment (mocked E2E), Phase 6 - Monetization and Metering Hardening, Success Metrics (funnel, milestone completion, conversion), Pricing model: hybrid free tier plus credit packs

### Community 70 - "Auth and Health Tests"
Cohesion: 0.29
Nodes (6): asyncio, test_login(), test_signup(), asyncio, test_health(), pytest

### Community 72 - "Interview Engine Design"
Cohesion: 0.29
Nodes (7): Suggested Folder Structure, Interview engine is LLM-per-turn, no scripted question bank, Prompts stored in versioned files under backend/ai/prompts/, README Repository Structure Tree, Eval: interview follow-up enforces a concrete detail, One service module per domain; no shared utils.py for business logic, Prompts live in versioned files, never inline strings

### Community 73 - "Roadmap Generation Prompt"
Cohesion: 0.33
Nodes (7): Skill Targeting Rule, Suggested Free Resource, Roadmap Generation Prompt, Linked Action Contract (challenge/interview/resource), Linked Gap Skill Exact Match, Milestone Validation Discards, Versioned Roadmap (v1.0)

### Community 74 - "Resume Parsing Dependencies"
Cohesion: 0.33
Nodes (6): Deterministic Reason for Evidenced Skills, Merged Profile Evidence (Resume/GitHub/LinkedIn), Source Attribution Rule (Resume vs GitHub vs LinkedIn), Deepen or Apply, Not Learn From Scratch, pypdf (resume PDF parsing), python-docx (resume DOCX parsing)

### Community 75 - "Judge0 Config-Driven Executor"
Cohesion: 0.33
Nodes (6): httpx (async HTTP client), Judge0 Authn Token (X-Judge0-Token), Config-Driven Executor (backend/sandbox/executor.py Needs No Rewrite), Public Judge0 CE (ce.judge0.com), Rollback to Public Judge0 CE, Two-Line .env Migration (JUDGE0_BASE_URL + JUDGE0_AUTH_HEADERS)

### Community 76 - "Signup Form Validation"
Cohesion: 0.73
Nodes (6): SignupPage(), handleBlur(), handleSubmit(), validateConfirm(), validateEmail(), validatePassword()

### Community 77 - "Frontend npm Scripts"
Cohesion: 0.33
Nodes (6): scripts, build, dev, lint, start, typecheck

### Community 78 - "Access Log Redaction"
Cohesion: 0.50
Nodes (3): Redact sensitive query-string values (OAuth auth codes, state, tokens) from…, RedactSensitiveQueryParams, LogRecord

### Community 79 - "Next.js Config"
Cohesion: 0.40
Nodes (3): nextConfig, { withReticle }, @reticlehq/next

### Community 80 - "Backend Python Dependencies"
Cohesion: 0.50
Nodes (4): alembic (migrations), aiosqlite + asyncpg (async DB drivers), pytest + pytest-asyncio, sqlalchemy[asyncio]

### Community 82 - "Dashboard and Onboarding Screens"
Cohesion: 0.67
Nodes (3): 2.2 Dashboard Screen, Key User Flows (first-time, return visit, interview), 2.1 Onboarding Screen

### Community 84 - "GitHub OAuth Scopes"
Cohesion: 0.67
Nodes (3): GitHub OAuth Scopes: repo,user, GitHub OAuth State Parameter Generated but Not Validated, XOR Token Encryption for GitHub Credentials

## Ambiguous Edges - Review These
- `Stripe/credits/payments subsystem removed as out-of-scope` → `README Tech Stack Summary`  [AMBIGUOUS]
  MEMORY.md · relation: conceptually_related_to
- `Connection Recovery Ladder (Step 0)` → `Setup Ladder (instrument, serve, open, drive, report)`  [AMBIGUOUS]
  frontend/.cursor/commands/reticle.md · relation: conceptually_related_to

## Knowledge Gaps
- **193 isolated node(s):** `_FakeUsage`, `_M`, `_Usage`, `Gap`, `GapReport` (+188 more)
  These have ≤1 connection - possible missing edges or undocumented components. (Counts symbols only; 590 node(s) total have ≤1 connection when file, concept and rationale nodes are included.)
- **19 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **What is the exact relationship between `Stripe/credits/payments subsystem removed as out-of-scope` and `README Tech Stack Summary`?**
  _Edge tagged AMBIGUOUS (relation: conceptually_related_to) - confidence is low._
- **What is the exact relationship between `Connection Recovery Ladder (Step 0)` and `Setup Ladder (instrument, serve, open, drive, report)`?**
  _Edge tagged AMBIGUOUS (relation: conceptually_related_to) - confidence is low._
- **Why does `LLMUsageLog` connect `Alembic Env and Auth Models` to `Challenge Generation Service`, `Interview Session API`, `Roadmap Generation Service`, `Roadmap API and Challenge Models`, `Admin Usage Dashboard API`, `Admin User Management API`, `Roadmap Milestone Closed Loop`, `LLM Resume Extraction Pipeline`, `Gap Analysis Prompt Builder`, `Resume LLM Extraction with Fallback`, `Gap Analysis Orchestration`?**
  _High betweenness centrality (0.021) - this node is a cross-community bridge._
- **Why does `Base` connect `Roadmap API and Challenge Models` to `Interview Session API`, `Target Role CRUD`, `Roadmap Generation Service`, `Alembic Migration History`, `Alembic Env and Auth Models`, `Roadmap Background Job API`, `Admin Usage Dashboard API`, `Profile Connect Endpoints`, `Admin User Management API`, `Admin API Tests`, `GitHub API Client`, `LLM Resume Extraction Pipeline`?**
  _High betweenness centrality (0.020) - this node is a cross-community bridge._
- **Why does `User` connect `Admin User Management API` to `Auth Login and Refresh`, `Roadmap API and Challenge Models`, `Alembic Env and Auth Models`, `Admin Usage Dashboard API`, `Profile Connect Endpoints`, `Admin API Tests`, `Gap Analyze Endpoint`?**
  _High betweenness centrality (0.015) - this node is a cross-community bridge._
- **Are the 8 inferred relationships involving `Base` (e.g. with `lifespan()` and `main()`) actually correct?**
  _`Base` has 8 INFERRED edges - model-reasoned connections that need verification._
- **Are the 21 inferred relationships involving `User` (e.g. with `usage_summary()` and `list_users()`) actually correct?**
  _`User` has 21 INFERRED edges - model-reasoned connections that need verification._