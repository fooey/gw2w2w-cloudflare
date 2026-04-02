import { apiFetch } from '@gw2w2w/lib/api/client';
import { parseResponse } from '@gw2w2w/lib/api/utils';
import { type WvWGuild } from '@service-api/lib/resources/wvw/guilds';

export function fetchWvwGuild(guildId: string): Promise<WvWGuild | null> {
  return apiFetch(`/gw2/wvw/guilds/guild/${guildId}`).then(parseResponse<WvWGuild>);
}
