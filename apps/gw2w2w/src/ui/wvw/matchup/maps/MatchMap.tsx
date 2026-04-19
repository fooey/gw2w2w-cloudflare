'use client';

import { type ObjectivesLayoutMap } from '#ui/wvw/config/objectivesLayoutConfig';
import { TEAM_COLORS } from '#ui/wvw/config/teamColorConfig';
import { MatchMapTeamScore } from '#ui/wvw/matchup/maps/MatchMapTeamScore';
import { MatchObjectiveRow } from '#ui/wvw/matchup/maps/MatchObjectiveRow';
import { type WvWMatchMap, type WvWMatchObjective, type WvWObjective } from '@repo/service-api/types';
import clsx from 'clsx';

const mapTypeBorderClass: Record<string, string> = {
  Center: 'border-gray-300',
  GreenHome: 'border-green-500',
  BlueHome: 'border-blue-500',
  RedHome: 'border-red-500',
};

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
  const objectivesByOwner = {
    Green: [] as WvWMatchObjective[],
    Blue: [] as WvWMatchObjective[],
    Red: [] as WvWMatchObjective[],
  };
  for (const obj of map.objectives) {
    if (obj.owner !== 'Neutral') objectivesByOwner[obj.owner].push(obj);
  }

  return (
    <li key={map.id} className="shrink-0 grow">
      <section className={clsx('rounded border py-2 shadow', border)}>
        <header className="grid grid-cols-[auto_1fr] gap-y-0.5 p-2 pt-0">
          {TEAM_COLORS.map((color) => {
            const c = color.toLowerCase() as 'green' | 'blue' | 'red';
            return (
              <MatchMapTeamScore
                key={color}
                color={color}
                score={map.scores[c]}
                kills={map.kills[c]}
                deaths={map.deaths[c]}
                objectives={objectivesByOwner[color]}
                visibleObjectiveTypes={scoreboardTypes}
              />
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
