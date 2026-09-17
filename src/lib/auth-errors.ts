// Shared between the server throttle and the login form: login-throttle.ts runs
// server-side (it imports Prisma), while login-form.tsx is a client component —
// a constants-only file keeps the sentinel importable from both without pulling
// server code into the client bundle.

// WHY a sentinel prefix: Auth.js v4 turns a thrown authorize() error into the
// ?error= query param that signIn({ redirect: false }) returns verbatim
// (core/routes/callback.js → react/index.js). Prefixing our lockout message lets
// the form recognize it as ours and strip the marker before display — any other
// error text stays generic, so users never see raw server internals (RULES.md).
export const LOCKOUT_PREFIX = "TOO_MANY_ATTEMPTS:";
