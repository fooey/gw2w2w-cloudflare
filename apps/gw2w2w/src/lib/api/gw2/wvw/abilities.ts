import { apiFetch } from '#lib/api/client';
import { parseResponse } from '#lib/api/utils';
import { type WvWAbility } from '@repo/service-api/types';

export function fetchWvwAbilities(): Promise<WvWAbility[] | null> {
  return apiFetch(`/gw2/wvw/abilities`).then(parseResponse<WvWAbility[]>);
}

export function fetchWvwAbility(id: number): Promise<WvWAbility | null> {
  return apiFetch(`/gw2/wvw/abilities/${id}`).then(parseResponse<WvWAbility>);
}
