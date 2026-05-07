import { apiFetch } from '#lib/api/apiClient.ts';
import { parseResponse } from '#lib/api/utils';
import type { WvWMatch, WvWMatchStripped } from '@repo/service-api/types';

export function fetchWvwMatchesService(): Promise<WvWMatchStripped[] | null> {
  return apiFetch(`/wvw/matches`).then(parseResponse<WvWMatchStripped[]>);
}

export function fetchWvwMatches(): Promise<WvWMatch[] | null> {
  return apiFetch(`/gw2/wvw/matches`).then(parseResponse<WvWMatch[]>);
}

export function fetchWvwMatch(matchId: string): Promise<WvWMatch | null> {
  return apiFetch(`/gw2/wvw/matches/${matchId}`).then(parseResponse<WvWMatch>);
}

export function fetchWvwMatchByTeam(teamId: string): Promise<WvWMatch | null> {
  return apiFetch(`/gw2/wvw/matches/world/${teamId}`).then(parseResponse<WvWMatch>);
}
