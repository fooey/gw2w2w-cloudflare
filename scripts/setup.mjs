#!/usr/bin/env node
/**
 * One-time local development setup script.
 *
 * Run after cloning and installing dependencies:
 *   pnpm setup:dev
 *
 * What it does:
 *   1. Scaffolds apps/service-api/.dev.vars if it doesn't exist, so wrangler
 *      can pick up GW2_API_KEY for local development.
 *   2. Applies D1 migrations to the local wrangler simulation database so the
 *      WvW schema exists before `pnpm dev` starts.
 *
 * It is safe to re-run — existing files are not overwritten and migrations
 * that have already been applied are skipped by wrangler automatically.
 */

import { execSync } from 'node:child_process';
import { existsSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';

const ROOT = new URL('..', import.meta.url).pathname.replace(/^\/([A-Z]:)/, '$1');

// ── 1. Scaffold .dev.vars ─────────────────────────────────────────────────────

const devVarsPath = resolve(ROOT, 'apps/service-api/.dev.vars');

if (existsSync(devVarsPath)) {
  console.log('✓  apps/service-api/.dev.vars already exists — skipping');
} else {
  writeFileSync(
    devVarsPath,
    [
      '# Local development secrets for service-api.',
      '# Get a GW2 API key at https://account.arena.net/applications',
      'GW2_API_KEY=<your-api-key-here>',
      '',
    ].join('\n'),
  );
  console.log('✓  Created apps/service-api/.dev.vars — add your GW2_API_KEY before running pnpm dev');
}

// ── 2. Apply D1 migrations (local) ───────────────────────────────────────────

console.log('\nApplying D1 migrations (local)…');

try {
  execSync('pnpm dlx wrangler d1 migrations apply wvw-events --local', {
    cwd: resolve(ROOT, 'apps/service-api'),
    stdio: 'inherit',
  });
  console.log('✓  D1 migrations applied');
} catch {
  console.error('✗  D1 migration failed — is wrangler installed? Try running pnpm install first.');
  process.exit(1);
}

console.log('\nSetup complete. Run pnpm dev to start all services.');
