import { apiFetch } from '@gw2w2w/lib/api/client';
import { parseResponse } from '@gw2w2w/lib/api/utils';
import { type Guild } from '@service-api/lib/types';

export function fetchGuild(guildId: string): Promise<Guild | null> {
  return apiFetch(`/gw2/guild/${guildId}`).then(parseResponse<Guild>);
}

export function fetchGuildsBatch(ids: string[]): Promise<Guild[] | null> {
  return apiFetch(`/gw2/guild?ids=${ids.join(',')}`).then(parseResponse<Guild[]>);
}

export function fetchGuildByName(name: string): Promise<Guild | null> {
  return apiFetch(`/gw2/guild/search?name=${name.toLocaleLowerCase()}`).then(parseResponse<Guild>);
}
