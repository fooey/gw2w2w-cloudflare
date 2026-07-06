import { useQuery, type UseQueryOptions } from '@tanstack/react-query';

import type { WvWUpgrade } from '@repo/service-api/types';
import { isNil } from '@repo/utils';

import { getClientApi } from '#lib/api/api.client.ts';
import { fetchWvwUpgrades } from '#lib/api/gw2/wvw/upgrades';

type WvwUpgradesQueryOptions = Partial<
  Omit<UseQueryOptions<WvWUpgrade[] | null>, 'queryKey' | 'queryFn' | 'staleTime'>
>;

export function useWvwUpgrades(queryOptions?: WvwUpgradesQueryOptions) {
  return useQuery({
    ...queryOptions,
    queryKey: ['wvwUpgrades'],
    queryFn: async () => fetchWvwUpgrades(getClientApi()),
    staleTime: Infinity,
  });
}

/**
 * Returns a Map<upgradeId, yaks_required[]> — one threshold per tier in ascending order.
 * Computed once from the cached array via `select`; all subscribers share the same reference.
 */
function useWvwUpgradesMap() {
  return useQuery({
    queryKey: ['wvwUpgrades'],
    queryFn: async () => fetchWvwUpgrades(getClientApi()),
    staleTime: Infinity,
    select: (data): Map<number, number[]> => {
      const map = new Map<number, number[]>();
      for (const upgrade of data) {
        map.set(
          upgrade.id,
          upgrade.tiers.map((t) => t.yaks_required),
        );
      }
      return map;
    },
  });
}

/**
 * Returns the upgrade tier (1–3) reached for a given upgrade + yak count,
 * or null if the objective has no upgrade or no yaks have been delivered.
 *
 * Tier mapping: 1 = Secured, 2 = Reinforced, 3 = Fortified
 */
export function useWvwUpgradeTier(upgradeId: number | undefined, yaksDelivered: number | undefined): number | null {
  const { data: upgradesMap } = useWvwUpgradesMap();

  if (isNil(upgradeId) || isNil(yaksDelivered) || !upgradesMap) return null;

  const thresholds = upgradesMap.get(upgradeId);
  if (!thresholds) return null;

  const tier = thresholds.filter((required) => yaksDelivered >= required).length;
  return tier > 0 ? tier : null;
}
