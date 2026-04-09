'use client';

import { cn } from '@gw2w2w/lib/utils/cn';
import { ObjectiveIcon } from '@gw2w2w/ui/wvw/common/ObjectiveIcon';
import { type WvWTeam } from '@repo/service-api/definitions';
import { type WvWMatchObjective } from '@repo/service-api/lib/resources/wvw/matches';
import clsx from 'clsx';
import Link from 'next/link';
import { type Lang } from '../config/lang';
import { teamColorConfig } from '../config/teamColorConfig';

const OBJECTIVE_TYPES = ['Castle', 'Keep', 'Tower', 'Camp'] as const;

const placeBadgeConfig: Record<number, string> = {
  1: 'bg-yellow-400 text-yellow-900',
  2: 'bg-gray-300 text-gray-700 opacity-50',
  3: 'bg-amber-700 text-gray-100 opacity-30',
};

export interface TeamScoreProps {
  team: WvWTeam;
  color: keyof typeof teamColorConfig;
  place: number;
  score: number;
  objectives: WvWMatchObjective[];
  lang: Lang;
  isSelectedTeam: boolean;
}

export function TeamScore({ team, color, place, score, objectives, lang, isSelectedTeam }: TeamScoreProps) {
  const { bg, text } = teamColorConfig[color];

  const teamObjectives = objectives.filter((o) => o.owner === color);
  const countByType = (type: WvWMatchObjective['type']) => teamObjectives.filter((o) => o.type === type).length;

  return (
    <div className="flex flex-col justify-end">
      <Link
        className={clsx(bg, 'block overflow-hidden rounded-lg shadow-sm')}
        href={`/wvw/matchups/${encodeURIComponent(team[lang])}`}
      >
        <div className="flex flex-row">
          <div className={clsx(placeBadgeConfig[place], 'p-2 text-3xl leading-none font-extralight')}>{place}</div>
          <div className="flex flex-col gap-2 p-2 px-4">
            <p className={cn(text, 'truncate text-sm font-semibold', isSelectedTeam && 'text-2xl')}>{team[lang]}</p>
            <div className={clsx(text)}>
              <p className={cn('text-2xl font-semibold', isSelectedTeam && 'text-4xl')}>{score.toLocaleString()}</p>
            </div>
            <div className="flex flex-row gap-4">
              {OBJECTIVE_TYPES.map((type) => (
                <div key={type} className="flex items-center gap-1" title={type}>
                  <ObjectiveIcon type={type} owner={color} size={24} />
                  {countByType(type)}
                </div>
              ))}
            </div>
          </div>
        </div>
      </Link>
    </div>
  );
}
