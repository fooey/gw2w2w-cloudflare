import { apiFetch } from '#lib/api/client';
import { parseResponse } from '#lib/api/utils';
import type { GuildUpgrade } from '@repo/service-api/types';

export function fetchGuildUpgrades(ids: number[]): Promise<GuildUpgrade[] | null> {
  if (ids.length === 0) {
    return Promise.resolve([]);
  }
  return apiFetch(`/gw2/guild/upgrades?ids=${ids.join(',')}`).then(parseResponse<GuildUpgrade[]>);
}
