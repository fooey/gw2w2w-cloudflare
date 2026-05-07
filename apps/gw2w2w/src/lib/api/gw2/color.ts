import type { ServiceApiClient } from '#lib/api/api.client.ts';

export async function fetchAllColors(api: ServiceApiClient) {
  const res = await api.gw2.color.$get();
  return res.json();
}
