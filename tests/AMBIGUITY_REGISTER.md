# Phase 1 Ambiguity Register & Assumptions

## Technical Assumptions

### 1. Resume Parser Implementation
**Assumption:** Using regex/keyword extraction for v1 instead of LLM-enhanced parsing.
**Reason:** LLM calls cost money and add latency. Regex extraction works for standard resume formats and can be enhanced later.
**Impact:** May miss complex formatting or non-standard layouts. Acceptable for v1 MVP.
**Spec reference:** architecture.md §5.3 mentions "regex/keyword pass + LLM inference" - implemented regex only.

### 2. GitHub Token Encryption
**Assumption:** Using XOR with derived key for token encryption instead of Fernet/similar.
**Reason:** Simpler implementation for v1. Production should use proper key management (AWS KMS, etc.).
**Impact:** XOR is not cryptographically secure. Acceptable for development, must be replaced before production.
**Spec reference:** architecture.md §2 mentions "encrypted at rest" without specifying algorithm.

### 3. File Storage Backend
**Assumption:** Using local S3-compatible (MinIO) by default, configurable via environment variables.
**Reason:** Easier local development. Production will use AWS S3 or Cloudflare R2.
**Impact:** None - configuration-driven.
**Spec reference:** architecture.md §2 mentions "S3-compatible bucket (e.g., Cloudflare R2 or AWS S3)".

### 4. GitHub OAuth State Parameter
**Assumption:** State parameter is generated but not validated in the callback.
**Reason:** Simplified implementation. Production must validate state to prevent CSRF attacks.
**Impact:** Security gap - must be fixed before production.
**Spec reference:** Not explicitly mentioned in specs.

## Product Assumptions

### 5. Resume File Formats
**Assumption:** Supporting PDF, DOCX, and TXT files.
**Reason:** PDF and DOCX are most common. TXT added for testing and edge cases.
**Impact:** None - covers 99% of use cases.
**Spec reference:** PRD.md §6.6 mentions "PDF/DOCX upload".

### 6. LinkedIn Import Format
**Assumption:** Supporting JSON exports, CSV exports, and plain text paste.
**Reason:** LinkedIn offers JSON and CSV data exports. Plain text paste is fallback.
**Impact:** None - covers all official export formats.
**Spec reference:** PRD.md §6.6 mentions "manual paste/upload export".

### 7. Profile Snapshot Update Strategy
**Assumption:** Updating existing snapshot rather than creating new versions.
**Reason:** Simpler for v1. Architecture allows for versioning later.
**Impact:** Previous snapshot data is overwritten. Acceptable for v1.
**Spec reference:** architecture.md §3.3 shows single `profile_snapshots` table without versioning.

### 8. GitHub Data Caching TTL
**Assumption:** 24-hour TTL for cached GitHub data.
**Reason:** Balances freshness with API rate limit respect.
**Impact:** Data may be up to 24 hours stale. Acceptable for career platform use case.
**Spec reference:** architecture.md §7 mentions "cache repo data (24h TTL)".

## State Handling Assumptions

### 9. Conflict Resolution UI
**Assumption:** Conflicts are surfaced in UI for manual user resolution, not auto-resolved.
**Reason:** Per architecture.md §4, "surface conflicts transparently rather than resolving them silently."
**Impact:** Users must manually review conflicts. Acceptable - gives users control.
**Spec reference:** architecture.md §4 explicitly states this approach.

### 10. Merged Skills Display
**Assumption:** All skills from all sources are displayed with source and confidence labels.
**Reason:** Transparency - users can see where each skill came from.
**Impact:** May show duplicate skills with different sources (e.g., "Python (github)" and "Python (resume)").
**Spec reference:** architecture.md §4 mentions "compute the merged view as a derived field".

## Missing Specifications

### 11. Resume Parsing Quality Threshold
**Ambiguity:** No defined accuracy threshold for resume parsing.
**Resolution:** Using 3 test resumes of varying quality as manual verification.
**Action:** Add quality metrics in Phase 7 evaluation.

### 12. Profile Snapshot Schema Versioning
**Ambiguity:** No version field in `profile_snapshots` table.
**Resolution:** Using `computed_at` timestamp for freshness tracking.
**Action:** Add versioning if needed in future phases.

### 13. GitHub OAuth Scopes
**Ambiguity:** Exact GitHub OAuth scopes not specified.
**Resolution:** Requesting `repo,user` scopes (minimum needed for repo access and user info).
**Action:** Document required scopes in production deployment guide.
