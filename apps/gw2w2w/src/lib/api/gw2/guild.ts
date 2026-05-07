import { getApi } from '#lib/api/api.server.ts';

export async function fetchGuild(guildId: string) {
  const api = await getApi();
  const res = await api.gw2.guild[':guildId'].$get({ param: { guildId } });
  if (!res.ok) return null;
  return res.json();
}

export async function fetchGuildByName(name: string) {
  const api = await getApi();
  const res = await api.gw2.guild.search.$get({ query: { name: name.toLocaleLowerCase() } });
  if (!res.ok) return null;
  return res.json();
}
