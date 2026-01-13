import { GW2Api } from 'guildwars2-ts';

export type Guild = Awaited<ReturnType<typeof getGuild>>;
export type EmblemBackground = Awaited<
  ReturnType<typeof getEmblemBackground>
>[number];
export type EmblemForeground = Awaited<
  ReturnType<typeof getEmblemForeground>
>[number];
export type Color = Awaited<ReturnType<typeof getColor>>[number];

function getApi() {
  return new GW2Api({ inBrowser: false });
}

export function getGuild(guildId: string) {
  return getApi().guild.get(guildId);
}

export function getEmblemBackground(id: number | number[]) {
  return getApi().emblem.get('backgrounds', Array.isArray(id) ? id : [id]);
}

export function getEmblemForeground(id: number | number[]) {
  return getApi().emblem.get('foregrounds', Array.isArray(id) ? id : [id]);
}

export function getColor(id: number | number[]) {
  return getApi().colors.get(Array.isArray(id) ? id : [id]);
}
