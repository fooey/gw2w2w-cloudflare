import type { ServiceApiClient } from '#lib/api/api.client.ts';

export async function fetchWvwGuild(api: ServiceApiClient, guildId: string) {
  const res = await api.gw2.wvw.guilds.guild[':guildId'].$get({ param: { guildId } });
  if (!res.ok) return null;
  return res.json();
}
