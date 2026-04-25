import { apiFetch } from '#lib/api/client';
import { parseResponse } from '#lib/api/utils';
import type { WvWRank } from '@repo/service-api/types';

export function fetchWvwRanks(): Promise<WvWRank[] | null> {
  return apiFetch(`/gw2/wvw/ranks`).then(parseResponse<WvWRank[]>);
}

export function fetchWvwRank(id: number): Promise<WvWRank | null> {
  return apiFetch(`/gw2/wvw/ranks/${id}`).then(parseResponse<WvWRank>);
}
