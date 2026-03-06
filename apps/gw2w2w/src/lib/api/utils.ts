export function parseResponse<T>(response: Response): Promise<T | null> {
  if (response.status === 404) {
    return Promise.resolve(null);
  }
  if (!response.ok) {
    throw new Error(`Error fetching data: ${response.status.toString()} ${response.statusText}`);
  }
  return response.json<T>();
}
