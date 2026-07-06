import { useQuery, type UseQueryOptions } from '@tanstack/react-query';

import type { Guild } from '@repo/service-api/types';
import { isEmpty } from '@repo/utils';

import { getClientApi } from '#lib/api/api.client.ts';
import { fetchGuild } from '#lib/api/gw2/guild';

export type UseGuildResult = Guild | null;

export function useGuild(guildId: string | null | undefined, queryOptions?: Partial<UseQueryOptions<UseGuildResult>>) {
  return useQuery<UseGuildResult>({
    queryKey: ['guild', guildId],
    queryFn: async () => {
      if (isEmpty(guildId)) throw new Error('guildId is required');
      return fetchGuild(getClientApi(), guildId);
    },
    enabled: !isEmpty(guildId),
    staleTime: 5 * 60_000,
    refetchOnWindowFocus: false,
    refetchIntervalInBackground: false,
    ...queryOptions,
  });
}
