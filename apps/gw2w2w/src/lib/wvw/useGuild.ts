import { fetchGuildDirect } from '#lib/api/gw2/guild';
import { type Guild } from '@repo/service-api/types';
import { useQuery, type UseQueryOptions } from '@tanstack/react-query';

export type UseGuildResult = Guild | null;

export function useGuild(guildId: string | null | undefined, queryOptions?: Partial<UseQueryOptions<UseGuildResult>>) {
  return useQuery<UseGuildResult>({
    queryKey: ['guild', guildId],
    queryFn: () => {
      if (!guildId) throw new Error('guildId is required');
      return fetchGuildDirect(guildId);
    },
    enabled: !!guildId,
    staleTime: 5 * 60_000,
    refetchOnWindowFocus: false,
    refetchIntervalInBackground: false,
    ...queryOptions,
  });
}
