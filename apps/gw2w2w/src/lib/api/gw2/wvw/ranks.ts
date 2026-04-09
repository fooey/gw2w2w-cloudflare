import { apiFetch } from '@gw2w2w/lib/api/client';
import { parseResponse } from '@gw2w2w/lib/api/utils';
import { type WvWRank } from '@repo/service-api/lib/resources/wvw/ranks';

export function fetchWvwRanks(): Promise<WvWRank[] | null> {
  return apiFetch(`/gw2/wvw/ranks`).then(parseResponse<WvWRank[]>);
}

export function fetchWvwRank(id: number): Promise<WvWRank | null> {
  return apiFetch(`/gw2/wvw/ranks/${id}`).then(parseResponse<WvWRank>);
}
