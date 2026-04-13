import { fetchWvwMatchDirect } from '#lib/api/gw2/wvw/matches';
import { useObjectiveTracker } from '#lib/wvw/useObjectiveTracker';
import { withJitter } from '@repo/utils';
import { type WvWMatchStripped } from '@repo/service-api/types';
import { useQuery, type UseQueryOptions } from '@tanstack/react-query';

export type UseMatchResults = WvWMatchStripped | null;

export function useMatch(matchId: string, queryOptions: Partial<UseQueryOptions<UseMatchResults>>) {
  const query = useQuery<UseMatchResults>({
    queryKey: ['wvwMatch', matchId],
    queryFn: () => fetchWvwMatchDirect(matchId),
    refetchInterval: () => withJitter(6_000, 0.75),
    staleTime: 12_000,
    refetchOnWindowFocus: true,
    refetchIntervalInBackground: true,
    ...queryOptions,
  });
  useObjectiveTracker(query.data);
  return query;
}
