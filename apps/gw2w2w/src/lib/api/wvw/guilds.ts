import type {
  GuildActivityMapType,
  GuildActivityObjectiveType,
  GuildActivityOwner,
  GuildActivityResponse,
  GuildActivitySortColumn,
} from '@repo/service-api/types';
import { isNonEmptyString, isPresent } from '@repo/utils';

import type { ServiceApiClient } from '#lib/api/api.client.ts';

export interface FetchWvwGuildsParams {
  matchId: string;
  sort?: GuildActivitySortColumn;
  order?: 'asc' | 'desc';
  maxAge?: number;
  mapType?: GuildActivityMapType[];
  objectiveType?: GuildActivityObjectiveType[];
  owner?: GuildActivityOwner[];
  limit?: number;
  page?: number;
}

export async function fetchWvwGuilds(
  api: ServiceApiClient,
  params: FetchWvwGuildsParams,
): Promise<GuildActivityResponse | null> {
  const res = await api.wvw.guilds.$get({
    query: {
      matchId: params.matchId,
      ...(isNonEmptyString(params.sort) && { sort: params.sort }),
      ...(isPresent(params.order) && { order: params.order }),
      ...(isPresent(params.maxAge) && { maxAge: String(params.maxAge) }),
      ...(isPresent(params.limit) && { limit: String(params.limit) }),
      ...(isPresent(params.page) && { page: String(params.page) }),
      ...(isPresent(params.mapType) && params.mapType.length > 0 && { mapType: params.mapType }),
      ...(isPresent(params.objectiveType) &&
        params.objectiveType.length > 0 && { objectiveType: params.objectiveType }),
      ...(isPresent(params.owner) && params.owner.length > 0 && { owner: params.owner }),
    },
  });
  if (!res.ok) return null;
  return res.json();
}
