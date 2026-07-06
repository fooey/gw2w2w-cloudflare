import clsx from 'clsx';

import type { WvWMatchObjective } from '@repo/service-api/types';

import { ObjectiveIcon } from '#ui/wvw/common/ObjectiveIcon';
import { teamColorConfig } from '#ui/wvw/config/teamColorConfig';

type ObjectiveType = 'Castle' | 'Keep' | 'Tower' | 'Camp';

export interface MatchMapTeamScoreProps {
  color: keyof typeof teamColorConfig;
  score: number;
  kills: number;
  deaths: number;
  objectives: WvWMatchObjective[];
  visibleObjectiveTypes: readonly ObjectiveType[];
}

export function MatchMapTeamScore({
  color,
  score,
  kills,
  deaths,
  objectives,
  visibleObjectiveTypes,
}: MatchMapTeamScoreProps) {
  const { bg, text } = teamColorConfig[color];
  const countByType = (type: WvWMatchObjective['type']) => objectives.filter((o) => o.type === type).length;
  const kdr = deaths > 0 ? (kills / deaths).toFixed(2) : kills > 0 ? '∞' : '—';

  return (
    <div className={clsx(bg, 'col-span-2 grid grid-cols-subgrid items-center gap-x-3 p-2')}>
      {/* Score */}
      <p className={clsx(text, 'text-right text-2xl leading-none font-light tabular-nums')}>{score.toLocaleString()}</p>

      <div className={clsx(text, 'flex flex-col justify-end gap-1')}>
        {/* Objective counts */}
        <div className="flex flex-row justify-end gap-2">
          {visibleObjectiveTypes.map((type) => (
            <div key={type} className="flex items-center gap-0.5" title={type}>
              <ObjectiveIcon type={type} owner={color} size={16} />
              <span className={clsx(text, 'text-xs')}>{countByType(type)}</span>
            </div>
          ))}
        </div>

        <div className={clsx(text, 'flex flex-row items-center justify-end gap-1 text-xs tabular-nums')}>
          {/* Kills / Deaths */}
          <span title="Kills">{kills.toLocaleString()}</span>
          <span className="opacity-50">/</span>
          <span title="Deaths">{deaths.toLocaleString()}</span>
          {/* KDR */}
          <span className={clsx(text, 'text-right text-xs font-semibold tabular-nums')} title="Kill/Death Ratio">
            {kdr}
          </span>
        </div>
      </div>
    </div>
  );
}
