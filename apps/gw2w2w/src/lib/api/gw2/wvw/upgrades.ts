import type { ServiceApiClient } from '#lib/api/api.client.ts';

export async function fetchWvwUpgrades(api: ServiceApiClient) {
  const res = await api.gw2.wvw.upgrades.$get();
  return res.json();
}

export async function fetchWvwUpgrade(api: ServiceApiClient, id: number) {
  const res = await api.gw2.wvw.upgrades[':id'].$get({ param: { id: String(id) } });
  if (!res.ok) return null;
  return res.json();
}
