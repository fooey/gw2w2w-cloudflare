import { apiFetch, GW2_API_BASE } from '@gw2w2w/lib/api/client';
import { parseResponse } from '@gw2w2w/lib/api/utils';
import { type WvWMatch } from '@repo/service-api/lib/resources/wvw/matches';

export function fetchWvwMatches(): Promise<WvWMatch[] | null> {
  return apiFetch(`/gw2/wvw/matches`).then(parseResponse<WvWMatch[]>);
}

export function fetchWvwMatch(matchId: string): Promise<WvWMatch | null> {
  return apiFetch(`/gw2/wvw/matches/${matchId}`).then(parseResponse<WvWMatch>);
}

export function fetchWvwMatchesDirect(): Promise<WvWMatch[] | null> {
  return fetch(`${GW2_API_BASE}/wvw/matches?ids=all`, { cache: 'no-store' }).then(parseResponse<WvWMatch[]>);
}

export function fetchWvwMatchDirect(matchId: string): Promise<WvWMatch | null> {
  return fetch(`${GW2_API_BASE}/wvw/matches/${matchId}`, { cache: 'no-store' }).then(parseResponse<WvWMatch>);
}

export function fetchWvwMatchByTeam(teamId: string): Promise<WvWMatch | null> {
  return apiFetch(`/gw2/wvw/matches/world/${teamId}`).then(parseResponse<WvWMatch>);
}
