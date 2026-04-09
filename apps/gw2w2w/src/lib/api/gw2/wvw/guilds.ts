import { apiFetch } from '#lib/api/client';
import { parseResponse } from '#lib/api/utils';
import { type WvWGuild } from '@repo/service-api/types';

export function fetchWvwGuild(guildId: string): Promise<WvWGuild | null> {
  return apiFetch(`/gw2/wvw/guilds/guild/${guildId}`).then(parseResponse<WvWGuild>);
}
