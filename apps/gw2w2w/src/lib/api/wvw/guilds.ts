import type { ServiceApiClient } from '#lib/api/api.client.ts';
import type { GuildActivityResponse } from '@repo/service-api/types';
import { isPresent } from '@repo/utils';

export interface FetchWvwGuildsParams {
  matchId: string;
  sort?: string;
  order?: 'asc' | 'desc';
  maxAge?: number;
  mapType?: string[];
  objectiveType?: string[];
  owner?: string[];
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
      ...(params.sort && { sort: params.sort }),
      ...(params.order && { order: params.order }),
      ...(isPresent(params.maxAge) && { maxAge: String(params.maxAge) }),
      ...(isPresent(params.limit) && { limit: String(params.limit) }),
      ...(isPresent(params.page) && { page: String(params.page) }),
      ...(params.mapType?.length && { mapType: params.mapType }),
      ...(params.objectiveType?.length && { objectiveType: params.objectiveType }),
      ...(params.owner?.length && { owner: params.owner }),
    },
  });
  if (!res.ok) return null;
  return res.json();
}
