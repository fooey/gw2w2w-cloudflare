import { isEmpty, isNonEmptyString } from '@repo/utils';

import type { CloudflareEnv } from '#index.ts';

export class GW2RateLimitError extends Error {
  public retryAfterMs: number;

  public constructor(retryAfterMs: number) {
    super(`GW2 API rate limited — retry after ${retryAfterMs}ms`);
    this.name = 'GW2RateLimitError';
    this.retryAfterMs = retryAfterMs;
  }
}

export async function apiFetch(env: CloudflareEnv, path: string, init?: RequestInit): Promise<Response> {
  if (isEmpty(env.GW2_PROXY_BASE) || isEmpty(env.GW2_API_KEY) || isEmpty(env.GW2_PROXY_SHARED_KEY)) {
    throw new Error('GW2_PROXY_BASE, GW2_API_KEY, and GW2_PROXY_SHARED_KEY must be set in environment variables');
  }

  const requestUrl = new URL(`${env.GW2_PROXY_BASE}${path}`);

  // attach api key and proxy auth to headers
  const headers = new Headers(init?.headers);
  headers.set('Authorization', `Bearer ${env.GW2_API_KEY}`);
  headers.set('User-Agent', 'gw2w2w.com');
  headers.set('X-Proxy-Key', env.GW2_PROXY_SHARED_KEY);
  const requestInit = { ...init, headers, signal: AbortSignal.timeout(20_000) };

  const response = await fetch(requestUrl, requestInit);

  if (response.status === 429) {
    const retryAfter = response.headers.get('retry-after');
    // parseFloat tolerates trailing garbage, unlike Number() — consistent with the same
    // Retry-After parsing pattern in MatchupPoller.
    // eslint-disable-next-line unicorn/prefer-number-coercion
    const retryAfterMs = isNonEmptyString(retryAfter) ? Number.parseFloat(retryAfter) * 1000 : 60_000;
    throw new GW2RateLimitError(retryAfterMs);
  }

  return response;
}
