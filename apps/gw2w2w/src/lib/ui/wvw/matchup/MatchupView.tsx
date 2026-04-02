'use client';

import { fetchWvwMatchDirect } from '@gw2w2w/lib/api/gw2/wvw/matches';
import { getEmblemSrc } from '@gw2w2w/lib/emblems';
import { useUserPrefs } from '@gw2w2w/lib/store/userPrefs';
import SiteLayout from '@gw2w2w/lib/ui/layout/SiteLayout';
import { ObjectiveIcon } from '@gw2w2w/lib/ui/wvw/common/ObjectiveIcon';
import {
  objectivesLayout,
  type Direction,
  type ObjectivesLayoutMap,
} from '@gw2w2w/lib/ui/wvw/config/objectivesLayoutConfig';
import { MAP_TYPES, teamColorConfig, type TeamColorConfigKey } from '@gw2w2w/lib/ui/wvw/config/teamColorConfig';
import { useClock } from '@gw2w2w/lib/ui/wvw/hooks/useClock';
import { useWvwObjective } from '@gw2w2w/lib/wvw/objectives';
import {
  ArrowDownIcon,
  ArrowDownLeftIcon,
  ArrowDownRightIcon,
  ArrowLeftIcon,
  ArrowPathIcon,
  ArrowRightIcon,
  ArrowUpIcon,
  ArrowUpLeftIcon,
  ArrowUpRightIcon,
  NoSymbolIcon,
  StarIcon,
} from '@heroicons/react/20/solid';
import { WVW_TEAMS, type WvWTeamId } from '@service-api/definitions';
import { withJitter } from '@service-api/lib/resources/constants';
import { type WvWMatch, type WvWMatchMap, type WvWMatchObjective } from '@service-api/lib/resources/wvw/matches';
import { type WvWObjective } from '@service-api/lib/resources/wvw/objectives';
import { QueryClient, QueryClientProvider, useQuery, type UseQueryOptions } from '@tanstack/react-query';
import clsx from 'clsx';
import Link from 'next/link';
import { useMemo, useState } from 'react';

const FLIP_WINDOW_SECONDS = 5 * 60;
const durationFormatter = new Intl.DurationFormat('en', { style: 'narrow' });

function getFlippedDisplay(isoString: string, now: Temporal.Instant | null): string | null {
  if (now === null) return null;
  const elapsed = Math.max(0, Math.floor(Temporal.Instant.from(isoString).until(now).total('seconds')));
  if (elapsed < FLIP_WINDOW_SECONDS) {
    const remaining = FLIP_WINDOW_SECONDS - elapsed;
    const mins = Math.floor(remaining / 60);
    const secs = remaining % 60;
    return `${mins.toString()}:${secs.toString().padStart(2, '0')}`;
  }
  return null;
}

export interface MatchupViewProps {
  match: WvWMatch;
  selectedTeamId: string | null;
}

type UseMatchResults = WvWMatch | null;
function useMatch(matchId: string, queryOptions: Partial<UseQueryOptions<UseMatchResults>>) {
  return useQuery<UseMatchResults>({
    queryKey: ['wvwMatch', matchId],
    queryFn: () => fetchWvwMatchDirect(matchId),
    refetchInterval: () => withJitter(6_000, 0.75),
    staleTime: 12_000,
    refetchOnWindowFocus: true,
    refetchIntervalInBackground: false,
    ...queryOptions,
  });
}

export function MatchupViewContainer({ match, selectedTeamId }: MatchupViewProps) {
  const [queryClient] = useState(() => new QueryClient());
  return (
    <QueryClientProvider client={queryClient}>
      <MatchupView match={match} selectedTeamId={selectedTeamId} />
    </QueryClientProvider>
  );
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
    <SiteLayout
      pageHeader={pageHeader}
      headerActions={<>{isFetching && <ArrowPathIcon className="inline size-4 animate-spin text-zinc-400" />}</>}
    >
      <div>
        <p>Match: {match?.id}</p>
        {selectedTeamId && <p>Team: {selectedTeamId}</p>}
        <ul className="flex flex-row justify-between gap-2">
          {Object.entries(objectivesLayout).map(([mapName, mapLayout]) => {
            const map = maps.find((m) => m.type === mapName);
            if (!map) return null;
            return <MatchMap key={map.id} map={map} layout={mapLayout} />;
          })}
        </ul>
      </div>
    </SiteLayout>
  );
}

const VISIBLE_OBJECTIVE_TYPES: readonly WvWObjective['type'][] = ['Castle', 'Keep', 'Camp', 'Tower'] as const;

