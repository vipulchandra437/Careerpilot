# DESIGN.md — UI/UX Design

## 1. Design Principles

- **Clarity over cleverness** — a student under placement stress should never wonder what to do next; every screen has one obvious primary action.
- **Progress is always visible** — gaps, roadmap items, and practice sessions show status (not started / in progress / done) using both color and text/icon, never color alone (accessibility, §6).
- **Feedback feels like a mentor, not a scoreboard** — AI feedback (interview, code, communication) reads like a note from someone who read your actual answer, not a generic rubric dump.

## 2. Core Screens (detailed)

### 2.1 Onboarding

- Step 1: signup (email/password or GitHub OAuth).
- Step 2: connect GitHub (optional, skippable) — explain in one line why it helps ("lets us see what you've actually built").
- Step 3: upload resume (drag-drop + file picker, PDF/DOCX).
- Step 4: pick a target role from a dropdown/searchable list (backed by `target_role_profiles`).
- Primary CTA at each step is singular and obvious; "skip for now" is available on optional steps only.

### 2.2 Dashboard

- Top: profile completeness indicator (resume ✓ / GitHub ✓ or skip / LinkedIn optional).
- Middle: top 3 gaps by severity, each with a one-line reason.
- Bottom: "next roadmap action" card — the single next thing to do, with a direct CTA (not a link to a list).
- Empty state (first visit): replaces the above with a single prompt to complete onboarding.

### 2.3 Skill Gap Report

- Full ranked list, grouped by severity (critical / important / nice-to-have) as collapsible sections.
- Each gap row: skill name, one-sentence reason, and a "why this matters" expandable detail.
- No raw scores/percentages as the primary display — severity labels + explanation are the primary UI; a numeric score can exist but is secondary.

### 2.4 Roadmap View

- Vertical ordered list of milestones, each showing status, linked gap skill, and a CTA matching its action type ("Start Challenge" / "Practice Interview" / "Read Resource").
- Completed milestones collapse but remain visible (don't hide progress — it's motivating to see what's done).

### 2.5 Coding Practice

- Split view: problem prompt (left/top on mobile) + code editor (right/bottom).
- Editor: monospace font, syntax highlighting, dark-mode friendly by default (developer audience expectation).
- Run button separate from Submit — running shows test results without consuming a "submission" (matters once credits/limits exist, PROMPT.md).
- Feedback panel appears after submit: pass/fail per test case, then a collapsible "code quality notes" section (don't front-load style nitpicks over correctness).

### 2.6 Mock Interview

- Chat-style UI (interviewer messages left-aligned, student right-aligned), similar to a messaging app so it feels conversational, not like a form.
- Optional visible timer for behavioral rounds (toggle, not forced).
- "End interview" always visible and clearly not a "give up" action — framed neutrally.

### 2.7 Interview Feedback

- Transcript above, feedback below, with feedback lines linking/scrolling to the specific transcript turn they reference (this is the detail that makes feedback feel specific rather than generic, per PRD.md §6.5).
- CTA at the bottom: "Add related gaps to my roadmap" if the interview exposed a new gap.

### 2.8 Profile Hub

- Three cards: Resume, GitHub, LinkedIn — each showing what was extracted and a "re-analyze" action.
- Conflicts in merged data (architecture.md §4) surfaced transparently, e.g., "GitHub shows heavy Python use; your resume doesn't mention it — want to add it?"

### 2.9 Admin Console

- Separate layout from the student app: left sidebar nav (Target Roles, Challenge Bank, Users, Usage Dashboard).
- Data tables with inline edit for `target_role_profiles` and challenge bank — no separate "edit page" round-trip for simple field changes.
- Usage dashboard: simple line/bar charts (signups over time, feature usage counts, LLM cost per feature) — no need for a heavy BI tool for v1.

## 3. Key User Flows

- **First-time:** Signup → Onboarding → Dashboard (empty state) → Skill Gap Report → Roadmap → first Coding Challenge.
- **Return visit:** Dashboard's "next roadmap action" card is the primary CTA — the app should always know what a returning student should do next.
- **Interview flow:** Mock Interview → Interview Feedback → (if new gap found) → Roadmap updated → Dashboard reflects it.

## 4. Component/Style Direction

- Tailwind CSS + shadcn/ui — lightweight, avoids the overhead of a full custom design system for a v1 that needs to ship.
- One consistent status-indicator component reused across Roadmap, Coding Practice, and Admin views — don't reinvent status UI per screen.
- Code editor: Monaco or CodeMirror, dark-mode default with a light-mode toggle.

## 5. Responsive Behavior

- **Mobile:** single-column, bottom tab nav for the 4 primary sections (Dashboard, Roadmap, Practice, Interviews); Coding Practice stacks prompt above editor instead of side-by-side.
- **Desktop:** left sidebar nav, multi-column dashboard, side-by-side coding practice layout.
- **Admin Console:** desktop-first (data-table heavy) but must remain usable (not broken) on tablet width — mobile admin is not required for v1.

## 6. Accessibility

- Status/severity indicators always paired with text or icon, never color alone.
- All interactive elements (including the interview chat) keyboard-navigable.
- Sufficient contrast on dark-mode code editor and light-mode UI both — check against WCAG AA at minimum.
