import type { ServiceApiAppType } from '@repo/service-api';
import { type Color, type Emblem, type Guild } from '@repo/service-api/lib/types';
import { type Context } from 'hono';
import { hc, parseResponse } from 'hono/client';

export type ApiClient = ReturnType<typeof hc<ServiceApiAppType>>;

export function getApiClient(context: Context): ApiClient {
  return hc<ServiceApiAppType>('http://127.0.0.1:8788', {
    fetch: context.env.SERVICE_API.fetch.bind(context.env.SERVICE_API),
  });
}

export function getGuild(apiClient: ApiClient, guildId: string): Promise<Guild> {
  const guildApi = apiClient.api.guild[':guildId'];
  if (!guildApi) throw new Error('Guild API not available');
  return parseResponse(guildApi.$get({ param: { guildId } }));
}

export function searchGuild(apiClient: ApiClient, name: string): Promise<Guild> {
  const guildApi = apiClient.api.guild['search'];
  if (!guildApi) throw new Error('Guild API not available');
  return parseResponse(guildApi.$get({ query: { name } }));
}

export function getColor(apiClient: ApiClient, colorId: number): Promise<Color> {
  const colorApi = apiClient.api.color[':colorId'];
  if (!colorApi) throw new Error('Color API not available');
  return parseResponse(colorApi.$get({ param: { colorId } }));
}

export function getColors(apiClient: ApiClient, colorIds: number[]): Promise<Color[]> {
  return Promise.all(colorIds.map((id) => getColor(apiClient, id))).then((results) => results.flat());
}

export function getEmblem(apiClient: ApiClient, type: 'background' | 'foreground', emblemId: number): Promise<Emblem> {
  const emblemApi = apiClient.api.emblem[`${type}/:emblemId`];
  if (!emblemApi) throw new Error(`Emblem API not available`);
  return parseResponse(emblemApi.$get({ param: { emblemId } })).then(([result]) => result);
}
