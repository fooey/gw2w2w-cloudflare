const apiBase = process.env.NODE_ENV === 'production' ? 'https://api.gw2w2w.com' : 'http://localhost:8788';

// extends fetch with the API base URL and error handling
export async function apiFetch(input: RequestInfo, init?: RequestInit) {
  const url = typeof input === 'string' ? `${apiBase}${input}` : new URL(input.url, apiBase).toString();

  return fetch(url, init);
}
