# MEMORY.md — CareerPilot Project Memory

Purpose: the durable session memory for this project. When a working session ends,
append to the Session Log and reconcile Known State here so the next session resumes
fast without re-deriving everything. Read before starting work.

## Known State

- **App is feature-complete and runs.** Phases 1–6a code is done and
  verified (tsc 0, eslint clean, `npm run build` green) — resume pipeline + analysis,
  builder + PDF export, mock interviewer (text + voice), readiness scoreboard, target
  company, GitHub analysis, coding practice sandbox, roadmap, mentor bot.
- **App is deployed to production.** Live at `https://hireready-beige.vercel.app`
  (Vercel project `hireready`). Verified in production with real cookies: register
  201, login 200, `/dashboard` and every feature page 200 (roadmap, builder, builder
  new + [id], github, practice, practice start, interview, interview start, mentor,
  progress, target, resume/[id] via real TXT upload). **LLM matrix passed on prod**
  (2026-09-09): resume parse + analyze, 5-question technical interview (9 turns incl.
  follow-ups + finish summary), roadmap generate (poll ~11s), mentor chat, builder
  polish, GitHub analysis (octocat), practice challenge — latencies 1.7–11s, well
  under the 60s serverless ceiling. Smoke users and rows cleaned — Neon DB left at 0 users.
- **Database is LIVE on Neon (Postgres).** The schema is `provider = "postgresql"`
  with `DATABASE_URL` (pooled) + `DIRECT_URL` (direct) both in `.env`. `prisma db push`
  succeeded against the real project and the app was verified end-to-end: `/api/health`
  → 200 (`SELECT 1`), register created a real row, login established a session,
  `/dashboard` (and all 9 feature pages) render with DB data, middleware guards work,
  target set/clear works. Smoke-test users were cleaned up (DB left at 0 users).
