import type { ServiceApiClient } from '#lib/api/api.client.ts';

export async function fetchWvwMatches(api: ServiceApiClient) {
  const res = await api.wvw.matches.$get();
  if (!res.ok) return null;
  return res.json();
}

export async function fetchWvwMatch(api: ServiceApiClient, matchId: string) {
  const res = await api.wvw.matches[':id'].$get({ param: { id: matchId } });
  if (!res.ok) return null;
  return res.json();
}

export async function fetchWvwMatchByTeam(api: ServiceApiClient, teamId: string) {
  const res = await api.wvw.matches.world[':worldId'].$get({ param: { worldId: teamId } });
  if (!res.ok) return null;
  return res.json();
}
