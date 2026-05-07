import { getApi } from '#lib/api/api.server.ts';

export async function fetchWvwAbilities() {
  const api = await getApi();
  const res = await api.gw2.wvw.abilities.$get();
  return res.json();
}

export async function fetchWvwAbility(id: number) {
  const api = await getApi();
  const res = await api.gw2.wvw.abilities[':id'].$get({ param: { id: String(id) } });
  if (!res.ok) return null;
  return res.json();
}
