# Career Platform

Career Platform is an AI-assisted career development platform for CS students. It combines resume analysis, GitHub/profile insights, skill-gap detection, personalized roadmaps, coding practice, and mock interview coaching into a single workflow designed to help students move from coursework into job-ready readiness.

## Product overview

The platform is built to answer a simple but critical question for students: "What should I learn next, and how close am I to being hire-ready for my target role?"

It brings together:

- Resume parsing and profile analysis
- Skill-gap assessment against a target role
- AI-generated career roadmaps
- Coding challenge practice tied to real gaps
- Mock interview sessions and communication feedback
- Admin tooling for roles, usage, and platform management

## Core features

### Skill gap analysis
- Upload a resume or profile snapshot
- Compare the user's skills against a target role
- Identify missing skills and highlight priority gaps
- Explain why a gap matters for the chosen role

### Personalized roadmap
- Generate a milestone-based roadmap
- Prioritize work based on role relevance and urgency
- Track milestone completion over time

### Coding practice
- Generate challenge prompts tied to missing skills
- Run sandboxed code evaluation
- Give correctness and quality feedback

### Mock interviews
- Simulate technical and behavioral interview sessions
- Continue with adaptive follow-up questions
- Capture transcript history for feedback analysis

### Communication feedback
- Review interview transcripts for clarity and structure
- Highlight weak points in answers and communication patterns

### Admin console
- Manage target roles
- Manage challenge banks
- Review user health and usage metrics

## Tech stack

### Frontend
- Next.js
- React
- TypeScript
- Tailwind CSS
- Lucide icons

### Backend
- Python
- FastAPI
- SQLAlchemy / async ORM
- Alembic migrations
- Pydantic settings

### AI / services
- OpenRouter for LLM orchestration
- GitHub API integration
- Judge0-style code execution support
- Stripe-ready credit flows

### Data / storage
- SQLite for local/dev testing
- PostgreSQL in production-oriented architecture
- S3-compatible object storage for uploads

## Repository structure

```text
.
├── AGENTS.md
├── architecture.md
├── DESIGN.md
├── MEMORY.md
├── PHASE.md
├── PRD.md
├── PROMPT.md
├── RULES.md
├── README.md
├── alembic/
├── backend/
│   ├── ai/
│   ├── api/
│   ├── models/
│   ├── sandbox/
│   ├── services/
│   ├── tests/
│   ├── auth.py
│   ├── config.py
│   ├── database.py
│   ├── main.py
│   └── requirements.txt
├── deploy/
├── frontend/
│   ├── app/
│   ├── components/
│   ├── lib/
│   ├── package.json
│   └── ...
├── tests/
├── .env.example
└── graphify-out/
```

## Local setup

### 1) Clone and install backend dependencies

```bash
cd backend
python -m venv .venv
source .venv/bin/activate   # Windows: .venv\Scripts\activate
pip install -r requirements.txt
```

### 2) Configure environment variables

Copy the example env file and update the keys as needed:

```bash
cd ..
copy .env.example .env
```

Important environment values include:

- DATABASE_URL
- JWT_SECRET_KEY
- OPENROUTER_API_KEY
- GITHUB_CLIENT_ID / GITHUB_CLIENT_SECRET
- GITHUB_TOKEN_ENCRYPTION_KEY
- STRIPE keys if using live checkout

### 3) Run the backend

```bash
cd backend
uvicorn main:app --reload --host 0.0.0.0 --port 8000
```

### 4) Run the frontend

```bash
cd frontend
npm install
npm run dev
```

Then open:

- Frontend: http://localhost:3000
- Backend API docs: http://localhost:8000/docs

## Validation and testing

The project includes backend tests and frontend type validation.

### Backend

```bash
cd backend
pytest
```

### Frontend

```bash
cd frontend
npm run typecheck
```

## Notes on the current implementation

This repository is a production-style MVP architecture with working backend patterns, AI orchestration hooks, role management, credit-related billing scaffolding, and a polished landing-page experience. The current frontend is already structured as a dark premium SaaS UI, with a strong product narrative and app-like route organization.

## Project status

The project is in a healthy state from the current validation pass:

- Backend tests pass in the configured environment
- Frontend TypeScript validation passes
- Graph knowledge artifacts are refreshed in the project output folder
- The landing page and app shell are styled in a professional SaaS aesthetic

## License

This project is for internal/product development usage in the current workspace unless a separate license is provided.
