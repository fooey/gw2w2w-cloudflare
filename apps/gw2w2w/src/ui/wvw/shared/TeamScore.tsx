'use client';

import type { WvWMatchObjective, WvWTeam } from '@repo/service-api/types';

import { cn } from '#lib/utils/cn';
import { Link } from '#ui/Link';
import { ObjectiveIcon } from '#ui/wvw/common/ObjectiveIcon';
import type { Lang } from '#ui/wvw/config/lang';
import { teamColorConfig } from '#ui/wvw/config/teamColorConfig';

const OBJECTIVE_TYPES = ['Castle', 'Keep', 'Tower', 'Camp'] as const;

const placeBadgeConfig: Record<number, string> = {
  1: 'bg-yellow-400 text-yellow-900',
  2: 'bg-slate-400 text-slate-900',
  3: 'bg-amber-800 text-amber-100',
};

export interface TeamScoreProps {
  team: WvWTeam;
  color: keyof typeof teamColorConfig;
  place: number;
  score: number;
  kills: number;
  deaths: number;
  objectives: WvWMatchObjective[];
  lang: Lang;
  isSelectedTeam: boolean;
}

export function TeamScore({
  team,
  color,
  place,
  score,
  kills,
  deaths,
  objectives,
  lang,
  isSelectedTeam,
}: TeamScoreProps) {
  const { bg, text } = teamColorConfig[color];

  const teamObjectives = objectives.filter((o) => o.owner === color);
  const countByType = (type: WvWMatchObjective['type']) => teamObjectives.filter((o) => o.type === type).length;
  const kdr = deaths > 0 ? (kills / deaths).toFixed(2) : kills > 0 ? '∞' : '—';

  return (
    <div className={cn('flex flex-col justify-end')}>
      <Link
        className={cn(bg, 'block overflow-hidden rounded-lg shadow-sm')}
        href={`/wvw/matchups/${encodeURIComponent(team[lang])}`}
      >
        <div className="flex flex-row transition-all duration-300 ease-in-out">
          <div className={cn(placeBadgeConfig[place], 'p-2 text-3xl leading-none font-extralight')}>{place}</div>
          <div className={cn('flex w-full min-w-0 flex-col gap-4 p-2 px-4')}>
            <p className={cn(text, 'truncate text-lg font-light', isSelectedTeam && 'text-3xl')}>{team[lang]}</p>
            <div className={cn(text, 'flex w-full flex-row items-center justify-between gap-1')}>
              <div className={cn(text)}>
                <p className={cn('text-2xl font-semibold tabular-nums', isSelectedTeam && 'text-4xl')}>
                  {score.toLocaleString()}
                </p>
              </div>
              <div className="flex flex-col items-end gap-1">
                <div className="flex flex-row gap-1">
                  {OBJECTIVE_TYPES.map((type) => (
                    <div key={type} className="flex items-center gap-1 text-xs" title={type}>
                      <ObjectiveIcon type={type} owner={color} size={16} />
                      {countByType(type)}
                    </div>
                  ))}
                </div>
                <div className={cn(text, 'flex flex-row items-center gap-1 text-xs tabular-nums')}>
                  <span title="Kills">{kills.toLocaleString()}</span>
                  <span className="opacity-50">/</span>
                  <span title="Deaths">{deaths.toLocaleString()}</span>
                  <span className="font-semibold" title="Kill/Death Ratio">
                    {kdr}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </Link>
    </div>
  );
}
