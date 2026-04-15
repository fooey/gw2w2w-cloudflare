import { apiFetch } from '#lib/api/client';
import { parseResponse } from '#lib/api/utils';
import { type Guild } from '@repo/service-api/types';

export function fetchGuild(guildId: string): Promise<Guild | null> {
  return apiFetch(`/gw2/guild/${guildId}`).then(parseResponse<Guild>);
}

export function fetchGuildByName(name: string): Promise<Guild | null> {
  return apiFetch(`/gw2/guild/search?name=${name.toLocaleLowerCase()}`).then(parseResponse<Guild>);
}
