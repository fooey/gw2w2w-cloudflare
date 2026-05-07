import { apiFetch } from '#lib/api/apiClient.ts';
import { parseResponse } from '#lib/api/utils';
import type { Emblem } from '@repo/service-api/types';

export function fetchAllBackgrounds(): Promise<Emblem[] | null> {
  return apiFetch('/gw2/emblem/background').then(parseResponse<Emblem[]>);
}

export function fetchAllForegrounds(): Promise<Emblem[] | null> {
  return apiFetch('/gw2/emblem/foreground').then(parseResponse<Emblem[]>);
}
