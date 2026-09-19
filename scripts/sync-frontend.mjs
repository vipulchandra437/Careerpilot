import { cpSync, existsSync, rmSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const repo = join(dirname(fileURLToPath(import.meta.url)), '..');
const src = join(repo, 'frontend', 'dist');
const dest = join(repo, 'public', 'frontend', 'dist');

if (!existsSync(src)) {
  console.error(`[sync-frontend] frontend build not found at ${src} — run "npm run build:frontend" first.`);
  process.exit(1);
}

// Replace the previous sync wholesale (it is a generated artifact, never edited
// by hand). Public assets are copied into .next at `next build`, so this must
// run BEFORE the Next build in build:all.
rmSync(dest, { recursive: true, force: true });
cpSync(src, dest, {
  recursive: true,
  // The SPA's own SSR server bundle is irrelevant to Next; shipping it as a
  // static file would be dead weight (and could expose server-only code paths).
  filter: (from) => !from.includes(join(src, 'server')),
});
console.log(`[sync-frontend] ${src} -> ${dest}`);