function MatchMap({ map, layout }: { map: WvWMatchMap; layout: ObjectivesLayoutMap }) {
  const objectivesById = useMemo(() => {
    const index = new Map<string, WvWMatchObjective>();
    for (const obj of map.objectives) {
      if (VISIBLE_OBJECTIVE_TYPES.includes(obj.type)) {
        const id = obj.id.split('-')[1];
        if (id) index.set(id, obj);
      }
    }
    return index;
  }, [map]);

  return (
    <li key={map.id} className="shrink-0 grow">
      <section className="rounded shadow">
        <header>
          <h1>{map.type}</h1>
        </header>
        <div className="flex flex-col gap-3">
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

const RI_TIMER = 5 * 60; // seconds

function MatchObjectiveRow({ matchObjective, direction }: { matchObjective: WvWMatchObjective; direction: Direction }) {
  const { data: objectiveLabels } = useWvwObjective(matchObjective.id);
  const now = useClock();
  const [emblemError, setEmblemError] = useState(false);

  const ICON_SIZE = 24 as const;

  const holdTime =
    now && matchObjective.last_flipped
      ? Math.floor(Temporal.Instant.from(matchObjective.last_flipped).until(now).total('seconds'))
      : null;

  const isInRI = holdTime !== null && holdTime < RI_TIMER;
  const freshCapture = holdTime !== null && holdTime <= 60;
  const ownerBg =
    matchObjective.owner !== 'Neutral' ? teamColorConfig[matchObjective.owner as TeamColorConfigKey].bg : null;
  const ownerText =
    matchObjective.owner !== 'Neutral' ? teamColorConfig[matchObjective.owner as TeamColorConfigKey].text : null;

  const timeDisplay =
    holdTime === null
      ? null
      : holdTime < RI_TIMER
        ? getFlippedDisplay(matchObjective.last_flipped, now)
        : durationFormatter.format(
            holdTime < 3600 ? { minutes: Math.floor(holdTime / 60) } : { hours: Math.floor(holdTime / 3600) },
          );

  return (
    <div
      className={clsx(
        'flex w-full flex-row items-center gap-8 px-2 transition-all duration-200',
        { 'font-semibold': isInRI },
        freshCapture && ownerBg,
        ownerText,
      )}
    >
      <span className="flex flex-row items-center gap-1">
        {matchObjective.claimed_by ? (
          <Link
            href={`/guilds/${matchObjective.claimed_by}`}
            style={{ width: ICON_SIZE, height: ICON_SIZE }}
            className="flex shrink-0 items-center justify-center overflow-hidden"
          >
            {emblemError ? (
              <NoSymbolIcon className="size-6 text-zinc-400 opacity-25" />
            ) : (
              <img
                src={getEmblemSrc(matchObjective.claimed_by)}
                alt=""
                width={ICON_SIZE}
                height={ICON_SIZE}
                onError={() => {
                  setEmblemError(true);
                }}
              />
            )}
          </Link>
        ) : (
          <span style={{ width: ICON_SIZE, height: ICON_SIZE, display: 'inline-block' }} className="shrink-0" />
        )}
        <ObjectiveIcon type={matchObjective.type} owner={matchObjective.owner} size={ICON_SIZE} className="shrink-0" />
        <DirectionIcon direction={direction} className="shrink-0" width={ICON_SIZE / 2} height={ICON_SIZE / 2} />
      </span>
      {/* <span className="w-12">{obj.type}</span> */}
      <div className="flex w-full flex-row items-center justify-between">
        <span className="max-w-32 overflow-hidden text-xs text-nowrap text-ellipsis">{objectiveLabels?.name}</span>
        {/* <span className="w-12">{obj.owner}</span> */}
        <span className={clsx('w-8 text-right font-mono text-xs', { 'opacity-30': !isInRI })}>{timeDisplay}</span>
      </div>
    </div>
  );
}

function DirectionIcon({ direction, ...rest }: { direction: Direction } & React.ComponentProps<'svg'>) {
  const Icon = DirectionIcons[direction];
  return <Icon {...rest} />;
}

const DirectionIcons: Record<Direction, typeof StarIcon> = {
  C: StarIcon,
  N: ArrowUpIcon,
  NE: ArrowUpRightIcon,
  E: ArrowRightIcon,
  SE: ArrowDownRightIcon,
  S: ArrowDownIcon,
  SW: ArrowDownLeftIcon,
  W: ArrowLeftIcon,
  NW: ArrowUpLeftIcon,
};
