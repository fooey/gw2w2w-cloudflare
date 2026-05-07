import { getApi } from '#lib/api/api.server.ts';

export async function fetchAllColors() {
  const api = await getApi();
  const res = await api.gw2.color.$get();
  return res.json();
}
