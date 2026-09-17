# GRAPH_REPORT - CareerPilot (CareerPilot)

Graph: 680 nodes, 1393 edges, 21 communities

## God Nodes (hub files by connectivity)
- `src_lib_validators_index` - 51 connections
- `src_lib_auth` - 42 connections
- `ref_next_auth` - 34 connections
- `src_server_prisma` - 34 connections
- `package` - 33 connections
- `src_lib_auth_authoptions` - 32 connections
- `src_server_prisma_prisma` - 32 connections
- `src_components_ui_button` - 28 connections

## Surprising Connections (cross-community bridges)
- `package` <-> `package_dependencies` (bridge: next / next.config.mjs / nextConfig <-> dependencies / bcryptjs / class-variance-authority)
- `package` <-> `ref_prisma_client` (bridge: next / next.config.mjs / nextConfig <-> pdf-parse / next-auth / @prisma/client)
- `package` <-> `ref_bcryptjs` (bridge: next / next.config.mjs / nextConfig <-> bcryptjs / route.ts / POST())
- `package` <-> `ref_react` (bridge: next / next.config.mjs / nextConfig <-> react / POST() / page.tsx)
- `package` <-> `ref_three` (bridge: next / next.config.mjs / nextConfig <-> three / page.tsx / GraphifyPage())
- `package` <-> `ref_zod` (bridge: next / next.config.mjs / nextConfig <-> zod / page.tsx / metadata)
- `package` <-> `package_devdependencies` (bridge: next / next.config.mjs / nextConfig <-> devDependencies / eslint / eslint-config-next)
- `ref_prisma_client` <-> `src_app_api_roadmap_route` (bridge: pdf-parse / next-auth / @prisma/client <-> route.ts / finishAttempt() / GenerationResult)
- `ref_bcryptjs` <-> `src_lib_auth` (bridge: bcryptjs / route.ts / POST() <-> pdf-parse / next-auth / @prisma/client)
- `ref_class_variance_authority` <-> `src_components_ui_button` (bridge: next / next.config.mjs / nextConfig <-> route.ts / finishAttempt() / GenerationResult)

## Suggested Questions
- Which files form the auth/session spine, and how does middleware route them?
- How does the dashboard builder connect to the resume data model?
- Where do AI calls (interview/practice) touch the database schema?

## Communities
- Community 1 (142): pdf-parse / next-auth / @prisma/client
- Community 2 (124): route.ts / finishAttempt() / GenerationResult
- Community 3 (91): react / POST() / page.tsx
- Community 4 (61): next / next.config.mjs / nextConfig
- Community 5 (36): three / page.tsx / GraphifyPage()
- Community 6 (33): zod / page.tsx / metadata
- Community 7 (26): page.tsx / metadata / PracticePage()
- Community 8 (25): route.ts / POST() / githubAnalysis.ts
- Community 9 (22): page.tsx / InterviewPage() / SessionState
- Community 10 (18): components.json / aliases / components
- Community 11 (18): tsconfig.json / compilerOptions / allowJs
- Community 12 (17): dependencies / bcryptjs / class-variance-authority
- Community 13 (13): speech.d.ts / SpeechRecognition / .abort()
- Community 14 (12): devDependencies / eslint / eslint-config-next
- Community 15 (12): graphify-scan.mjs / aliasFallbacks / edges
- Community 16 (12): bcryptjs / route.ts / POST()
- Community 17 (4): .eslintrc.json / extends / next/core-web-vitals
- Community 18 (4): dashboard-navbar.tsx / DashboardNavbar() / NAV_ITEMS
- Community 19 (4): next-auth.d.ts / next-auth / WHY: Auth.js v4 types its Session.user without an `id`. The session callback
- Community 20 (3): postcss.config.mjs / config / postcss-load-config
- Community 21 (3): middleware.ts / config / middleware()