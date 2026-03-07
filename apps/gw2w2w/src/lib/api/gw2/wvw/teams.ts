import { apiFetch } from '@gw2w2w/lib/api/client';

export function getWvwTeamRequest(teamId: string): Promise<Response> {
  return apiFetch(`/gw2/wvw/teams/team/${teamId}`);
}

export function getWvwTeamGuildsRequest(teamId: string): Promise<Response> {
  return apiFetch(`/gw2/wvw/guilds/team/${teamId}`);
}
