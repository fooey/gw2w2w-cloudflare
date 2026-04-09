'use client';

import { useUserPrefs } from '#lib/store/userPrefs';
import { useMatch } from '#lib/wvw/useMatch';
import { SiteLayoutFullWidth } from '#ui/layout/SiteLayout';
import { objectivesLayout } from '#ui/wvw/config/objectivesLayoutConfig';
import { MAP_TYPES } from '#ui/wvw/config/teamColorConfig';
import { MatchMap } from '#ui/wvw/matchup/MatchMap';
import { MatchScoreboard } from '#ui/wvw/matchup/MatchScoreboard';
import { GuildActivity } from '#ui/wvw/matchup/GuildActivity';
import { ObjectiveLogs } from '#ui/wvw/matchup/ObjectiveLogs';
import { type WvWMatch } from '@repo/service-api/types';

export interface MatchupViewProps {
  match: WvWMatch;
  selectedTeamId: string | null;
}

export function MatchupView({ match: initialMatch, selectedTeamId }: MatchupViewProps) {
  const lang = useUserPrefs((s) => s.lang);
  const { data: match } = useMatch(initialMatch.id, { initialData: initialMatch, initialDataUpdatedAt: 0 });

  const maps = [...(match?.maps ?? [])].sort(
    (a, b) => MAP_TYPES.indexOf(a.type as never) - MAP_TYPES.indexOf(b.type as never),
  );

  return (
    <SiteLayoutFullWidth className="pt-0">
      <div>
        <section>
          <MatchScoreboard match={match ?? initialMatch} lang={lang} selectedTeamId={selectedTeamId} className="mb-8" />
          <ul className="grid grid-cols-4 gap-2">
            {Object.entries(objectivesLayout).map(([mapName, mapLayout]) => {
              const map = maps.find((m) => m.type === mapName);
              if (!map) return null;
              return <MatchMap key={map.id} map={map} layout={mapLayout} />;
            })}
          </ul>
        </section>
        {match && <ObjectiveLogs matchId={match.id} />}
        {match && <GuildActivity matchId={match.id} />}
      </div>
    </SiteLayoutFullWidth>
  );
}
