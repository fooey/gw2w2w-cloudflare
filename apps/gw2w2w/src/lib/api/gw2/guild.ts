import { apiFetch } from '@gw2w2w/lib/api/client';

export function getGuildRequest(guildId: string): Promise<Response> {
  return apiFetch(`/gw2/guild/${guildId}`);
}

export function searchGuildRequest(name: string): Promise<Response> {
  return apiFetch(`/gw2/guild/search?name=${name.toLocaleLowerCase()}`);
}
