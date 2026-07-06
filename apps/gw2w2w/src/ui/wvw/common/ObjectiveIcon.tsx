'use client';

import type { WvWMatchObjective, WvWObjective } from '@repo/service-api/types';
import { isNil } from '@repo/utils';

import { useWvWObjectiveIcon } from '#lib/wvw/objectives';

interface ObjectiveIconProps {
  type: WvWObjective['type'];
  owner: WvWMatchObjective['owner'];
  size?: number;
  className?: string;
}

const ownerFilter: Record<WvWMatchObjective['owner'], string | undefined> = {
  Red: 'sepia(1) saturate(5) hue-rotate(310deg)',
  Blue: 'sepia(1) saturate(5) hue-rotate(180deg)',
  Green: 'sepia(1) saturate(5) hue-rotate(90deg)',
  Neutral: undefined,
};

export function ObjectiveIcon({ type, owner, size = 32, className }: ObjectiveIconProps) {
  const { data: iconUrl } = useWvWObjectiveIcon(type);

  if (isNil(iconUrl))
    return <span style={{ display: 'inline-block', width: size, height: size }} className={className} />;

  return (
    <img
      src={iconUrl}
      width={size}
      height={size}
      alt={`${owner} ${type}`}
      style={{ filter: ownerFilter[owner] }}
      className={className}
    />
  );
}
