'use client';

import { getEmblemSrc } from '#lib/emblems';
import { OBJECTIVE_TYPES, OWNER_TYPES, useGuildActivityFilters } from '#lib/store/logFilters';
import { cn } from '#lib/utils/cn';
import { fetchWvwGuilds } from '#lib/api/wvw/guilds';
import { useGuild } from '#lib/wvw/useGuild';
import { ObjectiveIcon } from '#ui/wvw/common/ObjectiveIcon';
import { MAP_TYPES, teamColorConfig } from '#ui/wvw/config/teamColorConfig';
import { FilterGroup, TimeWindowFilter } from '#ui/wvw/matchup/LogFilterGroup';
import { getMapLabel } from '#ui/wvw/matchup/ObjectiveLogsRow';
import { type GuildActivityRow } from '@repo/service-api/types';
import { useQuery } from '@tanstack/react-query';
import Link from 'next/link';
import { useState } from 'react';

const ACTIVITY_OBJ_TYPES = ['Castle', 'Keep', 'Tower', 'Camp'] as const;
type ActivityObjType = (typeof ACTIVITY_OBJ_TYPES)[number];

const ACTIVITY_MAP_TYPES = ['Center', 'GreenHome', 'BlueHome', 'RedHome'] as const;
type ActivityMapType = (typeof ACTIVITY_MAP_TYPES)[number];

type SortKey = ActivityObjType | ActivityMapType | 'total' | 'lastActivity';
type SortDir = 'asc' | 'desc';

// Maps UI sort keys to API sort column names
const SORT_API_MAP: Record<SortKey, string> = {
  lastActivity: 'last_seen_at',
  total: 'total',
  Castle: 'claims_castle',
  Keep: 'claims_keep',
  Tower: 'claims_tower',
  Camp: 'claims_camp',
  Center: 'claims_center',
  GreenHome: 'claims_green_home',
  BlueHome: 'claims_blue_home',
  RedHome: 'claims_red_home',
};

const OBJ_TO_KEY: Record<ActivityObjType, keyof GuildActivityRow> = {
  Castle: 'claims_castle',
  Keep: 'claims_keep',
  Tower: 'claims_tower',
  Camp: 'claims_camp',
};

const MAP_TO_KEY: Record<ActivityMapType, keyof GuildActivityRow> = {
  Center: 'claims_center',
  GreenHome: 'claims_green_home',
  BlueHome: 'claims_blue_home',
  RedHome: 'claims_red_home',
};

function timeWindowToMaxAge(tw: string): number | undefined {
  if (tw === 'all') return undefined;
  const hours = parseInt(tw, 10);
  return hours * 3_600;
}

function SortableHeader({
  label,
  sortKey,
  current,
  dir,
  onSort,
  className,
  title,
}: {
  label: React.ReactNode;
  sortKey: SortKey;
  current: SortKey;
  dir: SortDir;
  onSort: (key: SortKey) => void;
  className?: string;
  title?: string;
}) {
  const isActive = current === sortKey;
  return (
    <th
      className={cn('cursor-pointer px-2 py-1 text-left text-xs font-semibold text-gray-500 select-none', className)}
      title={title ?? (typeof label === 'string' ? label : undefined)}
      onClick={() => {
        onSort(sortKey);
      }}
    >
      <span className="flex items-center gap-1">
        {label}
        <span className={cn('text-[10px]', isActive ? 'text-gray-700' : 'text-gray-300')}>
          {isActive ? (dir === 'desc' ? '▼' : '▲') : '⬍'}
        </span>
      </span>
    </th>
  );
}

function GuildTableRow({ row }: { row: GuildActivityRow }) {
  const guildQuery = useGuild(row.guild_id);
  const guild = guildQuery.data;
  const guildLink = `/guilds/${guild?.name ? encodeURIComponent(guild.name) : row.guild_id}`;

  const ownerColors = (teamColorConfig as Record<string, { text: string }>)[row.last_activity_owner];

  return (
    <tr className={cn('border-t border-gray-100 hover:bg-gray-100 hover:font-semibold', ownerColors?.text)}>
      <td className="w-8 p-0 py-1">
        <Link
          href={guildLink}
          title={guild ? `${guild.name} [${guild.tag}]` : row.guild_id}
          target="_blank"
          rel="noopener"
        >
          <img
            src={getEmblemSrc(row.guild_id)}
            alt={guild?.name ?? 'Guild Emblem'}
            width={32}
            height={32}
            onError={(e) => {
              (e.currentTarget as HTMLImageElement).style.visibility = 'hidden';
            }}
          />
        </Link>
      </td>
      <td className="w-px px-2 py-1 text-sm font-medium">
        <Link href={guildLink} target="_blank" rel="noopener">
          [{guild?.tag ?? '…'}]
        </Link>
      </td>
      <td className="px-2 py-1 text-sm font-medium">
        <Link href={guildLink} target="_blank" rel="noopener">
          {guild?.name ?? row.guild_id}
        </Link>
      </td>
      {ACTIVITY_OBJ_TYPES.map((type) => (
        <td
          key={type}
          className="w-px min-w-10 px-2 py-1 text-center text-sm whitespace-nowrap text-gray-700 tabular-nums"
        >
          {row[OBJ_TO_KEY[type]] as number}
        </td>
      ))}
      {ACTIVITY_MAP_TYPES.map((map) => (
        <td
          key={map}
          className="w-px min-w-10 px-2 py-1 text-center text-sm whitespace-nowrap text-gray-700 tabular-nums"
        >
          {row[MAP_TO_KEY[map]] as number}
        </td>
      ))}
      <td className="w-px px-2 py-1 text-center text-sm font-semibold whitespace-nowrap text-gray-800 tabular-nums">
        {row.total}
      </td>
      <td className="w-px px-2 py-1 text-right font-mono text-xs whitespace-nowrap tabular-nums">
        {getMapLabel(row.last_activity_map)}
        {' · '}
        {row.last_seen_at
          ? Temporal.Instant.from(row.last_seen_at).toLocaleString(undefined, {
              weekday: 'short',
              hour: '2-digit',
              minute: '2-digit',
            })
          : null}
      </td>
    </tr>
  );
}

