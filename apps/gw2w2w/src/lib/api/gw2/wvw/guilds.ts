import { apiFetch } from '@gw2w2w/lib/api/client';

export function getWvwGuildRequest(guildId: string): Promise<Response> {
  return apiFetch(`/gw2/wvw/guilds/guild/${guildId}`);
}
