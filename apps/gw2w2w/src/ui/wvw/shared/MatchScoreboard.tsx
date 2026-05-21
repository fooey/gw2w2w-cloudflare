'use client';

import type { Lang } from '#ui/wvw/config/lang';
import { TEAM_COLORS } from '#ui/wvw/config/teamColorConfig';
import { TeamScore } from '#ui/wvw/shared/TeamScore';
import type { WvWTeamId } from '@repo/service-api/types';
import { WVW_TEAMS } from '@repo/service-api/definitions';
import type { WvWMatch } from '@repo/service-api/types';
import clsx from 'clsx';

type TeamColor = 'red' | 'blue' | 'green';
const TEAM_COLORS_LC = ['red', 'blue', 'green'] as const satisfies TeamColor[];

interface MatchScoreboardProps {
  match: WvWMatch;
  lang: Lang;
  selectedTeamId?: string | null;
  className?: string;
}

export function MatchScoreboard({ match, lang, selectedTeamId, className }: MatchScoreboardProps) {
  const objectives = match.maps.flatMap((map) => map.objectives);

  const placeByColor = Object.fromEntries(
    [...TEAM_COLORS_LC].sort((a, b) => match.scores[b] - match.scores[a]).map((color, i) => [color, i + 1]),
  ) as Record<TeamColor, number>;

  return (
    <div className={clsx('grid grid-cols-3 gap-2 align-baseline', className)}>
      {TEAM_COLORS.map((color) => {
        const c = color.toLowerCase() as TeamColor;
        const teamId = match.all_worlds[c].find((id) => id > 10_000)?.toString() as WvWTeamId | undefined;
        if (!teamId) return null;
        return (
          <TeamScore
            key={color}
            team={WVW_TEAMS[teamId]}
            color={color}
            place={placeByColor[c]}
            score={match.scores[c]}
            kills={match.kills[c]}
            deaths={match.deaths[c]}
            objectives={objectives}
            lang={lang}
            isSelectedTeam={teamId === selectedTeamId}
          />
        );
      })}
    </div>
  );
}
