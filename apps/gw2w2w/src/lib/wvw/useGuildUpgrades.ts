import { useQuery, type UseQueryOptions } from '@tanstack/react-query';

import type { GuildUpgrade } from '@repo/service-api/types';

import { getClientApi } from '#lib/api/api.client.ts';
import { fetchGuildUpgrades } from '#lib/api/gw2/guildUpgrades';

export function useGuildUpgrades(
  ids: number[] | null | undefined,
  queryOptions?: Partial<UseQueryOptions<GuildUpgrade[] | null>>,
) {
  const uniqueIds = ids ? [...new Set(ids)].toSorted((a, b) => a - b) : [];
  const key = uniqueIds.join(',');

  return useQuery<GuildUpgrade[] | null>({
    queryKey: ['guildUpgrades', key],
    queryFn: async () => fetchGuildUpgrades(getClientApi(), uniqueIds),
    enabled: uniqueIds.length > 0,
    staleTime: Infinity,
    ...queryOptions,
  });
}
