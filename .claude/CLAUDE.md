# Project context

Load the project's canonical context file — it contains the full reading order (MEMORY.md, PRD.md, architecture.md, DESIGN.md, RULES.md, PHASE.md, PROMPT.md), the locked decisions table, and the ground rules for working in this repo:

- **Read `AGENTS.md`** at session start (it is the entry point; everything else is loaded on demand by reference, not dumped here, so the agent doesn't drown in context it doesn't need yet).

# graphify
- **graphify** (`.claude/skills/graphify/SKILL.md`) - any input to knowledge graph. Trigger: `/graphify`
When the user types `/graphify`, use the installed graphify skill or instructions before doing anything else.
