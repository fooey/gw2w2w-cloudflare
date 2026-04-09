import { apiFetch } from '@gw2w2w/lib/api/client';
import { parseResponse } from '@gw2w2w/lib/api/utils';
import { type Emblem } from '@repo/service-api/lib/types';

export function fetchAllBackgrounds(): Promise<Emblem[] | null> {
  return apiFetch('/gw2/emblem/background').then(parseResponse<Emblem[]>);
}

export function fetchAllForegrounds(): Promise<Emblem[] | null> {
  return apiFetch('/gw2/emblem/foreground').then(parseResponse<Emblem[]>);
}
