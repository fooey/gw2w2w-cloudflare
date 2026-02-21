const apiBase = process.env.NEXT_PUBLIC_SERVICE_API_HOST;

// extends fetch with the API base URL and error handling
export async function apiFetch(input: RequestInfo, init?: RequestInit) {
  if (!apiBase) {
    throw new Error(
      'API base URL is not defined. Please set NEXT_PUBLIC_SERVICE_API_HOST in your environment variables.',
    );
  }

  const url = typeof input === 'string' ? `${apiBase}${input}` : new URL(input.url, apiBase).toString();

  return fetch(url, init);
}
