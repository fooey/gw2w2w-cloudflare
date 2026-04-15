import { type CloudflareEnv } from '#index.ts';

export class GW2RateLimitError extends Error {
  retryAfterMs: number;

  constructor(retryAfterMs: number) {
    super(`GW2 API rate limited — retry after ${retryAfterMs}ms`);
    this.name = 'GW2RateLimitError';
    this.retryAfterMs = retryAfterMs;
  }
}

export async function apiFetch(env: CloudflareEnv, path: string, init?: RequestInit): Promise<Response> {
  if (!env.GW2_API_BASE || !env.GW2_API_KEY) {
    throw new Error('GW2_API_BASE and GW2_API_KEY must be set in environment variables');
  }

  const requestUrl = new URL(`${env.GW2_API_BASE}${path}`);

  // attach api key to headers
  const headers = new Headers(init?.headers);
  headers.set('Authorization', `Bearer ${env.GW2_API_KEY}`);
  headers.set('User-Agent', 'gw2w2w.com');
  init = { ...init, headers };

  const response = await fetch(requestUrl, init);

  if (response.status === 429) {
    const retryAfter = response.headers.get('retry-after');
    const retryAfterMs = retryAfter ? parseFloat(retryAfter) * 1000 : 60_000;
    throw new GW2RateLimitError(retryAfterMs);
  }

  return response;
}
