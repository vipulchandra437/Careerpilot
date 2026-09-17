# PROJECT_GRAPH.md — CareerPilot dependency & architecture graph

This is the "graphified" visual map of the codebase. It mirrors the on-product
`/graphify` Journey Map (3D, 8 feature stops) in a static, greppable, Mermaid
form that lives with the source. Regenerate/extend it whenever a module, route,
or Prisma model changes (see the "keep it accurate" note at the bottom).

**This graph was rebuilt against the actual source tree (2026-09-16).** It
reflects the current schema (incl. `LoginThrottle`, `User.tokenVersion`,
Roadmap's async-generation columns), the 22 route handlers as they exist now,
the post-fix register flow (`registerApiSchema`), and the full module layer
(e.g. new `src/lib/login-throttle.ts`, `src/lib/company-type.ts`,
`src/lib/code-runner.ts`, `src/server/session-revoke.ts`).

---

## 1. Top-level architecture (Mermaid)

```mermaid
flowchart TB
    subgraph Client["Client (React / Next.js App Router)"]
        Landing["/ (Landing — Journey Map + Start/Log-in CTAs)"]
        Graphify["/graphify (Journey Map)"]
        Auth["/login · /register"]
        Dash["/dashboard/* (protected)"]
        Interview["/dashboard/interview/[id]"]
        Builder["/dashboard/builder/[id]"]
    end

    subgraph Edge["Middleware + Auth"]
        MW["middleware.ts (getToken on /dashboard/**)<br/>redirect to /login?callbackUrl=..."]
        NextAuth["Auth.js (JWT strategy, 30-day sessions)<br/>credentials + conditional Google OAuth"]
        Throttle["lib/login-throttle.ts<br/>(DB-backed lockout, 5 fails / 15 min)"]
        Revoke["server/session-revoke.ts<br/>(tokenVersion kill switch)"]
    end

    subgraph Server["Server /api routes (Route Handlers)"]
        API["22 API route files"]
    end

    subgraph Brain["lib/llm.ts — askBrain()"]
        Chain["Provider fallback chain:<br/>Groq → Gemini → OpenRouter"]
    end

    subgraph Data["Data layer"]
        Prisma["Prisma Client (server/prisma.ts singleton)"]
        Neon["Postgres on Neon (pooled + direct)"]
    end

    Landing --> Graphify
    Landing --> Auth
    Auth --> Dash
    Dash --> Interview
    Dash --> Builder

    Dash --> MW
    MW --> NextAuth
    NextAuth --> Throttle
    NextAuth --> Revoke

    API --> NextAuth
    API --> Prisma
    API --> Brain
    Prisma --> Neon
```

---

## 2. Feature flow (end-to-end walkthrough)

```mermaid
flowchart LR
    Reg["POST /api/register<br/>(registerApiSchema, bcrypt 10)"]
    Upload["POST /api/resume/upload<br/>(pdf-parse/TXT → rawText)"]
    Parse["POST /api/resume/[id]/parse<br/>(LLM → ParsedResume JSON)"]
    Analyze["POST /api/resume/[id]/analyze<br/>(LLM → AnalysisResult JSON)"]
    Target["POST /api/target (set/clear target)"]
    Interview["/api/interview + [id]/answer + finish"]
    Mentor["GET|POST /api/mentor"]
    Roadmap["/api/roadmap (GET|POST|PATCH — async worker)"]
    Practice["/api/practice/{challenge,hint,attempt}"]
    Github["POST /api/github (public GitHub API, no auth)"]
    Readiness["server/readiness-data.ts + lib/readiness.ts<br/>(deterministic 0-100 blend)"]

    Reg --> Login["authorize() → JWT"]
    Upload --> Parse --> Analyze
    Parse -. resumeId .-> Interview
    Interview --> Readiness
    Analyze --> Readiness
    Readiness -. weaknesses + score .-> Roadmap
    Readiness -. snapshot .-> Mentor
    Target --> Roadmap
    Target --> Interview
    Interview --> Mentor
    Practice --> Mentor
    Github --> Readiness
```

---

## 3. Module dependency graph (Mermaid)

```mermaid
graph LR
    subgraph Pages["src/app (pages)"]
        P_landing[page.tsx — landing = Journey Map + CTAs]
        P_graphify[graphify/page.tsx]
        P_dash[dashboard/page.tsx — server component]
        P_intv[dashboard/interview/[id]/page.tsx — client, voice]
        P_bldr[dashboard/builder/[id]/page.tsx]
        P_prog[dashboard/progress/page.tsx]
        P_mentor[dashboard/mentor/page.tsx]
        P_road[dashboard/roadmap/page.tsx]
        P_prac[dashboard/practice/page.tsx]
        P_tgt[dashboard/target/page.tsx]
        P_gh[dashboard/github/page.tsx]
        P_res[dashboard/resume/[id]/page.tsx]
        P_ivs[dashboard/interview/start/page.tsx]
    end

    subgraph Components["src/components"]
        C_jm[graphify/journey-map.tsx — Three.js scene]
        C_ud[resume-upload.tsx]
        C_rd[resume-detail.tsx]
        C_rl[resume-list.tsx]
        C_bld[builder/builder-editor.tsx + form/preview/polish/seed]
        C_ac[interview/answer-composer.tsx + voice-toggle]
        C_rh[readiness-hero.tsx + readiness-line-chart.tsx]
        C_rw[roadmap-widget.tsx]
        C_mc[mentor-chat.tsx]
        C_rv[roadmap-viewer.tsx]
        C_pw[practice-workspace.tsx]
        C_tp[target-picker.tsx + clear-target-button]
        C_ga[github-analyzer.tsx]
        UI[ui/button · card · input · label · textarea]
        Auth[auth/login-form · register-form · google-button · auth-banner · sign-out-button]
    end

    subgraph Lib["src/lib"]
        LLM[llm.ts — askBrain, provider chain]
        PROMPTS[prompts/* — one system+prompt pair per feature]
        VALIDATORS[validators/* — zod shared client/server]
        READINESS[readiness.ts — pure scoring fns]
        SPEECH[speech.ts — Web Speech wrapper]
        CODERUN[code-runner.ts — client-side Blob worker sandbox]
        COMTYPE[company-type.ts — deterministic classifier]
        THROTTLE[login-throttle.ts — lockout]
        AUTH_ERRS[auth-errors.ts — lockout sentinel]
        BSEED[builder-seed.ts — parsed → builder content]
        AUTHCFG[auth.ts — authOptions]
        UTILS[utils.ts]
    end

    subgraph ServerPkg["src/server"]
        PRISMA[prisma.ts — singleton client]
        SCONTEXT[student-context.ts — read-only snapshot]
        RDATA[readiness-data.ts — derived dataset]
        GHUB[github.ts — IP cache + rate-limit handling]
        SREVOKE[session-revoke.ts — revokeAllSessions]
    end

    P_landing --> C_jm
    P_graphify --> C_jm

    P_dash --> C_ud
    P_dash --> C_rd
    P_dash --> C_rl
    P_dash --> C_rh
    P_dash --> C_rw
    P_res --> C_rd
    P_ivs --> C_ac
    P_intv --> C_ac
    P_bldr --> C_bld
    P_mentor --> C_mc
    P_road --> C_rv
    P_prac --> C_pw
    P_tgt --> C_tp
    P_gh --> C_ga

    P_dash --> PRISMA
    P_dash --> RDATA
    P_dash --> AUTHCFG

    Components --> VALIDATORS
    Components --> Auth
    Components --> UI
    Components --> SPEECH
    C_pw --> CODERUN
    C_bld --> BSEED

    API_ROUTES[src/app/api/** — 22 route files]
    API_ROUTES --> ServerPkg
    API_ROUTES --> LLM
    API_ROUTES --> VALIDATORS
    API_ROUTES --> COMTYPE

    AUTHCFG --> THROTTLE
    AUTHCFG --> AUTH_ERRS
    THROTTLE --> PRISMA
    SREVOKE --> PRISMA
    SCONTEXT --> PRISMA
    SCONTEXT --> RDATA
    RDATA --> PRISMA
    GHUB --> LLM

    LLM --> PROMPTS
    PRISMA --> Neon[(Postgres on Neon)]
```

---

## 4. Database model graph (Prisma)

```mermaid
erDiagram
    User ||--o{ Resume : owns
    User ||--o{ BuilderResume : owns
    User ||--o{ InterviewSession : owns
    User ||--o{ TargetCompany : owns
    User ||--o{ PracticeAttempt : owns
    User ||--o{ Roadmap : owns
    User ||--o{ MentorConversation : owns

    Resume ||--o{ InterviewSession : "nullable source"

    User {
        String id PK
        String email UK
        String hashedPassword "nullable"
        Int tokenVersion "revocation counter"
        DateTime createdAt
    }
    Resume {
        String id PK
        String userId FK
        String fileName
        String rawText
        Json parsedData "nullable"
        Json analysisResult "nullable"
        DateTime createdAt
        DateTime updatedAt
    }
    BuilderResume {
        String id PK
        String userId FK
        String title
        Json content
        DateTime createdAt
        DateTime updatedAt
    }
    InterviewSession {
        String id PK
        String userId FK
        String resumeId FK "nullable"
        String mode "behavioral|technical"
        String status "active|completed|abandoned"
        Json transcript
        Int finalScore "nullable"
        String summary "nullable"
        Int questionCount
        DateTime createdAt
        DateTime updatedAt
    }
    TargetCompany {
        String id PK
        String userId FK
        String companyName
        String role
        String notes "nullable"
        Boolean active "one live target per user"
        DateTime createdAt
        DateTime updatedAt
    }
    PracticeAttempt {
        String id PK
        String userId FK
        String challengeTitle
        Boolean passed
        DateTime createdAt
    }
    Roadmap {
        String id PK
        String userId FK "one row per user"
        Json content
        Json completedIdx
        String status "pending|ready|failed"
        DateTime attemptStartedAt "nullable"
        Int failedAttempts
        DateTime createdAt
        DateTime updatedAt
    }
    MentorConversation {
        String id PK
        String userId FK
        Json messages "capped at 40"
        DateTime createdAt
        DateTime updatedAt
    }
    LoginThrottle {
        String email PK "no FK — by attempted email"
        Int failedCount
        DateTime windowStart
        DateTime lockedUntil
        DateTime updatedAt
    }
```

Notes:
- No session/account tables — sessions are **stateless 30-day JWTs**. `tokenVersion`
  on `User` is the only revocation kill switch (`server/session-revoke.ts` bumps it;
  the `session` callback in `lib/auth.ts` rejects any token whose `ver` is stale).
- Every user-scoped child model is `onDelete: Cascade` from `User`. `InterviewSession`
  → `Resume` uses `onDelete: SetNull`.
- `LoginThrottle` is keyed purely by attempted email (one shared Postgres row that
  survives serverless instance splits). No relation to `User`.

---

## 5. API route inventory (22 route files)

```mermaid
flowchart TB
    subgraph Auth
        A1["POST /api/register (public)"]
        A2["GET|POST /api/auth/[...nextauth] (public)"]
        A3["GET /api/auth/providers (public, via next-auth)"]
    end
    subgraph Resume
        R1["POST /api/resume/upload"]
        R2["POST /api/resume/[id]/parse"]
        R3["POST /api/resume/[id]/analyze"]
        R4["GET|DELETE /api/resume/[id]"]
    end
    subgraph Builder
        B1["GET|POST /api/builder"]
        B2["GET|PUT|DELETE /api/builder/[id]"]
        B3["POST /api/builder/polish"]
        B4["GET /api/builder/seed"]
    end
    subgraph Interview
        I1["POST /api/interview (start)"]
        I2["GET /api/interview/[id]"]
        I3["POST /api/interview/[id]/answer"]
        I4["POST /api/interview/[id]/finish"]
    end
    subgraph Coach
        C1["GET|POST /api/mentor"]
        C2["GET|POST|PATCH /api/roadmap"]
    end
    subgraph Practice
        P1["POST /api/practice/challenge"]
        P2["POST /api/practice/hint"]
        P3["POST /api/practice/attempt"]
    end
    subgraph Target
        T1["POST /api/target (action: set | clear)"]
    end
    subgraph Github
        G1["POST /api/github"]
    end
    subgraph Health
        H1["GET /api/health (public, force-dynamic)"]
    end
```

Every route except `register`, `auth/[...nextauth]`, and `health` runs
`getServerSession(authOptions)` and returns `{ error, code }` on failure
(`UNAUTHORIZED` | `VALIDATION_ERROR` | `NOT_FOUND` | `FORBIDDEN` | `DB_ERROR` | …).

---

## 6. The Brain (lib/llm.ts fallback chain)

Three OpenAI-compatible providers; a `429` is retried once after 2s, non-429
failures advance the chain, and only keyed providers are attempted.

```mermaid
sequenceDiagram
    participant C as Client / Route
    participant B as askBrain (lib/llm.ts)
    participant Groq
    participant Gemini
    participant OR as OpenRouter (:free)

    C->>B: askBrain(prompt, system, purpose)
    B->>Groq: chat completion (openai/gpt-oss-120b)
    alt Groq succeeds
        Groq-->>B: result
    else Groq 429 / fails
        B->>Gemini: retry (gemini-3.6-flash)
        alt Gemini succeeds
            Gemini-->>B: result
        else Gemini fails
            B->>OR: emergency free (openrouter/free)
            OR-->>B: result / error
        end
    end
    B-->>C: text
```

---

## 7. Client → API flows (per component)

| Component (client) | Calls |
|---|---|
| `auth/register-form.tsx` | `POST /api/register`, then `signIn("credentials")` → `/dashboard` |
| `auth/login-form.tsx` | `signIn("credentials")` · `signIn("google")` |
| `auth/google-button.tsx` | `GET /api/auth/providers` (hide when unconfigured), `signIn("google")` |
| `dashboard/resume-upload.tsx` | `POST /api/resume/upload` |
| `dashboard/resume-detail.tsx` | `GET/POST/DELETE /api/resume/[id]`, `/parse`, `/analyze` |
| `dashboard/resume-list-item.tsx` | `DELETE /api/resume/[id]` |
| `builder/builder-editor.tsx` | `GET\|POST /api/builder`, `PUT /api/builder/[id]`, `POST /api/builder/polish` |
| `builder/seed-modal.tsx` | `GET /api/builder/seed`, `POST /api/builder { sourceResumeId }` |
| `interview/start-form.tsx` | `POST /api/interview` |
| `dashboard/interview/[id]/page.tsx` | `GET /api/interview/[id]`, `POST .../answer`, `POST .../finish` (+ `lib/speech.ts`) |
| `roadmap/roadmap-viewer.tsx` | `GET\|POST\|PATCH /api/roadmap` (polls while `pending`) |
| `mentor/mentor-chat.tsx` | `GET\|POST /api/mentor` |
| `practice/practice-workspace.tsx` | `POST /api/practice/challenge` · `/hint` · `/attempt` + `runCode()` (client worker) |
| `target/target-picker.tsx`, `clear-target-button.tsx` | `POST /api/target` (set / clear) |
| `github/github-analyzer.tsx` | `POST /api/github` |

---

## 8. Auth & session lifecycle (the part that keeps everyone out)

```mermaid
flowchart LR
    R["/api/register<br/>registerApiSchema<br/>bcrypt.hash 10"]
    L["/login<br/>signIn credentials — authorize()"]
    T["LoginThrottle row<br/>5 fails → lock 15 min"]
    J["JWT minted at sign-in<br/>payload: id + ver = tokenVersion"]
    M["/dashboard request"]
    MW["middleware.ts getToken<br/>(no token → /login?callbackUrl)"]
    S["session callback: read tokenVersion<br/>ver mismatch → signed-out session"]
    OK["user-scoped data / API"]

    R --> L
    L --> T
    T --> J
    M --> MW
    MW --> S
    S --> OK
    J ~. ver check .~> S
    Revoke["revokeAllSessions bumps tokenVersion"] -.> S
```

- Google OAuth is enabled **only when both `GOOGLE_CLIENT_ID` and
  `GOOGLE_CLIENT_SECRET` are set** (empty keys otherwise hard-crash `/api/auth/*`).
  Google sign-in upserts a `User` row via the `signIn` callback; credentials
  sign-in never does (authorize returns existing rows only).
- The lockout sentinel (`LOCKOUT_PREFIX`) is exported from `lib/auth-errors.ts`
  (constants-only, so the client `login-form` can import it without server code).
- The dashboard pages double-check the session server-side even though middleware
  already guards the route (defense in depth).

---

## 9. Security / platform decisions worth remembering

- **Middleware** (`src/middleware.ts`) matches `/dashboard` and `/dashboard/:path*`
  unconditionally; everything else (landing, /graphify, /login, /register) is public.
  Missing `NEXTAUTH_SECRET` denies all dashboard traffic in production.
- **LLM keys never reach the client**: `lib/llm.ts` is protected by `import
  "server-only"` (build-time failure if a client component imports it).
- **The coding-test sandbox is client-side** (`lib/code-runner.ts`): a Blob-injected
  Web Worker with a `fetch` shadow, a 5s kill via `worker.terminate()`, and no
  network. No server-side Judge0/Docker dependency (per RULES).
- **Readiness is deterministic** (`lib/readiness.ts`): resume 40% + interview 60%,
  derived in `server/readiness-data.ts`, never an LLM number.
- **Roadmap generation is a lazy GET worker** (`maxDuration = 60`, `attemptStartedAt`
  claim gate, `failedAttempts` cap of 3) because Vercel Hobby has no background jobs.
- **GitHub is a public, authless API** fetch (`server/github.ts`) with a 24h
  in-memory cache and typed `GitHubRateLimitError` → amber banner.
- **Mentor + roadmap read a deterministic snapshot** (`server/student-context.ts`),
  never mutate the student's learning data.

---

## 10. The on-product Journey Map (/graphify)

- The landing page (`src/app/page.tsx`) IS the Journey Map, with `Start free`
  (→ `/register`) and `Log in` (→ `/login`) CTAs; `/graphify` is the same component
  without CTAs (revisitable while signed in).
- 8 stops, each wired to a real dashboard route: **Roadmap**, **Resume Builder**,
  **Resume Analyzer**, **GitHub Analysis**, **Target Company**, **Coding Test**,
  **Mock Interview**, **Mentor Chat**.
- `journey-map.tsx` lazy-loads `three` in `useEffect` (out of first-load bundle,
  SSR-safe), paints graph-paper terrain + flags on canvas textures, honours
  `prefers-reduced-motion`, exposes an sr-only nav for screen readers/crawlers, and
  falls back to a flat stop list when WebGL is unavailable.
- Stop list must stay in sync with the feature flows in sections 2 and 7.

---

## Keep it accurate

- Source of truth: `prisma/schema.prisma` (models), `src/app/api/**` (routes), and
  `src/components|lib|server` (modules). Update this doc when any of those change.
- The live 3D render lives at `src/components/graphify/journey-map.tsx` (8 feature
  stops, listed in section 10). Its stop list should stay in sync with the flows.
- This graph was regenerated by reading the current source (2026-09-16), not copied
  from an earlier draft — treat every edge above as describing the tree as it is
  today.
- No external tooling is required to view the Mermaid blocks — GitHub, VS Code, and
  `mermaid-cli` all render them.