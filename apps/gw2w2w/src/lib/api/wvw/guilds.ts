import { GW2W2W_API_BASE } from '#lib/api/constants.ts';
import type { GuildActivityResponse } from '@repo/service-api/types';

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

export async function fetchWvwGuilds(params: FetchWvwGuildsParams): Promise<GuildActivityResponse | null> {
  const qs = new URLSearchParams();
  qs.set('matchId', params.matchId);
  if (params.sort) qs.set('sort', params.sort);
  if (params.order) qs.set('order', params.order);
  if (params.maxAge != null) qs.set('maxAge', String(params.maxAge));
  if (params.limit != null) qs.set('limit', String(params.limit));
  if (params.page != null) qs.set('page', String(params.page));
  for (const v of params.mapType ?? []) qs.append('mapType', v);
  for (const v of params.objectiveType ?? []) qs.append('objectiveType', v);
  for (const v of params.owner ?? []) qs.append('owner', v);

  const res = await fetch(`${GW2W2W_API_BASE}/wvw/guilds?${qs.toString()}`);
  if (!res.ok) return null;
  return res.json();
}
