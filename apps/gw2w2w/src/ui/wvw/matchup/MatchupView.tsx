'use client';

import { useUserPrefs } from '#lib/store/userPrefs';
import { useMatchSSE } from '#lib/wvw/useMatchSSE';
import { SiteLayoutFullWidth } from '#ui/layout/SiteLayout';
import { objectivesLayout, type ObjectivesLayoutMap } from '#ui/wvw/config/objectivesLayoutConfig';
import { MAP_TYPES } from '#ui/wvw/config/teamColorConfig';
import { MatchMap } from '#ui/wvw/matchup/MatchMap';
import { MatchScoreboard } from '#ui/wvw/matchup/MatchScoreboard';
import { GuildActivity } from '#ui/wvw/matchup/GuildActivity';
import { ObjectiveLogs } from '#ui/wvw/matchup/ObjectiveLogs';
import { type WvWMapType, type WvWMatchMap, type WvWMatchStripped } from '@repo/service-api/types';
import { type EventRow } from '@repo/service-api/types';

export interface MatchupViewProps {
  match: WvWMatchStripped;
  selectedTeamId: string | null;
  initialEvents?: EventRow[];
}

export function MatchupView({ match: initialMatch, selectedTeamId, initialEvents }: MatchupViewProps) {
  const lang = useUserPrefs((s) => s.lang);
  const { match, events } = useMatchSSE(initialMatch.id, initialMatch, initialEvents ?? []);

  const mapsByType = Object.fromEntries(match.maps.map((m) => [m.type, m])) as Record<WvWMapType, WvWMatchMap>;
  const layoutByType = objectivesLayout as Record<WvWMapType, ObjectivesLayoutMap>;

  return (
    <SiteLayoutFullWidth className="pt-0">
      <div>
        <section>
          <MatchScoreboard match={match} lang={lang} selectedTeamId={selectedTeamId} className="mb-8" />
          <ul className="grid grid-cols-4 gap-2">
            {MAP_TYPES.map((mapType) => (
              <MatchMap key={mapType} map={mapsByType[mapType]} layout={layoutByType[mapType]} />
            ))}
          </ul>
        </section>
        <ObjectiveLogs events={events} />
        <GuildActivity matchId={match.id} />
      </div>
    </SiteLayoutFullWidth>
  );
}
