import { getApi } from '#lib/api/api.server.ts';

export async function fetchWvwRanks() {
  const api = await getApi();
  const res = await api.gw2.wvw.ranks.$get();
  return res.json();
}

export async function fetchWvwRank(id: number) {
  const api = await getApi();
  const res = await api.gw2.wvw.ranks[':id'].$get({ param: { id: String(id) } });
  if (!res.ok) return null;
  return res.json();
}
