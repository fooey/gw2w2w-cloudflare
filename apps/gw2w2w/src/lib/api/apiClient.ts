import { GW2W2W_API_BASE_DEVELOPMENT, GW2W2W_API_BASE_PRODUCTION } from '#lib/api/constants.ts';

export const apiBase = process.env.NODE_ENV === 'production' ? GW2W2W_API_BASE_PRODUCTION : GW2W2W_API_BASE_DEVELOPMENT;

export async function apiFetch(input: RequestInfo, init?: RequestInit) {
  const url = typeof input === 'string' ? `${apiBase}${input}` : new URL(input.url, apiBase).toString();

  return fetch(url, init);
}
