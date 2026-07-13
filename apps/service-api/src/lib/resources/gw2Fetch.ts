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
 * `path` is appended directly to GW2_API_BASE / GW2_PROXY_BASE (both already include
 * the `/v2` prefix) — callers should NOT include a leading `/v2`.
 *
 * Callers are responsible for their own Authorization/User-Agent headers via `init`;
 * this function only adds X-Proxy-Key when the proxy path is actually used, since ArenaNet
 * must never see that header (Caddy also strips it, but it's not sent at all from here).
 */
export async function gw2Fetch(env: CloudflareEnv, path: string, init: RequestInit = {}): Promise<Response> {
  const directHealthy = await isMarkedHealthy(env, GW2_DIRECT_UNHEALTHY_KV_KEY);

  if (directHealthy) {
    const directUrl = new URL(`${env.GW2_API_BASE}${path}`);
    try {
      const response = await fetch(directUrl, init);
      // Cron owns writing circuit-breaker state — this call just falls back for itself,
      // trusting the next health-check tick to update shared state within ~1 minute.
      if (response.status !== 429) return response;
    } catch {
      // Direct connection failed outright (network error, timeout, etc.) — fall through
      // to the proxy the same as a 429, rather than propagating and skipping the fallback.
    }
  }

  const proxyUrl = new URL(`${env.GW2_PROXY_BASE}${path}`);
  const proxyHeaders = new Headers(init.headers);
  if (isNonEmptyString(env.GW2_PROXY_SHARED_KEY)) {
    proxyHeaders.set('X-Proxy-Key', env.GW2_PROXY_SHARED_KEY);
  }
  return fetch(proxyUrl, { ...init, headers: proxyHeaders });
}
