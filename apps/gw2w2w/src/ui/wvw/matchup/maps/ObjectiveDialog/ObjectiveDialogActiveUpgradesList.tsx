import type { WvWUpgrade } from '@repo/service-api/types';

import { TIER_ROMAN } from './utils';

interface ObjectiveDialogActiveUpgradesListProps {
  upgrade: WvWUpgrade;
  currentTier: number;
}

export function ObjectiveDialogActiveUpgradesList({ upgrade, currentTier }: ObjectiveDialogActiveUpgradesListProps) {
  return (
    <div className="flex flex-col gap-4">
      <h3 className="text-xs font-semibold tracking-wide text-gray-400 uppercase">Active Upgrades</h3>
      {upgrade.tiers.slice(0, currentTier).map((tier, i) => (
        <div key={tier.name}>
          <p className="mb-2 text-xs font-semibold text-gray-500">
            Tier {TIER_ROMAN[i + 1]}: {tier.name}
          </p>
          <ul className="flex flex-col gap-2">
            {tier.upgrades.map((effect) => (
              <li key={effect.name} className="flex items-start gap-2">
                <img src={effect.icon} alt={effect.name} width={24} height={24} className="mt-0.5 shrink-0 rounded" />
                <div className="min-w-0">
                  <p className="text-sm font-medium text-gray-800">{effect.name}</p>
                  <p className="text-xs text-gray-500">{effect.description}</p>
                </div>
              </li>
            ))}
          </ul>
        </div>
      ))}
    </div>
  );
}
