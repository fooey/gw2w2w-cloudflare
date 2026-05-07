import { getApi } from '#lib/api/api.server.ts';

export async function fetchWvwMatchesService() {
  const api = await getApi();
  const res = await api.wvw.matches.$get();
  return res.json();
}

export async function fetchWvwMatches() {
  const api = await getApi();
  const res = await api.gw2.wvw.matches.$get();
  return res.json();
}

export async function fetchWvwMatch(matchId: string) {
  const api = await getApi();
  const res = await api.gw2.wvw.matches[':id'].$get({ param: { id: matchId } });
  if (!res.ok) return null;
  return res.json();
}

export async function fetchWvwMatchByTeam(teamId: string) {
  const api = await getApi();
  const res = await api.gw2.wvw.matches.world[':worldId'].$get({ param: { worldId: teamId } });
  if (!res.ok) return null;
  return res.json();
}
