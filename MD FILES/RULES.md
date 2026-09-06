# RULES.md — Coding & Process Rules for HireReady

## Scope Discipline
1. Build ONLY the current phase. No future-phase features.
2. "Ugly but working" beats "polished but unfinished."
3. Every feature ends with a working test before moving on.

## Code Rules
- TypeScript strict mode. No `any` without justification comment.
- Zod-validate ALL inputs at API boundaries.
- Comments explain WHY, not WHAT.
- One file = one responsibility.
- All LLM prompts live in src/lib/prompts/ — never inline in route handlers.
- All LLM calls go through lib/llm.ts (askBrain). No direct fetches to providers elsewhere.
- Never log API keys or raw user resume content in production logs.

## Error Handling
- Every API route returns structured errors: { error: string, code?: string }
- LLM failures: user sees a friendly message, never a stack trace
- Rate limit hit: "Daily AI limit reached, try again tomorrow" — never crash

## When Stuck (the debugging ritual)
1. Reproduce the error
2. Copy the EXACT error message
3. Paste it to the AI assistant with the file + line
4. If stuck >30 min: simplify the feature, not your motivation

## Git Discipline
- Commit after every working feature: conventional commits (feat:, fix:, chore:)
- Push to GitHub after every session (backup + portfolio)
- .env.local NEVER committed

## LLM Economy (free-tier aware)
- Cache repeated LLM calls where possible
- Log every LLM call: timestamp, provider, purpose — to find quota eaters
- Prefer one well-crafted prompt over prompt chains