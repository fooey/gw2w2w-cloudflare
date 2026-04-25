import { apiFetch } from '#lib/api/client';
import { parseResponse } from '#lib/api/utils';
import type { WvWUpgrade } from '@repo/service-api/types';

export function fetchWvwUpgrades(): Promise<WvWUpgrade[] | null> {
  return apiFetch(`/gw2/wvw/upgrades`).then(parseResponse<WvWUpgrade[]>);
}

export function fetchWvwUpgrade(id: number): Promise<WvWUpgrade | null> {
  return apiFetch(`/gw2/wvw/upgrades/${id}`).then(parseResponse<WvWUpgrade>);
}
