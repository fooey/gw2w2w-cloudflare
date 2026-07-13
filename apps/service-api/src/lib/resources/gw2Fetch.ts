import { isEmpty, isNonEmptyString } from '@repo/utils';

import type { CloudflareEnv } from '#index.ts';

// KV keys written by the gw2HealthCheck cron (not by gw2Fetch itself) — see cron/gw2HealthCheck.ts.
// Value is a timestamp (ms since epoch, UTC) up to which the endpoint should be treated as unhealthy.
export const GW2_DIRECT_UNHEALTHY_KV_KEY = 'circuit-breaker:gw2-direct-unhealthy-until';
export const GW2_PROXY_UNHEALTHY_KV_KEY = 'circuit-breaker:gw2-proxy-unhealthy-until';

async function isMarkedHealthy(env: CloudflareEnv, kvKey: string): Promise<boolean> {
  const unhealthyUntil = await env.EMBLEM_ENGINE_GUILD_LOOKUP.get(kvKey);
  if (isEmpty(unhealthyUntil)) return true;
  return Number(unhealthyUntil) <= Date.now();
}

export interface Gw2Health {
  directHealthy: boolean;
  proxyHealthy: boolean;
}

/**
 * Reads the health flags maintained by the gw2HealthCheck cron, for status reporting
 * (e.g. surfacing a "data may be stale" warning). Does not affect gw2Fetch's own routing.
 */
export async function getGw2Health(env: CloudflareEnv): Promise<Gw2Health> {
  const [directHealthy, proxyHealthy] = await Promise.all([
    isMarkedHealthy(env, GW2_DIRECT_UNHEALTHY_KV_KEY),
    isMarkedHealthy(env, GW2_PROXY_UNHEALTHY_KV_KEY),
  ]);
  return { directHealthy, proxyHealthy };
}

/**
 * Fetches a GW2 API path, preferring the direct connection and falling back to the
 * home-network proxy (czt-proxy.gw2w2w.com) when direct is either known-unhealthy
 * (per the gw2HealthCheck cron, checked every minute) or returns a 429 for this call.
 *
 * If direct returns a 429 and the proxy is *also* known-unhealthy, the proxy attempt is
 * skipped entirely and direct's 429 is returned as-is — a real, recognized rate-limit
 * response beats a proxy attempt unlikely to do better. The same preference applies if the
 * proxy is attempted anyway but returns something less useful than a 429 (5xx, 401, etc.).
 *
 * `path` is appended directly to GW2_API_BASE / GW2_PROXY_BASE (both already include
 * the `/v2` prefix) — callers should NOT include a leading `/v2`.
 *
 * Callers are responsible for their own Authorization/User-Agent headers via `init`;
 * this function only adds X-Proxy-Key when the proxy path is actually used, since ArenaNet
 * must never see that header (Caddy also strips it, but it's not sent at all from here).
 *
 * Timeout is managed internally via `timeoutMs`, giving the direct and proxy attempts their
 * own independent budgets — callers must NOT pass their own `init.signal`. AbortSignal.timeout()
 * fires once and stays aborted permanently; reusing one caller-supplied signal across both
 * attempts would mean a direct-side timeout poisons the proxy fetch too (it'd reject instantly
 * on the already-aborted signal), defeating the fallback in exactly the case it exists for.
 */
export async function gw2Fetch(
  env: CloudflareEnv,
  path: string,
  init: RequestInit = {},
  timeoutMs = 10_000,
): Promise<Response> {
  if (!path.startsWith('/')) {
    throw new Error(`gw2Fetch: path must start with "/", got "${path}"`);
  }

  const directHealthy = await isMarkedHealthy(env, GW2_DIRECT_UNHEALTHY_KV_KEY);
  let directResponse: Response | null = null;

  if (directHealthy) {
    const directUrl = new URL(`${env.GW2_API_BASE}${path}`);
    // Strip X-Proxy-Key unconditionally, regardless of what a caller's init happens to
    // contain — ArenaNet must never see it, and this shouldn't depend on every caller
    // remembering not to include it.
    const directHeaders = new Headers(init.headers);
    directHeaders.delete('X-Proxy-Key');
    try {
      directResponse = await fetch(directUrl, {
        ...init,
        headers: directHeaders,
        signal: AbortSignal.timeout(timeoutMs),
      });
      // Cron owns writing circuit-breaker state — this call just falls back for itself,
      // trusting the next health-check tick to update shared state within ~1 minute.
      if (directResponse.status !== 429) return directResponse;
    } catch {
      // Direct connection failed outright (network error, timeout, etc.) — fall through
      // to the proxy the same as a 429, rather than propagating and skipping the fallback.
    }
  }

  // Direct already gave us a real, recognized 429 (Retry-After, GW2RateLimitError handling
  // downstream). If the proxy is also known-unhealthy, attempting it is unlikely to produce
  // anything better — skip straight to preserving the 429 we already have.
  const proxyHealthy = await isMarkedHealthy(env, GW2_PROXY_UNHEALTHY_KV_KEY);
  if (directResponse?.status === 429 && !proxyHealthy) {
    return directResponse;
  }

  const proxyUrl = new URL(`${env.GW2_PROXY_BASE}${path}`);
  const proxyHeaders = new Headers(init.headers);
  if (isNonEmptyString(env.GW2_PROXY_SHARED_KEY)) {
    proxyHeaders.set('X-Proxy-Key', env.GW2_PROXY_SHARED_KEY);
  }

  try {
    const proxyResponse = await fetch(proxyUrl, {
      ...init,
      headers: proxyHeaders,
      signal: AbortSignal.timeout(timeoutMs),
    });
    // Don't let a less-useful proxy failure (5xx, 401, etc.) replace a direct 429 we already
    // have in hand — a 429 from either path is a recognized, handleable response; anything
    // else from the proxy is strictly worse than the 429 we're about to discard.
    if (directResponse && !proxyResponse.ok && proxyResponse.status !== 429) {
      return directResponse;
    }
    return proxyResponse;
  } catch (proxyError) {
    // Both paths failed outright — surface direct's real response (e.g. its 429) rather than
    // an opaque network error the caller has no existing handling for, if we have one to give.
    if (directResponse) return directResponse;
    throw proxyError;
  }
}
