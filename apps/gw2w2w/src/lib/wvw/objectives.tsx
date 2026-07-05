import { getClientApi } from '#lib/api/api.client.ts';
import { fetchWvwObjectives } from '#lib/api/gw2/wvw/objectives';
import type { WvWObjective } from '@repo/service-api/types';
import { useQuery, type UseQueryOptions } from '@tanstack/react-query';

type WvwObjectivesQueryOptions = Partial<
  Omit<UseQueryOptions<WvWObjective[] | null>, 'queryKey' | 'queryFn' | 'staleTime'>
>;

export function useWvwObjectives(queryOptions?: WvwObjectivesQueryOptions) {
  return useQuery({
    ...queryOptions,
    queryKey: ['wvwObjectives'],
    queryFn: async () => fetchWvwObjectives(getClientApi()),
    staleTime: Infinity,
  });
}

export function useWvwObjective(objectiveId: string, queryOptions?: Omit<WvwObjectivesQueryOptions, 'select'>) {
  return useQuery({
    ...queryOptions,
    queryKey: ['wvwObjectives'],
    queryFn: async () => fetchWvwObjectives(getClientApi()),
    staleTime: Infinity,
    select: (data) => data?.find((obj) => obj.id === objectiveId) ?? null,
  });
}

export function useWvWObjectiveIcon(
  type: WvWObjective['type'],
  queryOptions?: Omit<WvwObjectivesQueryOptions, 'select'>,
) {
  return useQuery({
    ...queryOptions,
    queryKey: ['wvwObjectives'],
    queryFn: async () => fetchWvwObjectives(getClientApi()),
    staleTime: Infinity,
    select: (data) => data?.find((obj) => obj.type === type && obj.map_type !== 'EdgeOfTheMists')?.marker,
  });
}
