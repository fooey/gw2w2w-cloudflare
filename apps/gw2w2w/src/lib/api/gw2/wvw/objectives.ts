import { apiFetch } from '@gw2w2w/lib/api/client';
import { parseResponse } from '@gw2w2w/lib/api/utils';
import { type WvWObjective } from '@repo/service-api/lib/resources/wvw/objectives';

export function fetchWvwObjectives(): Promise<WvWObjective[] | null> {
  return apiFetch(`/gw2/wvw/objectives`).then(parseResponse<WvWObjective[]>);
}

export function fetchWvwObjective(id: string): Promise<WvWObjective | null> {
  return apiFetch(`/gw2/wvw/objectives/${id}`).then(parseResponse<WvWObjective>);
}
