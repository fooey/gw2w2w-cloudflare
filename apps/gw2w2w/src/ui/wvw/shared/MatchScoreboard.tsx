'use client';

import clsx from 'clsx';

import { WVW_TEAMS } from '@repo/service-api/definitions';
import type { WvWMatch, WvWTeamId } from '@repo/service-api/types';

import type { Lang } from '#ui/wvw/config/lang';
import { TEAM_COLORS } from '#ui/wvw/config/teamColorConfig';
import { TeamScore } from '#ui/wvw/shared/TeamScore';

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

  // Object.fromEntries widens to Record<string, number> even though the entries are built
  // from all three TeamColor values, so the result genuinely has exactly those keys.
  // eslint-disable-next-line typescript/no-unsafe-type-assertion
  const placeByColor = Object.fromEntries(
    TEAM_COLORS_LC.toSorted((a, b) => match.scores[b] - match.scores[a]).map((color, i) => [color, i + 1]),
  ) as Record<TeamColor, number>;

  return (
    <div className={clsx('grid grid-cols-3 gap-2 align-baseline', className)}>
      {TEAM_COLORS.map((color) => {
        // eslint-disable-next-line typescript/no-unsafe-type-assertion -- tsgo doesn't narrow .toLowerCase() to the literal union here.
        const c = color.toLowerCase() as TeamColor;
        // WvW API convention: world ids above 10,000 are linked-world/team ids present in WVW_TEAMS.
        // eslint-disable-next-line typescript/no-unsafe-type-assertion
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
