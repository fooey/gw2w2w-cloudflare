'use client';

import { WVW_TEAMS, type WvWTeamId } from '@service-api/definitions';
import { type WvWMatch } from '@service-api/lib/resources/wvw/matches';
import { keyBy, sortBy } from 'lodash-es';
import Link from 'next/link';
import { type Lang } from '../config/lang';
import { TEAM_COLORS } from '../config/teamColorConfig';
import { TeamObjectives } from './TeamObjectives';

export function MatchupRow({ match, lang }: { match: WvWMatch; lang: Lang }) {
  const redId = match.all_worlds.red.find((id) => id > 10_000)?.toString() as WvWTeamId | undefined;
  const blueId = match.all_worlds.blue.find((id) => id > 10_000)?.toString() as WvWTeamId | undefined;
  const greenId = match.all_worlds.green.find((id) => id > 10_000)?.toString() as WvWTeamId | undefined;

  if (!redId || !blueId || !greenId) return null;

  const teamIds: Record<string, WvWTeamId> = {
    red: redId,
    blue: blueId,
    green: greenId,
  };
  const objectives = match.maps.flatMap((map) => map.objectives);

  const scores = Object.entries(match.scores).map(([color, score]) => ({
    color,
    score: score as number,
    id: teamIds[color],
    team: WVW_TEAMS[teamIds[color] as WvWTeamId],
  }));

  const sortedScores = sortBy(scores, ['score'])
    .reverse()
    .map((score, i) => {
      return { ...score, place: i + 1 };
    });
  const teams = keyBy(sortedScores, 'color');

  return (
    <li className="my-4 flex flex-row items-center">
      <div className="w-10">
        <Link href={`/wvw/matchups/${match.id}`}>{match.id}</Link>
      </div>
      <div className="grid w-full grid-cols-3 gap-2">
        {TEAM_COLORS.map((color) => {
          const data = teams[color.toLowerCase()];

          if (!data) {
            return (
              <div key={color} className="flex items-center justify-center rounded-lg bg-gray-200 p-4">
                <p className="text-gray-500">No team</p>
              </div>
            );
          }

          return (
            <TeamObjectives
              key={color}
              team={data.team}
              color={color}
              place={data.place}
              score={data.score}
              objectives={objectives}
              lang={lang}
            />
          );
        })}
      </div>
    </li>
  );
}
