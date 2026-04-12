'use client';

import { useUserPrefs } from '#lib/store/userPrefs';
import { useMatch } from '#lib/wvw/useMatch';
import { SiteLayoutFullWidth } from '#ui/layout/SiteLayout';
import { objectivesLayout, type ObjectivesLayoutMap } from '#ui/wvw/config/objectivesLayoutConfig';
import { MAP_TYPES } from '#ui/wvw/config/teamColorConfig';
import { MatchMap } from '#ui/wvw/matchup/MatchMap';
import { MatchScoreboard } from '#ui/wvw/matchup/MatchScoreboard';
import { GuildActivity } from '#ui/wvw/matchup/GuildActivity';
import { ObjectiveLogs } from '#ui/wvw/matchup/ObjectiveLogs';
import { type WvWMapType, type WvWMatchMap, type WvWMatch } from '@repo/service-api/types';

export interface MatchupViewProps {
  match: WvWMatch;
  selectedTeamId: string | null;
}

export function MatchupView({ match: initialMatch, selectedTeamId }: MatchupViewProps) {
  const lang = useUserPrefs((s) => s.lang);
  const { data: match } = useMatch(initialMatch.id, { initialData: initialMatch, initialDataUpdatedAt: 0 });

  const currentMatch = match ?? initialMatch;
  const mapsByType = Object.fromEntries(currentMatch.maps.map((m) => [m.type, m])) as Record<WvWMapType, WvWMatchMap>;
  const layoutByType = objectivesLayout as Record<WvWMapType, ObjectivesLayoutMap>;

  return (
    <SiteLayoutFullWidth className="pt-0">
      <div>
        <section>
          <MatchScoreboard match={currentMatch} lang={lang} selectedTeamId={selectedTeamId} className="mb-8" />
          <ul className="grid grid-cols-4 gap-2">
            {MAP_TYPES.map((mapType) => (
              <MatchMap key={mapType} map={mapsByType[mapType]} layout={layoutByType[mapType]} />
            ))}
          </ul>
        </section>
        {match && <ObjectiveLogs matchId={match.id} />}
        {match && <GuildActivity matchId={match.id} />}
      </div>
    </SiteLayoutFullWidth>
  );
}
