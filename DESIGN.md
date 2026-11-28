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

- Header: CareerPilot name plus a short greeting; signed-in students only.
- Top row (three cards on desktop, stacked on mobile): job readiness (0–100 with a status tag and the "resume 40% / mock interview 60%" note), feature status donut (complete / in progress / planned counts), and weekly practice bars (sessions per day for the last 7 days in the student's timezone).
- Feature grid: one card per feature with its name, one-line description, 0–100 score, progress bar, status text and a link.
- Bottom: one "Suggested next step" panel with a single CTA. With no data it tells the student what to do first (for example, "Upload your resume to get your first score.").
- Charts use inline SVG/CSS (no chart library); each chart has an `aria-label` containing the numbers. Status is always text plus colour, never colour alone.
- Light tokens come from `app/globals.css` and `tailwind.config.js`: canvas `#f8fafc`, panel `#ffffff`, soft `#f1f5f9`, border `#e2e8f0`, primary text `#0f172a`, muted text `#64748b`, indigo accent `#6366f1`, card radius `0.875rem`. The fixed student/admin sidebars deliberately keep the separate dark `surface` ramp (`#0b0f1a`–`#212a44`) unchanged.

### 2.3 Skill Gap Report

- Full ranked list, grouped by severity (critical / important / nice-to-have) as collapsible sections.
- Each gap row: skill name, one-sentence reason, and a "why this matters" expandable detail.
- No raw scores/percentages as the primary display — severity labels + explanation are the primary UI; a numeric score can exist but is secondary.

### 2.4 Roadmap View

- Domain chooser is a sticky white header with a gradient logo and an autocomplete search box (matching the standalone `/learning-roadmap.html` look). Focus shows all admin-managed roles, typing shows only matches, and a no-match message says domains are admin-managed. Autofill completes a role name; Tab or → accepts, Backspace deletes, arrows move, Enter selects, Escape closes. Selecting one loads that domain's roadmap and keeps `?role=` in the URL.
- Milestones are numbered circles on a vertical connector, with a checkmark for done stages and a blue ring on the first unfinished stage. Status is also shown as text and colour (done / in progress / not started). An overview card shows the progress ring, role name, hours, stage/topic/completed counts, and Regenerate; a brand-coloured "Goal reached" card ends the trail.
- Clicking a stage opens the sticky detail panel: stage number, hours, title, gap skill addressed, gap severity, status, action type, and the matching CTA ("Start Challenge" / "Practice Interview" / "Open resource"). Completed stages stay on the road with a checkmark (don't hide progress — it's motivating to see what's done). Below 900px the detail panel stacks above the trail; below 560px the search bar takes its own row.

### 2.5 Coding Practice

- Split view: problem prompt (left/top on mobile) + code editor (right/bottom).
- Editor: monospace font on a light panel with dark green text, matching the surrounding white UI.
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
- Code editor: lightweight monospace textarea styled as a light panel; no separate theme toggle.

## 5. Responsive Behavior

- **Mobile:** single-column, bottom tab nav for the 4 primary sections (Dashboard, Roadmap, Practice, Interviews); Coding Practice stacks prompt above editor instead of side-by-side.
- **Desktop:** left sidebar nav, multi-column dashboard, side-by-side coding practice layout.
- **Admin Console:** desktop-first (data-table heavy) but must remain usable (not broken) on tablet width — mobile admin is not required for v1.

## 6. Accessibility

- Status/severity indicators always paired with text or icon, never color alone.
- All interactive elements (including the interview chat) keyboard-navigable.
- Sufficient contrast on the light UI and its code editor — check against WCAG AA at minimum.
