'use client';

import { type Lang } from '@gw2w2w/ui/wvw/config/lang';
import { TEAM_COLORS } from '@gw2w2w/ui/wvw/config/teamColorConfig';
import { TeamScore } from '@gw2w2w/ui/wvw/matchup-dashboard/TeamScore';
import { WVW_TEAMS, type WvWTeamId } from '@service-api/definitions';
import { type WvWMatch } from '@service-api/lib/resources/wvw/matches';
import clsx from 'clsx';
import { keyBy, sortBy } from 'lodash-es';

interface MatchScoreboardProps {
  match: WvWMatch;
  lang: Lang;
  selectedTeamId: string | null;
  className?: string;
}

export function MatchScoreboard({ match, lang, selectedTeamId, className }: MatchScoreboardProps) {
  const redId = match.all_worlds.red.find((id) => id > 10_000)?.toString() as WvWTeamId | undefined;
  const blueId = match.all_worlds.blue.find((id) => id > 10_000)?.toString() as WvWTeamId | undefined;
  const greenId = match.all_worlds.green.find((id) => id > 10_000)?.toString() as WvWTeamId | undefined;

  if (!redId || !blueId || !greenId) return null;

  const teamIds: Record<string, WvWTeamId> = { red: redId, blue: blueId, green: greenId };
  const objectives = match.maps.flatMap((map) => map.objectives);

  const scores = Object.entries(match.scores).map(([color, score]) => ({
    color,
    score: score as number,
    id: teamIds[color],
    team: WVW_TEAMS[teamIds[color] as WvWTeamId],
  }));

  const sortedScores = sortBy(scores, ['score'])
    .reverse()
    .map((score, i) => ({ ...score, place: i + 1 }));

  const teams = keyBy(sortedScores, 'color');

  return (
    <div className={clsx('grid grid-cols-3 gap-2 align-baseline', className)}>
      {TEAM_COLORS.map((color) => {
        const data = teams[color.toLowerCase()];
        if (!data) return null;
        return (
          <TeamScore
            key={color}
            team={data.team}
            color={color}
            place={data.place}
            score={data.score}
            objectives={objectives}
            lang={lang}
            isSelectedTeam={data.id === selectedTeamId}
          />
        );
      })}
    </div>
  );
}
