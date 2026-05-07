import { getApi } from '#lib/api/api.server.ts';

export async function fetchGuildUpgrades(ids: number[]) {
  if (ids.length === 0) return [];
  const api = await getApi();
  const res = await api.gw2.guild.upgrades.$get({ query: { ids: ids.join(',') } });
  if (!res.ok) return null;
  return res.json();
}
