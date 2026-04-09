import { apiFetch } from '@gw2w2w/lib/api/client';
import { parseResponse } from '@gw2w2w/lib/api/utils';
import { type WvWUpgrade } from '@repo/service-api/lib/resources/wvw/upgrades';

export function fetchWvwUpgrades(): Promise<WvWUpgrade[] | null> {
  return apiFetch(`/gw2/wvw/upgrades`).then(parseResponse<WvWUpgrade[]>);
}

export function fetchWvwUpgrade(id: number): Promise<WvWUpgrade | null> {
  return apiFetch(`/gw2/wvw/upgrades/${id}`).then(parseResponse<WvWUpgrade>);
}
