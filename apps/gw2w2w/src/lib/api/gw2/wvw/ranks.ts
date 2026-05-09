import type { ServiceApiClient } from '#lib/api/api.client.ts';

export async function fetchWvwRanks(api: ServiceApiClient) {
  const res = await api.gw2.wvw.ranks.$get();
  return res.json();
}

export async function fetchWvwRank(api: ServiceApiClient, id: number) {
  const res = await api.gw2.wvw.ranks[':id'].$get({ param: { id: String(id) } });
  if (!res.ok) return null;
  return res.json();
}
