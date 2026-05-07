import type { ServiceApiClient } from '#lib/api/api.client.ts';

export async function fetchGuild(api: ServiceApiClient, guildId: string) {
  const res = await api.gw2.guild[':guildId'].$get({ param: { guildId } });
  if (!res.ok) return null;
  return res.json();
}

export async function fetchGuildByName(api: ServiceApiClient, name: string) {
  const res = await api.gw2.guild.search.$get({ query: { name: name.toLocaleLowerCase() } });
  if (!res.ok) return null;
  return res.json();
}
