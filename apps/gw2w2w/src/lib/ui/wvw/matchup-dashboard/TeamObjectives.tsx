'use client';

import { ObjectiveIcon } from '@gw2w2w/lib/ui/wvw/common/ObjectiveIcon';
import { type WvWTeam } from '@service-api/definitions';
import { type WvWMatchObjective } from '@service-api/lib/resources/wvw/matches';
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

export interface TeamObjectivesProps {
  team: WvWTeam;
  color: keyof typeof teamColorConfig;
  place: number;
  score: number;
  objectives: WvWMatchObjective[];
  lang: Lang;
}

export function TeamObjectives({ team, color, place, score, objectives, lang }: TeamObjectivesProps) {
  const { bg, text } = teamColorConfig[color];

  const teamObjectives = objectives.filter((o) => o.owner === color);
  const countByType = (type: WvWMatchObjective['type']) => teamObjectives.filter((o) => o.type === type).length;

  return (
    <Link
      className={clsx(bg, 'overflow-hidden rounded-lg shadow-sm')}
      href={`/wvw/matchups/${encodeURIComponent(team[lang])}`}
    >
      <div className="flex flex-row">
        <div className={clsx(placeBadgeConfig[place], 'p-2 text-3xl leading-none font-extralight')}>{place}</div>
        <div className="flex flex-col gap-2 p-2 px-4">
          <p className={clsx(text, 'truncate font-semibold')}>{team[lang]}</p>
          <div className={clsx(text)}>
            <p className="text-4xl font-semibold">{score.toLocaleString()}</p>
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
  );
}
