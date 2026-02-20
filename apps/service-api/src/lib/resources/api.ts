import type { CloudflareEnv } from '@api/index';

export function apiFetch(env: CloudflareEnv, path: string, init?: RequestInit) {
  if (!env.GW2_API_BASE || !env.GW2_API_KEY) {
    throw new Error('GW2_API_BASE and GW2_API_KEY must be set in environment variables');
  }

  const requestUrl = new URL(`${env.GW2_API_BASE}${path}`);

  // attach api key to headers
  const headers = new Headers(init?.headers);
  headers.set('Authorization', `Bearer ${env.GW2_API_KEY}`);
  init = { ...init, headers };

  return fetch(requestUrl, init);
}
