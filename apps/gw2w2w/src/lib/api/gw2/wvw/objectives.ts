import { apiFetch } from '#lib/api/client';
import { parseResponse } from '#lib/api/utils';
import { type WvWObjective } from '@repo/service-api/types';

export function fetchWvwObjectives(): Promise<WvWObjective[] | null> {
  return apiFetch(`/gw2/wvw/objectives`).then(parseResponse<WvWObjective[]>);
}

export function fetchWvwObjective(id: string): Promise<WvWObjective | null> {
  return apiFetch(`/gw2/wvw/objectives/${id}`).then(parseResponse<WvWObjective>);
}
