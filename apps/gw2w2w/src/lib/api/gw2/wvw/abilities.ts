import type { ServiceApiClient } from '#lib/api/api.client.ts';

export async function fetchWvwAbilities(api: ServiceApiClient) {
  const res = await api.gw2.wvw.abilities.$get();
  return res.json();
}

export async function fetchWvwAbility(api: ServiceApiClient, id: number) {
  const res = await api.gw2.wvw.abilities[':id'].$get({ param: { id: String(id) } });
  if (!res.ok) return null;
  return res.json();
}
