import { getApi } from '#lib/api/api.server.ts';

export async function fetchWvwUpgrades() {
  const api = await getApi();
  const res = await api.gw2.wvw.upgrades.$get();
  return res.json();
}

export async function fetchWvwUpgrade(id: number) {
  const api = await getApi();
  const res = await api.gw2.wvw.upgrades[':id'].$get({ param: { id: String(id) } });
  if (!res.ok) return null;
  return res.json();
}
