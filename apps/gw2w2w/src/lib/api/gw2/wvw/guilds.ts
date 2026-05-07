import { getApi } from '#lib/api/api.server.ts';

export async function fetchWvwGuild(guildId: string) {
  const api = await getApi();
  const res = await api.gw2.wvw.guilds.guild[':guildId'].$get({ param: { guildId } });
  if (!res.ok) return null;
  return res.json();
}
