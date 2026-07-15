import type { WvWMatch } from '@repo/service-api/types';

import type { ServiceApiClient } from '#lib/api/api.client.ts';

export type WvwMatchLookupResult =
  | { status: 'ok'; match: WvWMatch }
  | { status: 'not_found' }
  | { status: 'unavailable'; retryAfterSeconds: number | null };

export function interpretErrorStatus(status: number, headers: Headers): WvwMatchLookupResult {
  if (status !== 503) return { status: 'not_found' };
  const retryAfter = headers.get('Retry-After');
  const retryAfterSeconds = retryAfter === null ? null : Number(retryAfter);
  return {
    status: 'unavailable',
    retryAfterSeconds: retryAfterSeconds !== null && Number.isFinite(retryAfterSeconds) ? retryAfterSeconds : null,
  };
}

export async function fetchWvwMatches(api: ServiceApiClient) {
  const res = await api.wvw.matches.$get();
  if (!res.ok) return null;
  return res.json();
}

export async function fetchWvwMatch(api: ServiceApiClient, matchId: string): Promise<WvwMatchLookupResult> {
  const res = await api.wvw.matches[':id'].$get({ param: { id: matchId } });
  if (res.ok) return { status: 'ok', match: await res.json() };
  return interpretErrorStatus(res.status, res.headers);
}

export async function fetchWvwMatchByTeam(api: ServiceApiClient, teamId: string): Promise<WvwMatchLookupResult> {
  const res = await api.wvw.matches.world[':worldId'].$get({ param: { worldId: teamId } });
  if (res.ok) return { status: 'ok', match: await res.json() };
  return interpretErrorStatus(res.status, res.headers);
}
