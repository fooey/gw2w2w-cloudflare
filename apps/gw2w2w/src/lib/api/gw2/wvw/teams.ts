import { apiFetch } from '@gw2w2w/lib/api/client';
import { parseResponse } from '@gw2w2w/lib/api/utils';
import { type WvWTeam } from '@service-api/definitions/wvw-teams';
import { type WvWGuild } from '@service-api/lib/resources/wvw/guilds';
import { type Guild } from '@service-api/lib/types';

export function fetchWvwTeam(teamId: string): Promise<WvWTeam | null> {
  return apiFetch(`/gw2/wvw/teams/team/${teamId}`).then(parseResponse<WvWTeam>);
}

export function fetchWvwTeamGuilds(teamId: string): Promise<WvWGuild[] | null> {
  return apiFetch(`/gw2/wvw/guilds/team/${teamId}`).then(parseResponse<WvWGuild[]>);
}

export function fetchWvwTeamGuildDetails(teamId: string): Promise<Guild[] | null> {
  return apiFetch(`/gw2/wvw/teams/team/${teamId}/guilds`).then(parseResponse<Guild[]>);
}
