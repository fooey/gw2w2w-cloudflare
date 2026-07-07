/**
 * Polls the local wrangler dev server until it responds, then triggers the
 * scheduled handler to bootstrap MatchupPoller DO on startup.
 *
 * Designed to run as a turbo `dev:seed` task that `dependsOn: ["dev"]`.
 */
import { exit } from 'node:process';

const SCHEDULED_URL = 'http://localhost:8788/__scheduled?cron=*+*+*+*+*';
const MAX_ATTEMPTS = 60; // 60 × 500ms = 30s
const RETRY_DELAY_MS = 500;

async function attempt(n = 0) {
  try {
    const res = await fetch(SCHEDULED_URL);
    console.info(`[dev-seed] OK (${res.status}) — MatchupPoller DO bootstrapped`);
  } catch {
    if (n >= MAX_ATTEMPTS) {
      console.error(`[dev-seed] Gave up after ${MAX_ATTEMPTS} attempts — is wrangler dev running on :8788?`);
      exit(1);
    }
    // eslint-disable-next-line promise/avoid-new -- promisifying setTimeout; no existing promise to delegate to.
    await new Promise((resolve) => {
      setTimeout(resolve, RETRY_DELAY_MS);
    });
    await attempt(n + 1);
  }
}

await attempt();
