import { apiFetch } from '@gw2w2w/lib/api/client';
import { parseResponse } from '@gw2w2w/lib/api/utils';
import type { Emblem } from '@service-api/lib/types';

export function getAllBackgroundsRequest(): Promise<Emblem[] | null> {
  return apiFetch('/gw2/emblem/background').then(parseResponse<Emblem[]>);
}

export function getAllForegroundsRequest(): Promise<Emblem[] | null> {
  return apiFetch('/gw2/emblem/foreground').then(parseResponse<Emblem[]>);
}
