import { apiFetch } from '@gw2w2w/lib/api/client';
import { parseResponse } from '@gw2w2w/lib/api/utils';
import { type WvWMatch } from '@service-api/lib/resources/wvw/matches';

const matchUrl = 'https://api.guildwars2.com/v2/wvw/matches';

export function fetchWvwMatches(): Promise<WvWMatch[] | null> {
  return apiFetch(`/gw2/wvw/matches`).then(parseResponse<WvWMatch[]>);
}

export function fetchWvwMatch(matchId: string): Promise<WvWMatch | null> {
  return apiFetch(`/gw2/wvw/matches/${matchId}`).then(parseResponse<WvWMatch>);
}

export function fetchWvwMatchesDirect(): Promise<WvWMatch[] | null> {
  return fetch(`${matchUrl}?ids=all`).then(parseResponse<WvWMatch[]>);
}

export function fetchWvwMatchDirect(matchId: string): Promise<WvWMatch | null> {
  return fetch(`${matchUrl}/${matchId}`).then(parseResponse<WvWMatch>);
}

export function fetchWvwMatchByTeam(teamId: string): Promise<WvWMatch | null> {
  return apiFetch(`/gw2/wvw/matches/world/${teamId}`).then(parseResponse<WvWMatch>);
}
