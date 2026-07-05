import { isNil } from '@repo/utils';

const TIER_LABEL: Record<number, string> = {
  1: 'Ⅰ',
  2: 'Ⅱ',
  3: 'Ⅲ',
};

// Bronze → Silver → Gold to evoke progression
const TIER_CLASS: Record<number, string> = {
  1: 'bg-amber-800 text-amber-100',
  2: 'bg-slate-400 text-slate-900',
  3: 'bg-yellow-400 text-yellow-900',
};

interface UpgradeTierProps {
  tier: number; // 1 | 2 | 3
}

/**
 * Small badge overlaid on an objective icon showing its upgrade tier.
 * Must be rendered inside a `relative` container.
 */
export function UpgradeTier({ tier }: UpgradeTierProps) {
  const label = TIER_LABEL[tier];
  const cls = TIER_CLASS[tier];
  if (isNil(label) || isNil(cls)) return null;

  return (
    <span
      className={`absolute -right-0.5 -bottom-0.5 flex h-3 w-3 items-center justify-center rounded-sm text-[7px] leading-none font-bold ${cls}`}
      aria-label={`Tier ${tier.toString()}`}
    >
      {label}
    </span>
  );
}
