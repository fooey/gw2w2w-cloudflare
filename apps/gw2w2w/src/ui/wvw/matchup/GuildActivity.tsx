'use client';

import { getEmblemSrc } from '#lib/emblems';
import { OBJECTIVE_TYPES, OWNER_TYPES, useGuildActivityFilters } from '#lib/store/logFilters';
import { cn } from '#lib/utils/cn';
import { useGuild } from '#lib/wvw/useGuild';
import { ObjectiveIcon } from '#ui/wvw/common/ObjectiveIcon';
import { MAP_TYPES, teamColorConfig } from '#ui/wvw/config/teamColorConfig';
import { FilterGroup, TimeWindowFilter } from '#ui/wvw/matchup/LogFilterGroup';
import { getMapLabel } from '#ui/wvw/matchup/ObjectiveLogsRow';
import { type GuildActivityRow } from '@repo/service-api/types';
import { type EventRow } from '@repo/service-api/types';
import Link from '#ui/Link';
import { useMemo, useState } from 'react';

const ACTIVITY_OBJ_TYPES = ['Castle', 'Keep', 'Tower', 'Camp'] as const;
type ActivityObjType = (typeof ACTIVITY_OBJ_TYPES)[number];

const ACTIVITY_MAP_TYPES = ['Center', 'GreenHome', 'BlueHome', 'RedHome'] as const;
type ActivityMapType = (typeof ACTIVITY_MAP_TYPES)[number];

type SortKey = ActivityObjType | ActivityMapType | 'total' | 'lastActivity';
type SortDir = 'asc' | 'desc';

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

const SORT_FN: Record<SortKey, (a: GuildActivityRow, b: GuildActivityRow) => number> = {
  lastActivity: (a, b) => (a.last_seen_at < b.last_seen_at ? -1 : a.last_seen_at > b.last_seen_at ? 1 : 0),
  total: (a, b) => a.total - b.total,
  Castle: (a, b) => a.claims_castle - b.claims_castle,
  Keep: (a, b) => a.claims_keep - b.claims_keep,
  Tower: (a, b) => a.claims_tower - b.claims_tower,
  Camp: (a, b) => a.claims_camp - b.claims_camp,
  Center: (a, b) => a.claims_center - b.claims_center,
  GreenHome: (a, b) => a.claims_green_home - b.claims_green_home,
  BlueHome: (a, b) => a.claims_blue_home - b.claims_blue_home,
  RedHome: (a, b) => a.claims_red_home - b.claims_red_home,
};

function buildGuildRows(
  events: EventRow[],
  filters: { maps: string[]; objectiveTypes: string[]; owners: string[]; timeWindow: string },
): GuildActivityRow[] {
  const cutoffMs = filters.timeWindow === 'all' ? null : Date.now() - parseInt(filters.timeWindow, 10) * 3_600_000;

  const map = new Map<string, GuildActivityRow>();

  for (const e of events) {
    if (e.type !== 'claim') continue;
    if (!e.claimed_by) continue;
    if (typeof e.at !== 'string') continue;
    if (cutoffMs != null && new Date(e.at).getTime() < cutoffMs) continue;
    if (filters.maps.length < MAP_TYPES.length && !filters.maps.includes(e.map_type)) continue;
    if (filters.objectiveTypes.length < OBJECTIVE_TYPES.length && !filters.objectiveTypes.includes(e.objective_type))
      continue;
    if (filters.owners.length < OWNER_TYPES.length && !filters.owners.includes(e.owner)) continue;

    let row = map.get(e.claimed_by);
    if (!row) {
      row = {
        guild_id: e.claimed_by,
        match_id: e.match_id,
        claims_castle: 0,
        claims_keep: 0,
        claims_tower: 0,
        claims_camp: 0,
        claims_center: 0,
        claims_green_home: 0,
        claims_blue_home: 0,
        claims_red_home: 0,
        total: 0,
        last_seen_at: e.at,
        last_activity_owner: e.owner,
        last_activity_map: e.map_type,
      };
      map.set(e.claimed_by, row);
    }

    switch (e.objective_type) {
      case 'Castle':
        row.claims_castle++;
        break;
      case 'Keep':
        row.claims_keep++;
        break;
      case 'Tower':
        row.claims_tower++;
        break;
      case 'Camp':
        row.claims_camp++;
        break;
    }
    switch (e.map_type) {
      case 'Center':
        row.claims_center++;
        break;
      case 'GreenHome':
        row.claims_green_home++;
        break;
      case 'BlueHome':
        row.claims_blue_home++;
        break;
      case 'RedHome':
        row.claims_red_home++;
        break;
    }
    row.total++;

    if (e.at > row.last_seen_at) {
      row.last_seen_at = e.at;
      row.last_activity_owner = e.owner;
      row.last_activity_map = e.map_type;
    }
  }

  return Array.from(map.values());
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
  events: EventRow[];
}

export function GuildActivity({ events }: GuildActivityProps) {
  const { maps, objectiveTypes, owners, timeWindow, toggleMap, toggleObjectiveType, toggleOwner, setTimeWindow } =
    useGuildActivityFilters();

  const [sortKey, setSortKey] = useState<SortKey>('lastActivity');
  const [sortDir, setSortDir] = useState<SortDir>('desc');

  const rows = useMemo(() => {
    const built = buildGuildRows(events, { maps, objectiveTypes, owners, timeWindow });
    const cmp = SORT_FN[sortKey];
    return [...built].sort((a, b) => (sortDir === 'desc' ? -cmp(a, b) : cmp(a, b)));
  }, [events, maps, objectiveTypes, owners, timeWindow, sortKey, sortDir]);

  function handleSort(key: SortKey) {
    if (key === sortKey) {
      setSortDir((d) => (d === 'desc' ? 'asc' : 'desc'));
    } else {
      setSortKey(key);
      setSortDir('desc');
    }
  }

  return (
    <section className="mt-4 rounded p-2 shadow">
      <h2 className="mb-2 text-sm font-semibold tracking-wide text-gray-500 uppercase">Guild Activity</h2>
      <div className="mb-3 flex flex-col gap-1.5">
        <TimeWindowFilter value={timeWindow} onChange={setTimeWindow} />
        <FilterGroup label="Map" options={MAP_TYPES} active={maps} onToggle={toggleMap} getLabel={getMapLabel} />
        <FilterGroup label="Type" options={OBJECTIVE_TYPES} active={objectiveTypes} onToggle={toggleObjectiveType} />
        <FilterGroup label="Owner" options={OWNER_TYPES} active={owners} onToggle={toggleOwner} />
      </div>
      <div className="h-96 overflow-x-auto">
        <table className="w-full table-fixed text-left">
          <colgroup>
            <col className="w-8" />
            <col className="w-12" />
            <col />
            {ACTIVITY_OBJ_TYPES.map((type) => (
              <col key={type} className="w-10" />
            ))}
            {ACTIVITY_MAP_TYPES.map((map) => (
              <col key={map} className="w-10" />
            ))}
            <col className="w-12" />
            <col className="w-36" />
          </colgroup>
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
            {rows.length === 0 ? (
              <tr>
                <td colSpan={13} className="px-2 py-4 text-sm text-gray-400">
                  No claim events match the current filters.
                </td>
              </tr>
            ) : (
              rows.map((row) => <GuildTableRow key={row.guild_id} row={row} />)
            )}
          </tbody>
        </table>
      </div>
    </section>
  );
}
