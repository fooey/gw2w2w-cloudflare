import { apiFetch } from '#lib/api/client';
import { parseResponse } from '#lib/api/utils';
import { type Guild, type WvWGuild, type WvWTeam } from '@repo/service-api/types';

export function fetchWvwTeam(teamId: string): Promise<WvWTeam | null> {
  return apiFetch(`/gw2/wvw/teams/team/${teamId}`).then(parseResponse<WvWTeam>);
}

export function fetchWvwTeamGuilds(teamId: string): Promise<WvWGuild[] | null> {
  return apiFetch(`/gw2/wvw/guilds/team/${teamId}`).then(parseResponse<WvWGuild[]>);
}

export function fetchWvwTeamGuildDetails(teamId: string): Promise<Guild[] | null> {
  return apiFetch(`/gw2/wvw/teams/team/${teamId}/guilds`).then(parseResponse<Guild[]>);
}
