import { apiFetch } from '@gw2w2w/lib/api/client';
import { parseResponse } from '@gw2w2w/lib/api/utils';
import { type WvWAbility } from '@service-api/lib/resources/wvw/abilities';

export function fetchWvwAbilities(): Promise<WvWAbility[] | null> {
  return apiFetch(`/gw2/wvw/abilities`).then(parseResponse<WvWAbility[]>);
}

export function fetchWvwAbility(id: number): Promise<WvWAbility | null> {
  return apiFetch(`/gw2/wvw/abilities/${id}`).then(parseResponse<WvWAbility>);
}
