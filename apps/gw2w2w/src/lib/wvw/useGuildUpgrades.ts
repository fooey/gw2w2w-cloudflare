import { fetchGuildUpgrades } from '#lib/api/gw2/guildUpgrades';
import { type GuildUpgrade } from '@repo/service-api/types';
import { useQuery, type UseQueryOptions } from '@tanstack/react-query';

export function useGuildUpgrades(
  ids: number[] | null | undefined,
  queryOptions?: Partial<UseQueryOptions<GuildUpgrade[] | null>>,
) {
  const key = ids?.slice().sort().join(',') ?? '';
  return useQuery<GuildUpgrade[] | null>({
    ...queryOptions,
    queryKey: ['guildUpgrades', key],
    queryFn: () => fetchGuildUpgrades(ids ?? []),
    enabled: !!ids && ids.length > 0,
    staleTime: Infinity,
  });
}
