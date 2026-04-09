'use client';

import { ObjectiveIcon } from '#ui/wvw/common/ObjectiveIcon';
import { type ObjectivesLayoutMap } from '#ui/wvw/config/objectivesLayoutConfig';
import { TEAM_COLORS, teamColorConfig } from '#ui/wvw/config/teamColorConfig';
import { MatchObjectiveRow } from '#ui/wvw/matchup/MatchObjectiveRow';
import { type WvWMatchMap, type WvWMatchObjective, type WvWObjective } from '@repo/service-api/types';
import clsx from 'clsx';

const mapTypeBorderClass: Record<string, string> = {
  Center: 'border-gray-300',
  GreenHome: 'border-green-500',
  BlueHome: 'border-blue-500',
  RedHome: 'border-red-500',
};

const colorScoreKey = { Green: 'green', Blue: 'blue', Red: 'red' } as const;

const SCOREBOARD_TYPES_CENTER = ['Castle', 'Keep', 'Tower', 'Camp'] as const;
const SCOREBOARD_TYPES_BL = ['Keep', 'Tower', 'Camp'] as const;

const VISIBLE_OBJECTIVE_TYPES: readonly WvWObjective['type'][] = ['Castle', 'Keep', 'Camp', 'Tower'] as const;

export function MatchMap({ map, layout }: { map: WvWMatchMap; layout: ObjectivesLayoutMap }) {
  const objectivesById = new Map<string, WvWMatchObjective>();
  for (const obj of map.objectives) {
    if (VISIBLE_OBJECTIVE_TYPES.includes(obj.type)) {
      const id = obj.id.split('-')[1];
      if (id) objectivesById.set(id, obj);
    }
  }

  const border = mapTypeBorderClass[map.type] ?? 'border-gray-300';
  const scoreboardTypes = map.type === 'Center' ? SCOREBOARD_TYPES_CENTER : SCOREBOARD_TYPES_BL;

  return (
    <li key={map.id} className="shrink-0 grow">
      <section className={clsx('rounded border py-2 shadow', border)}>
        <header className="flex flex-col gap-0.5 p-2 pt-0">
          {[...TEAM_COLORS]
            .map((color) => ({
              color,
              score: map.scores[colorScoreKey[color]],
              objectives: map.objectives.filter((o) => o.owner === color),
            }))
            .map(({ color, score, objectives }) => {
              const { bg, text } = teamColorConfig[color];
              const countByType = (type: WvWMatchObjective['type']) => objectives.filter((o) => o.type === type).length;
              return (
                <div key={color} className={clsx(bg, 'flex flex-1 flex-row items-center gap-2 rounded p-2')}>
                  <p className={clsx(text, 'text-lg leading-none font-semibold')}>{score.toLocaleString()}</p>
                  <div className="ml-auto flex flex-row gap-2">
                    {scoreboardTypes.map((type) => (
                      <div key={type} className="flex items-center gap-0.5" title={type}>
                        <ObjectiveIcon type={type} owner={color} size={16} />
                        <span className={clsx(text, 'text-xs')}>{countByType(type)}</span>
                      </div>
                    ))}
                  </div>
                </div>
              );
            })}
        </header>
        <div className="flex flex-col gap-4">
          {Object.entries(layout).map(([sectionName, sectionLayout]) => {
            return (
              <div key={sectionName} className="flex flex-col gap-1">
                {sectionLayout.objectives.map((obj) => {
                  const matchObj = objectivesById.get(obj.id);
                  if (!matchObj) return null;
                  return (
                    <MatchObjectiveRow
                      key={`${matchObj.id}:${matchObj.last_flipped}`}
                      matchObjective={matchObj}
                      direction={obj.direction}
                    />
                  );
                })}
              </div>
            );
          })}
        </div>
      </section>
    </li>
  );
}
