import { apiFetch } from '@gw2w2w/lib/api/client';
import { parseResponse } from '@gw2w2w/lib/api/utils';
import { type Color } from '@repo/service-api/lib/types';

export function fetchAllColors(): Promise<Color[] | null> {
  return apiFetch('/gw2/color').then(parseResponse<Color[]>);
}
