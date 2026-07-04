'use client';

import { useUserPrefs } from '#lib/store/userPrefs';
import { useMatchSSE } from '#lib/wvw/useMatchSSE';
import { SiteLayoutFullWidth } from '#ui/layout/SiteLayout';
import { objectivesLayout } from '#ui/wvw/config/objectivesLayoutConfig';
import { MAP_TYPES } from '#ui/wvw/config/teamColorConfig';
import { EventActivityChart } from '#ui/wvw/matchup/activity/EventActivityChart';
import { GuildActivity } from '#ui/wvw/matchup/activity/GuildActivity';
import { ObjectiveLogs } from '#ui/wvw/matchup/activity/ObjectiveLogs';
import { TeamActivity } from '#ui/wvw/matchup/activity/TeamActivity';
import { MatchMap } from '#ui/wvw/matchup/maps/MatchMap';
import { MatchScoreboard } from '#ui/wvw/shared/MatchScoreboard';
import type { EventRow, WvWMapType, WvWMatchMap, WvWMatch } from '@repo/service-api/types';

export interface MatchupViewProps {
  match: WvWMatch;
  selectedTeamId: string | null;
  initialEvents?: EventRow[];
}

export function MatchupView({ match: initialMatch, selectedTeamId, initialEvents }: MatchupViewProps) {
  const lang = useUserPrefs((s) => s.lang);
  const { match, events } = useMatchSSE(initialMatch.id, initialMatch, initialEvents ?? []);

  // A WvW match always has exactly one map per WvWMapType, so this genuinely has all 4 keys.
  // eslint-disable-next-line typescript/no-unsafe-type-assertion
  const mapsByType = Object.fromEntries(match.maps.map((m) => [m.type, m])) as Record<WvWMapType, WvWMatchMap>;
  const layoutByType = objectivesLayout;

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
        <EventActivityChart events={events} />
        <TeamActivity events={events} />
        <GuildActivity events={events} />
      </div>
    </SiteLayoutFullWidth>
  );
}
