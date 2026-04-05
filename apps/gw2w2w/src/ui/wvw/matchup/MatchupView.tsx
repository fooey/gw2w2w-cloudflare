'use client';

import { useUserPrefs } from '@gw2w2w/lib/store/userPrefs';
import { useMatch } from '@gw2w2w/lib/wvw/useMatch';
import { SiteLayoutFullWidth } from '@gw2w2w/ui/layout/SiteLayout';
import { objectivesLayout } from '@gw2w2w/ui/wvw/config/objectivesLayoutConfig';
import { MAP_TYPES } from '@gw2w2w/ui/wvw/config/teamColorConfig';
import { MatchMap } from '@gw2w2w/ui/wvw/matchup/MatchMap';
import { MatchScoreboard } from '@gw2w2w/ui/wvw/matchup/MatchScoreboard';
import { ObjectiveLogs } from '@gw2w2w/ui/wvw/matchup/ObjectiveLogs';
import { ArrowPathIcon } from '@heroicons/react/20/solid';
import { WVW_TEAMS, type WvWTeamId } from '@service-api/definitions';
import { type WvWMatch } from '@service-api/lib/resources/wvw/matches';
import { useMemo } from 'react';

export interface MatchupViewProps {
  match: WvWMatch;
  selectedTeamId: string | null;
}

export function MatchupView({ match: initialMatch, selectedTeamId }: MatchupViewProps) {
  const lang = useUserPrefs((s) => s.lang);
  const { data: match, isFetching } = useMatch(initialMatch.id, { initialData: initialMatch });

  const pageHeader = selectedTeamId ? WVW_TEAMS[selectedTeamId as WvWTeamId][lang] : `WvW Matchup ${initialMatch.id}`;

  const maps = useMemo(
    () =>
      [...(match?.maps ?? [])].sort((a, b) => MAP_TYPES.indexOf(a.type as never) - MAP_TYPES.indexOf(b.type as never)),
    [match?.maps],
  );

  return (
    <SiteLayoutFullWidth
      pageHeader={pageHeader}
      headerActions={<>{isFetching && <ArrowPathIcon className="inline size-4 animate-spin text-zinc-400" />}</>}
    >
      <div>
        <section>
          <MatchScoreboard match={match ?? initialMatch} lang={lang} className="mb-8" />
          <ul className="flex flex-row justify-between gap-2">
            {Object.entries(objectivesLayout).map(([mapName, mapLayout]) => {
              const map = maps.find((m) => m.type === mapName);
              if (!map) return null;
              return <MatchMap key={map.id} map={map} layout={mapLayout} />;
            })}
          </ul>
        </section>
        {match && <ObjectiveLogs matchId={match.id} />}
      </div>
    </SiteLayoutFullWidth>
  );
}