- **NEXTAUTH_SECRET rotated on 2026-09-09.** Old value retired; new random 44-char
  secret set in local `.env` AND Vercel production (Config type, BOM-free),
  redeployed, verified login 200 + `/dashboard` 200 + LLM roundtrip 200. All
  previously-issued session JWTs are now invalid (logout effect). Vercel `env ls`
  masks values (`eyJ2…` prefix is just Vercel's display blurb, not the value).
- **Production env vars live on Vercel** (`vercel env ls production`): DATABASE_URL,
  DIRECT_URL, NEXTAUTH_SECRET (Config type), NEXTAUTH_URL, NEXT_PUBLIC_SITE_URL,
  GROQ_API_KEY/GEMINI_API_KEY/OPENROUTER_API_KEY. **Gotcha fixed (BOM)**: Vercel env
  values written via PowerShell `Out-File` carried a UTF-8 BOM — the BOM on
  `NEXTAUTH_URL` silently broke Edge middleware auth (`getToken` looked for the
  non-secure cookie). Always add env values as clean UTF-8 without BOM, then redeploy
  and verify `/dashboard` == 200. Google OAuth keys are intentionally NOT set (empty
  locally); add them when first users arrive.
- **Git state:** only Phase 2 is committed (`3b0f7bc`). Phases 3–6b are on disk but
  uncommitted/untracked. Do NOT commit unless explicitly asked.
- `.env` is gitignored and holds real local secrets; `.env.example` is the tracked
  template. Never commit secrets.

### Deployment runbook (Phase 6b — ALL steps done)
1. ~~**Neon**: create project → pooled `DATABASE_URL` + direct `DIRECT_URL` in `.env` →
   `npx prisma db push` → verified live (auth + all feature pages 200).~~ **DONE.**
2. ~~**Vercel**: `npx vercel link` → import repo → set ALL vars from `.env.example` in ~~
   ~~the dashboard (plus `NEXT_PUBLIC_SITE_URL=https://<app>.vercel.app`) — never in repo.~~ **DONE.**
3. ~~**Prod DB**: same two URLs (prod project branch) as Vercel env, then `npx prisma db~~
   ~~push` with prod `DATABASE_URL` (CLI auto-uses `DIRECT_URL`).~~ **DONE** (shared Neon DB for now).
4. ~~**Deploy**: `npx vercel --prod`.~~ **DONE** — `https://hireready-beige.vercel.app`.
5. ~~**Smoke**: health 200 · register → login → all feature pages 200 → resume upload→
   detail 200 → cleanup.~~ **DONE on 2026-09-09.**

To redeploy after a change: `vercel --prod --yes`. Env value gotcha → see Known State.

## Session Log

- **2026-09-07** — Phase 6b (production deployment prep) implemented and verified
  (postgres schema + Neon doc, async roadmap polling, env audit, Vercel config,
  hardening). **Deployment execution deferred by owner choice — not forgotten.** See
  Known State + runbook above. Do not re-do the 6b code work; only the provisioning
  remains.

- **2026-09-09** — Live Neon DB connected and verified end-to-end (health 200, register
  persisted, login session, all feature pages 200, target set/clear). PostgreSQL schema
  activated (`provider="postgresql"` + `directUrl`), `prisma db push` applied. Also:
  client bug sweep (resume failed-status, debounce/timer leaks, clear-target busy,
  roadmap optimistic-revert, mentor optimistic-revert, resume-detail unmount race),
  graphify doc created (`MD FILES/PROJECT_GRAPH.md`), README rewritten, root scratch
  files deleted. Verified tsc 0 / eslint clean / build green.

- **2026-09-09 (later) — DEPLOYED TO PRODUCTION.** Linked Vercel project `hireready`
  (scope `haisenberg751-3565s-projects`), set clean env vars, and deployed with
  `vercel --prod` → **https://hireready-beige.vercel.app**. Debugged a production-only
  bug where `/dashboard` 307'd even with a valid session: `NEXTAUTH_SECRET` (Config)
  was fine, but `NEXTAUTH_URL` had a UTF-8 BOM (PowerShell Out-File), so NextAuth's
  `getToken` in Edge middleware derived the wrong cookie name and returned null.
  Root-caused via a temp Edge diagnostic route (manual `jose` decrypt worked; bare
  `getToken` failed; explicit `cookieName` worked → BOM). Re-set both URL vars clean
  (no BOM), redeployed, `/dashboard` → 200. Stripped all diagnostic routes and debug
  logging from `middleware.ts` + health route. Production smoke: health ok, register
  201, login 200, all 13 pages/feature routes 200 (incl. builder/new, practice,
  progress, resume/[id] after a real TXT upload), then all smoke rows deleted (0 users).
  tsc 0 / eslint clean / build green before final deploy. Initial prod status:
  pages verified, LLM not yet exercised.

- **2026-09-09 (same day) — LLM E2E PASSED ON PROD.** Ran the full LLM matrix
  against the live site with real provider calls: resume parse (Jane Doe), resume
  analyze (score 55 / ats 45), 5-question technical interview (9 turns incl.
  follow-ups + finish summary), roadmap generate (202→ready ~11s, 12 milestones),
  mentor chat, builder polish, GitHub analysis (octocat, 8 repos, 4 languages),
  practice challenge (4 tests). All latencies 1.7–11s — no 60s serverless ceiling
  hits. Smoke user deleted, DB back to 0 users. Remaining pre-launch: Google OAuth
  prod callback keys; rotate Neon/Vercel credentials if the chat was shared.

- **2026-09-09 (same day) — NEXTAUTH_SECRET ROTATED.** After the earlier chat
  exposed secrets in plaintext, the user asked to rotate everything. Executed so
  far: generated a new 44-char `NEXTAUTH_SECRET` (crypto random), updated local
  `.env` (UTF-8, no BOM) and Vercel production (Config type via
  `vercel env rm` x2 + `add --no-sensitive`), redeployed, verified login 200,
  `/dashboard` 200, LLM roundtrip 200. All prior session JWTs invalidated.
  Still owned by user: new Neon DB password (settle pooler + direct URLs from the
  console), new GROQ/GEMINI/OpenRouter keys from their dashboards, and Vercel/
  Google account password changes. Once the user supplies the new values, re-wire
  `.env` + Vercel and redeploy + verify (see Known State BOM gotcha).

- **2026-09-09 (same day) — PROD LOGIN BUG FOUND + FIXED (root cause: register
  form/API contract mismatch).** Bug report: user "registered successfully (twice,
  same email)" but login always failed with "Email or password is incorrect".
  Investigation (all verified against live prod, no secrets in chat):
  1. Production `DATABASE_URL`/`DIRECT_URL` are Secret-typed on Vercel (not
     pullable) — verified at runtime via a temporary `/api/diagcheck` + `/api/__diag`
     route instead. Prod resolves to the SAME Neon host as local `.env`
     (`ep-winter-salad-azrvjiys…/neondb`) — the Neon password rotation did NOT
     split app databases.
  2. Users table was EMPTY (0 rows) — the reporter's email never got created;
     that alone makes login return "Email or password is incorrect".
  3. `authorize()`/bcrypt unchanged and correct (`$2b$10`, `bcrypt.compare`,
     identical lowercasing in register+authorize). No regression there.
  4. Vercel logs: register/login POSTs landed with no server errors (401 on login
     is the expected "no such user" path).
  5. ROOT CAUSE: `register-form.tsx` POSTs `{name, email, password}` (no
     `confirmPassword`), but `registerSchema` (used by `/api/register`) REQUIRED
     `confirmPassword` (`z.string().min(1)`). Every real UI registration → 400
     `VALIDATION_ERROR` → account never created → login then correctly fails.
  6. FIX: split the schema — new `registerApiSchema` (name/email/password only)
     for the server route (`src/app/api/register/route.ts`), keep `registerSchema`
     with the client-side confirmPassword cross-field refine. tsc 0 / lint clean /
     build green, redeployed to prod.
  7. VERIFIED in browser (Reticle, live prod URL + dev server): `POST
     /api/register` with the exact form payload → 201; full UI register → auto
     sign-in → `/dashboard` (asserted route change); sign out; login with same
     creds → `/dashboard`; navigating to `/login` while authed bounces to
     `/dashboard`; 0 console errors. Test users deleted, DB back to 0 users.
  Gotcha to remember FOREVER: Vercel serves cached GETs on API routes even without
  explicit cache headers (`x-vercel-cache: HIT`, `max-age=0`) — use POST or a
  cache-busting query when a GET route must reflect fresh DB state.

- **Reticle wired into this project (2026-09-09).** `npx @reticlehq/server init`
  added `.reticle.json`, `.reticle/`, `RETICLE.md`, `src/app/reticle-dev.tsx`, and
  edited `next.config.mjs`/`package.json`. The verify flow above used it: lease a
  tab (`reticle_lease {action:"acquire", url}`), snapshot, `act_sequence`/`act_and_wait`
  with an `until` route assertion, then release. NOTE: `init`'s auto-started dev
  server dies quickly — start `npm run dev` yourself in the background when
  driving; do not commit the `.reticle*`/`RETICLE.md`/`reticle-dev.tsx` additions
  unless asked.
