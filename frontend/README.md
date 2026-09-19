# CareerPilot - Frontend Migration Complete

## Architecture Overview

This project now uses a **decoupled architecture** with:

1. **Backend (Next.js)**: Runs on port 3000
   - All API routes in `src/app/api/`
   - Authentication via NextAuth.js
   - Database via Prisma + PostgreSQL (Neon)
   - AI/LLM integration via Groq, Gemini, OpenRouter

2. **Frontend (TanStack React Start/Vite)**: Runs on port 8080
   - Located in `frontend/`
   - Modern SPA with TanStack Router
   - Beautiful dark-themed UI with Tailwind CSS v4
   - Zustand for state management
   - Connects to backend API for real data

## Development Setup

### Prerequisites
- Node.js 18+
- npm or pnpm

### Install Dependencies

```bash
# Install root dependencies (backend)
npm install

# Install frontend dependencies
cd frontend && npm install
```

### Run Development Servers

**Option 1: Run separately**
```bash
# Terminal 1 - Backend
npm run dev

# Terminal 2 - Frontend
cd frontend && npm run dev
```

**Option 2: Run together (requires concurrently)**
```bash
npm run dev:all
```

### Access the Application
- **Frontend**: http://localhost:8080
- **Backend API**: http://localhost:3000
- **API Docs**: http://localhost:3000/api/health

## Production Deployment

For production, build the frontend first, then the backend:

```bash
# Build frontend
npm run build:frontend

# Build backend
npm run build

# Start production server
npm start
```

The Next.js config includes rewrites to serve the frontend's built files.

## API Integration

The frontend connects to the backend via `frontend/src/lib/api.ts`. This client handles:

- Authentication token extraction from NextAuth cookies
- All CareerPilot API endpoints:
  - Resume upload/analysis
  - Resume builder
  - Mock interviews
  - AI Mentor
  - Coding challenges
  - Career roadmaps
  - Target companies
  - GitHub analysis
  - Readiness scores

## What Changed

### Removed (Old Frontend UI)
- `src/app/page.tsx` - Old landing page
- `src/app/globals.css` - Old styles
- `src/components/ui/*` - Old UI components
- `src/components/app-shell.tsx` - Old layout
- Various old component directories

### Preserved (Backend)
- `src/app/api/*` - All API routes
- `src/lib/auth.ts` - NextAuth configuration
- `src/lib/llm.ts` - AI/LLM integration
- `src/server/*` - Server utilities
- `prisma/schema.prisma` - Database schema
- `.env` - Environment configuration

### Added (New Frontend Integration)
- `frontend/src/lib/api.ts` - API client for backend
- `frontend/src/main.tsx` - TanStack Start entry point
- `frontend/index.html` - Updated with proper metadata
- Root `public/favicon.svg` - Copied from frontend
- Updated `next.config.mjs` - Rewrites for frontend
- Updated `package.json` - New scripts

## Features Available

The new frontend provides professional UI for:

1. **Dashboard** - Overview with readiness score and activities
2. **Mock Interview** - Technical, HR, and behavioral interviews
3. **Coding Test** - Practice coding challenges
4. **Resume Analyzer** - AI-powered resume feedback
5. **Resume Builder** - Build resumes step by step
6. **Career Roadmap** - 12-week preparation plans
7. **AI Mentor** - Chat with career coach
8. **Target Companies** - Company-specific preparation
9. **Profile** - User profile and settings

## Authentication

The frontend uses the existing NextAuth session cookies. When a user signs in via the backend (
 종전의 `src/app/api/auth/*` 的端點), the session cookie is automatically available to the frontend 
for authenticated API requests.

To sign in, users should visit `http://localhost:3000/api/auth/signin` or use the backend's 
authentication pages.

## Environment Variables

The frontend uses the same `.env` file as the backend for API configuration. 
Key variables:

- `DATABASE_URL` - PostgreSQL connection string
- `NEXTAUTH_SECRET` - Session encryption secret
- `GROQ_API_KEY` - Groq LLM API key
- `GEMINI_API_KEY` - Google Gemini API key
- `OPENROUTER_API_KEY` - OpenRouter API key

## Troubleshooting

### Frontend can't connect to API
- Ensure backend is running on port 3000
- Check that `frontend/src/lib/api.ts` has correct `API_BASE_URL`
- Verify authentication cookies are being sent

### Build errors
- Run `npm run build:frontend` separately to see frontend errors
- Ensure all dependencies are installed in both root and frontend

### API calls failing with 401
- User must be signed in via NextAuth
- Check that the session cookie is being sent with requests
- Verify `NEXTAUTH_SECRET` is set correctly