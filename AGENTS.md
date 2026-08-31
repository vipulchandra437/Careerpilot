# AGENTS.md — Read This First

This file is the entry point. Coding agents (Claude Code, Cursor, etc.) load this automatically at session start — everything else is loaded on demand by reference, not dumped in here, so the agent doesn't drown in context it doesn't need yet.

## Read in this order

1. **MEMORY.md** — current state: locked decisions table, open decisions, glossary, known landmines. Always current — read every session.
2. **PRD.md** — what we're building and why: features, user stories, acceptance criteria, success metrics.
3. **architecture.md** — how it's built: tech stack, data model (with schemas), component responsibilities, folder structure.
4. **DESIGN.md** — UI/UX: every core screen described, user flows, component/style direction, responsive + accessibility rules.
5. **RULES.md** — hard constraints with reasoning: security, LLM usage, code style, testing, git conventions. Non-negotiable.
6. **PHASE.md** — build order: granular per-phase task checklists and exit criteria.
7. **PROMPT.md** — the original kickoff instructions and the three product decisions this project is locked to (backend, buyer, pricing).

## One-line project summary

AI-assisted career development platform for CS students — skill gap analysis, AI roadmaps, coding practice, mock interviews, communication feedback, and resume/LinkedIn/GitHub analysis, powered by OpenRouter LLMs. Being built for commercial sale — see RULES.md and PROMPT.md for the production-grade bar this implies.

## Ground rules for any agent working in this repo

- Check MEMORY.md's "Decisions Locked In" table and PROMPT.md before re-deriving something that's already decided.
- Any new decision not covered by those files gets one row added to MEMORY.md's decisions table before you continue — don't let it live only in your own context window.
- If a file here goes stale (a decision changes), edit the file itself and log it in MEMORY.md's Update Log — don't just mention it in chat.
- Scope conflicts: PRD.md wins on **what**. architecture.md + RULES.md win on **how**. Neither wins over a security rule in RULES.md §2 — those are absolute.
- Never mark a PHASE.md exit criterion done without demonstrating it (a passing test, a working screen, a sample output) — see RULES.md §4.

## Note for Claude Code specifically

Claude Code auto-loads `CLAUDE.md` (not `AGENTS.md`). This repo uses `.claude/CLAUDE.md` to point Claude Code at this file: it references `AGENTS.md` rather than duplicating the content, so there is a single source of truth. Keep `AGENTS.md` as the canonical entry point; do NOT copy its full content into a root `CLAUDE.md` (a root copy was removed — it drifted out of sync). If Claude Code stops auto-loading this project's context, check that `.claude/CLAUDE.md` still references `AGENTS.md`.
