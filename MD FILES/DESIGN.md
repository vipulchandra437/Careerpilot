# DESIGN.md — HireReady Visual & UX Direction

## Design Philosophy
Clean, focused, encouraging. This is a tool for anxious students — the UI must
feel calm and motivating, not corporate or overwhelming.

## Brand Personality
Encouraging coach, not cold judge. Copy uses "your progress" framing, not pass/fail.

## Layout System
- Single-column focus layout for flows (upload → analysis → interview)
- Dashboard: card-based, max-w-6xl centered
- Generous whitespace; sections breathe

## Color (applied via Tailwind theme)
- Primary: deep violet/purple (#5b21b6 range) — trust + focus
- Background: near-white (#fafafa light / #0f0f12 dark later)
- Success: green · Warning: amber · Error: red — standard semantics only
- Neutral grays for text hierarchy (900/600/400)

## Typography
- Sans-serif (default shadcn stack: Inter/system-ui)
- Headings: semibold, tight tracking
- Body: relaxed line-height for readability

## Components (shadcn/ui)
- Cards for resume/analysis/interview results
- Progress bars for readiness score (with per-area segments)
- Dialog for interview question flow
- Toasts for feedback (saved/error/rate-limited)

## Key Screens & Mood
1. Landing: big tagline, one screenshot-free hero, two buttons. Minimal.
2. Upload: single dropzone, supportive hint text, zero clutter.
3. Analysis report: score ring + strengths (green) + fixes (amber) + weaknesses (red), scannable.
4. Interview: distraction-free chat view, question focus, progress dots.

## UX Principles
- Optimistic UI with graceful loading states (LLM calls take seconds)
- Loading ≠ spinner-only: show progress copy ("Analyzing your projects…")
- Never dead-end errors — always a next action (retry / come back later)
- Score display: always show WHAT TO IMPROVE next to any number

## Accessibility
- Keyboard navigable, visible focus rings, semantic HTML
- Min 16px base font, contrast AA minimum