interface GuildActivityProps {
  matchId: string;
}

export function GuildActivity({ matchId }: GuildActivityProps) {
  const { maps, objectiveTypes, owners, timeWindow, toggleMap, toggleObjectiveType, toggleOwner, setTimeWindow } =
    useGuildActivityFilters();

  const [sortKey, setSortKey] = useState<SortKey>('lastActivity');
  const [sortDir, setSortDir] = useState<SortDir>('desc');

  // Only pass filter params when they are a proper subset — omitting means "all"
  const mapTypeParam =
    maps.length < ACTIVITY_MAP_TYPES.length
      ? maps.filter((m): m is ActivityMapType => (ACTIVITY_MAP_TYPES as readonly string[]).includes(m))
      : undefined;

  const activeClaimableTypes = objectiveTypes.filter((t): t is ActivityObjType =>
    (ACTIVITY_OBJ_TYPES as readonly string[]).includes(t),
  );
  const objectiveTypeParam = activeClaimableTypes.length < ACTIVITY_OBJ_TYPES.length ? activeClaimableTypes : undefined;

  const ownerParam = owners.length < OWNER_TYPES.length ? owners : undefined;

  const { data, isLoading, isError } = useQuery({
    queryKey: ['wvwGuilds', matchId, sortKey, sortDir, maps, objectiveTypes, owners, timeWindow],
    queryFn: () =>
      fetchWvwGuilds({
        matchId,
        sort: SORT_API_MAP[sortKey],
        order: sortDir,
        maxAge: timeWindowToMaxAge(timeWindow),
        mapType: mapTypeParam,
        objectiveType: objectiveTypeParam,
        owner: ownerParam,
        limit: 100,
      }),
    staleTime: 10_000,
  });

  function handleSort(key: SortKey) {
    if (key === sortKey) {
      setSortDir((d) => (d === 'desc' ? 'asc' : 'desc'));
    } else {
      setSortKey(key);
      setSortDir('desc');
    }
  }

  const rows = data?.guilds ?? [];

  return (
    <section className="mt-4 rounded p-2 shadow">
      <h2 className="mb-2 text-sm font-semibold tracking-wide text-gray-500 uppercase">Guild Activity</h2>
      <div className="mb-3 flex flex-col gap-1.5">
        <TimeWindowFilter value={timeWindow} onChange={setTimeWindow} />
        <FilterGroup label="Map" options={MAP_TYPES} active={maps} onToggle={toggleMap} getLabel={getMapLabel} />
        <FilterGroup label="Type" options={OBJECTIVE_TYPES} active={objectiveTypes} onToggle={toggleObjectiveType} />
        <FilterGroup label="Owner" options={OWNER_TYPES} active={owners} onToggle={toggleOwner} />
      </div>
      {isLoading ? (
        <p className="text-sm text-gray-400">Loading…</p>
      ) : isError ? (
        <p className="text-sm text-red-400">Failed to load guild activity.</p>
      ) : rows.length === 0 ? (
        <p className="text-sm text-gray-400">No claim events match the current filters.</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="border-b border-gray-200">
                <th className="px-2 py-1 text-xs font-semibold text-gray-500" colSpan={3}>
                  Guild
                </th>
                {ACTIVITY_OBJ_TYPES.map((type) => (
                  <SortableHeader
                    key={type}
                    label={<ObjectiveIcon type={type} owner="Neutral" size={16} className="shrink-0" />}
                    sortKey={type}
                    current={sortKey}
                    dir={sortDir}
                    onSort={handleSort}
                    className="w-px text-center whitespace-nowrap"
                    title={type}
                  />
                ))}
                {ACTIVITY_MAP_TYPES.map((map) => (
                  <SortableHeader
                    key={map}
                    label={getMapLabel(map)}
                    sortKey={map}
                    current={sortKey}
                    dir={sortDir}
                    onSort={handleSort}
                    className="w-px text-center whitespace-nowrap"
                  />
                ))}
                <SortableHeader
                  label="Total"
                  sortKey="total"
                  current={sortKey}
                  dir={sortDir}
                  onSort={handleSort}
                  className="w-px text-center whitespace-nowrap"
                />
                <SortableHeader
                  label="Last Activity"
                  sortKey="lastActivity"
                  current={sortKey}
                  dir={sortDir}
                  onSort={handleSort}
                  className="w-px text-right whitespace-nowrap"
                />
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <GuildTableRow key={row.guild_id} row={row} />
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}
