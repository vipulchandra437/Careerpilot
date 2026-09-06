# PRD.md — Product Requirements Document

## Product Name
HireReady — AI Career Preparation Platform for CS Students

## One-Liner
Helps CS students go from their resume → AI mock interview → readiness score, so they know exactly what to fix before the real interview.

## Target User
CS students (2nd–4th year) struggling to get internships and first jobs. Budget: near-zero. Pain: don't know what's wrong with their resume or interview skills.

## Core Loop
1. Student uploads resume
2. App parses and analyzes it (score + specific feedback)
3. Student runs a mock interview built FROM their resume
4. Everything combines into one Hire Readiness Score + improvement roadmap

## Features (priority order)
| # | Feature | Phase | Status |
|---|---------|-------|--------|
| F1 | Auth + user accounts | 1 | Planned |
| F2 | Resume upload + parsing | 1 | Planned |
| F3 | Resume analysis (score, strengths, weaknesses) | 2 | Planned |
| F4 | Resume builder (from scratch) + PDF export | 3 | Planned |
| F5 | Text mock interviewer (resume-aware) | 4 | Planned |
| F6 | Voice mock interviewer (Web Speech API) | 4 | Planned |
| F7 | Hire Readiness Scoreboard | 5 | Planned |
| F8 | Target company selection (adapts interview style) | 6 | Planned |
| F9 | GitHub profile analysis | 6 | Planned |
| F10 | Coding tests (sandboxed) | 6 | Planned |
| F11 | Mentor chatbot | 7 | Planned |
| F12 | Personalized learning roadmap | 7 | Planned |

## Non-Goals (v1)
- Payments/subscriptions
- Mobile native apps
- Video avatars for the interviewer
- Job posting aggregation
- Real recruiter connections

## Success Criteria
- A student uploads a resume and gets useful, specific advice in <30 seconds
- A mock interview feels responsive (AI reply <3 seconds)
- A student can articulate "my top 3 weaknesses" after using the app
- Solo dev can maintain the codebase alone

## Constraints
- ₹0 budget — free-tier AI APIs only (Groq, Gemini, OpenRouter)
- Solo developer; single Next.js codebase
- LLM calls must degrade gracefully (fallback chain, friendly errors)