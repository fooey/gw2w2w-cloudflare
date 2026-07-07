/**
 * Replicates the production D1 database to local wrangler dev state.
 *
 * Steps:
 *   1. Wipes existing local wrangler state so there are no schema conflicts
 *   2. Exports the remote (production) D1 DB to a temp SQL file
 *   3. Imports the SQL file into the local D1 DB
 *   4. Cleans up the temp SQL file
 *
 * Usage: pnpm db:replicate
 */

import { execSync } from 'node:child_process';
import { rmSync } from 'node:fs';

/** @param {string} cmd */
function run(cmd) {
  console.info(`\n> ${cmd}`);
  execSync(cmd, { stdio: 'inherit' });
}

console.info('[replicate-prod-db] Wiping local wrangler state...');
rmSync('.wrangler/state', { recursive: true, force: true });

run('wrangler d1 export wvw-events --remote --output ./prod-dump.sql');
run('wrangler d1 execute wvw-events --local --file ./prod-dump.sql');

console.info('\n[replicate-prod-db] Cleaning up temp file...');
rmSync('./prod-dump.sql', { force: true });

console.info('[replicate-prod-db] Done — local D1 is now a copy of production.');
