import type { ServiceApiClient } from '#lib/api/api.client.ts';

export async function fetchGuildUpgrades(api: ServiceApiClient, ids: number[]) {
  if (ids.length === 0) return [];
  const res = await api.gw2.guild.upgrades.$get({ query: { ids: ids.join(',') } });
  if (!res.ok) return null;
  return res.json();
}
