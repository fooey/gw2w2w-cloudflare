import { isNonEmptyString } from '@repo/utils';

import type { CloudflareEnv } from '#index.ts';
import { GW2_DIRECT_UNHEALTHY_KV_KEY, GW2_PROXY_UNHEALTHY_KV_KEY } from '#lib/resources/gw2Fetch.ts';

const HEALTH_CHECK_PATH = '/build';
// Longer than the 1-minute cron interval so a single delayed/missed tick doesn't
// flip status back to "healthy" before the next check actually confirms it.
const UNHEALTHY_COOLDOWN_MS = 90_000;
const HEALTH_CHECK_TIMEOUT_MS = 5000;

async function probeEndpoint(
  env: CloudflareEnv,
  url: string,
  headers: Record<string, string>,
  kvKey: string,
): Promise<void> {
  try {
    const response = await fetch(url, { headers, signal: AbortSignal.timeout(HEALTH_CHECK_TIMEOUT_MS) });
    await (response.status === 429
      ? env.EMBLEM_ENGINE_GUILD_LOOKUP.put(kvKey, String(Date.now() + UNHEALTHY_COOLDOWN_MS), { expirationTtl: 300 })
      : env.EMBLEM_ENGINE_GUILD_LOOKUP.delete(kvKey));
  } catch {
    // Network error, timeout, etc. — treat the same as a 429 for routing purposes.
    await env.EMBLEM_ENGINE_GUILD_LOOKUP.put(kvKey, String(Date.now() + UNHEALTHY_COOLDOWN_MS), {
      expirationTtl: 300,
    });
  }
}

/**
 * Probes both the direct and proxy GW2 API paths independently of any in-flight request,
 * writing circuit-breaker state to KV that gw2Fetch() reads to decide routing. Runs on its
 * own cron schedule (not attached to real traffic) so there's exactly one writer for this
 * shared state, and in-flight requests never pay the cost of a full-timeout probe themselves.
 */
export async function checkGw2Health(env: CloudflareEnv): Promise<void> {
  const proxyHeaders: Record<string, string> = { 'User-Agent': 'gw2w2w.com' };
  if (isNonEmptyString(env.GW2_PROXY_SHARED_KEY)) {
    proxyHeaders['X-Proxy-Key'] = env.GW2_PROXY_SHARED_KEY;
  }

  await Promise.all([
    probeEndpoint(
      env,
      `${env.GW2_API_BASE}${HEALTH_CHECK_PATH}`,
      { 'User-Agent': 'gw2w2w.com' },
      GW2_DIRECT_UNHEALTHY_KV_KEY,
    ),
    probeEndpoint(env, `${env.GW2_PROXY_BASE}${HEALTH_CHECK_PATH}`, proxyHeaders, GW2_PROXY_UNHEALTHY_KV_KEY),
  ]);
}
