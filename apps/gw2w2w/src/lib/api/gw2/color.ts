import { apiFetch } from '#lib/api/client';
import { parseResponse } from '#lib/api/utils';
import type { Color } from '@repo/service-api/types';

export function fetchAllColors(): Promise<Color[] | null> {
  return apiFetch('/gw2/color').then(parseResponse<Color[]>);
}
