import { cn } from '#lib/utils/cn';
import type { WvWUpgrade, WvWUpgradeTier } from '@repo/service-api/types';
import { isPresent } from '@repo/utils';
import { getEtaDisplay, TIER_CLASS, TIER_ROMAN } from './utils';

interface ObjectiveDialogTierProgressProps {
  upgrade: WvWUpgrade;
  currentTier: number;
  remainingTiers: WvWUpgradeTier[];
  isFullyUpgraded: boolean;
  yaksDelivered: number;
  lastFlipped: string | null | undefined;
  now: Temporal.Instant | null;
}

export function ObjectiveDialogTierProgress({
  upgrade,
  currentTier,
  remainingTiers,
  isFullyUpgraded,
  yaksDelivered,
  lastFlipped,
  now,
}: ObjectiveDialogTierProgressProps) {
  return (
    <div className="mb-4">
      <div className="mb-2 flex items-center gap-2">
        {currentTier > 0 ? (
          <span className={cn('rounded px-2 py-0.5 text-sm font-semibold', TIER_CLASS[currentTier])}>
            Tier {TIER_ROMAN[currentTier]}: {upgrade.tiers[currentTier - 1]?.name}
          </span>
        ) : (
          <span className="rounded bg-gray-100 px-2 py-0.5 text-sm text-gray-500">No upgrades yet</span>
        )}
        {!isFullyUpgraded && <span className="text-sm text-gray-500">{yaksDelivered} yaks delivered</span>}
      </div>

      {isFullyUpgraded ? (
        <p className="text-sm font-medium text-green-700">Fully upgraded</p>
      ) : (
        <div className="flex flex-col gap-3">
          {remainingTiers.map((tier, i) => {
            const tierIndex = currentTier + i;
            const eta = getEtaDisplay(tier.yaks_required, yaksDelivered, lastFlipped, now);
            return (
              <div key={tier.name}>
                <div className="mb-1 flex justify-between text-xs text-gray-400">
                  <span>
                    Tier {TIER_ROMAN[tierIndex + 1]}: {tier.name}
                  </span>
                  <span>
                    {yaksDelivered} / {tier.yaks_required}
                  </span>
                </div>
                <div className="h-1.5 w-full overflow-hidden rounded-full bg-gray-200">
                  <div
                    className="h-full rounded-full bg-green-500"
                    style={{
                      width: `${Math.min(100, (yaksDelivered / tier.yaks_required) * 100).toFixed(1)}%`,
                    }}
                  />
                </div>
                {isPresent(eta) && <p className="mt-1 text-right text-xs text-gray-400">ETA {eta}</p>}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
