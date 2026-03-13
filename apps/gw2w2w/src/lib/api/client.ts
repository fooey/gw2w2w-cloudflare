const API_BASE_PRODUCTION = 'https://api.gw2w2w.com';
const API_BASE_DEVELOPMENT = 'http://localhost:8788';

const apiBase = process.env.NODE_ENV === 'production' ? API_BASE_PRODUCTION : API_BASE_DEVELOPMENT;

export async function apiFetch(input: RequestInfo, init?: RequestInit) {
  const url = typeof input === 'string' ? `${apiBase}${input}` : new URL(input.url, apiBase).toString();

  return fetch(url, init);
}
