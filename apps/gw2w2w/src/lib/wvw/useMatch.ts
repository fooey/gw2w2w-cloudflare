import { fetchWvwMatchDirect } from '@gw2w2w/lib/api/gw2/wvw/matches';
import { useObjectiveTracker } from '@gw2w2w/lib/wvw/useObjectiveTracker';
import { withJitter } from '@service-api/lib/resources/constants';
import { type WvWMatch } from '@service-api/lib/resources/wvw/matches';
import { useQuery, type UseQueryOptions } from '@tanstack/react-query';

export type UseMatchResults = WvWMatch | null;

export function useMatch(matchId: string, queryOptions: Partial<UseQueryOptions<UseMatchResults>>) {
  const query = useQuery<UseMatchResults>({
    queryKey: ['wvwMatch', matchId],
    queryFn: () => fetchWvwMatchDirect(matchId),
    refetchInterval: () => withJitter(6_000, 0.75),
    staleTime: 12_000,
    refetchOnWindowFocus: true,
    refetchIntervalInBackground: false,
    ...queryOptions,
  });
  useObjectiveTracker(query.data);
  return query;
}
