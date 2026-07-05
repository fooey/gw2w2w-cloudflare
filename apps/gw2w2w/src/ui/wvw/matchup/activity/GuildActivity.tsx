'use client';

import { getEmblemSrc } from '#lib/emblems';
import { OBJECTIVE_TYPES, OWNER_TYPES, useGuildActivityFilters } from '#lib/store/logFilters';
import { cn } from '#lib/utils/cn';
import { useGuild } from '#lib/wvw/useGuild';
import { ObjectiveIcon } from '#ui/wvw/common/ObjectiveIcon';
import { MAP_TYPES, teamColorConfig } from '#ui/wvw/config/teamColorConfig';
import { getMapLabel } from '#ui/wvw/config/mapLabels';
import { FilterGroup, TimeWindowFilter } from '#ui/wvw/matchup/activity/Filters';
import { buildGuildRows } from '#ui/wvw/matchup/activity/guildActivityRows';
import type { EventRow, GuildActivityRow } from '@repo/service-api/types';
import { isNonEmptyString } from '@repo/utils';
import { Link } from '#ui/Link';
import { useVirtualizer } from '@tanstack/react-virtual';
import { useMemo, useRef, useState } from 'react';

const ACTIVITY_OBJ_TYPES = ['Castle', 'Keep', 'Tower', 'Camp'] as const;
type ActivityObjType = (typeof ACTIVITY_OBJ_TYPES)[number];

const ACTIVITY_MAP_TYPES = ['Center', 'GreenHome', 'BlueHome', 'RedHome'] as const;
type ActivityMapType = (typeof ACTIVITY_MAP_TYPES)[number];

type SortKey = ActivityObjType | ActivityMapType | 'total' | 'lastActivity';
type SortDir = 'asc' | 'desc';

type NumericKeyOf<T> = { [K in keyof T]: T[K] extends number ? K : never }[keyof T];

const OBJ_TO_KEY: Record<ActivityObjType, NumericKeyOf<GuildActivityRow>> = {
  Castle: 'claims_castle',
  Keep: 'claims_keep',
  Tower: 'claims_tower',
  Camp: 'claims_camp',
};

const MAP_TO_KEY: Record<ActivityMapType, NumericKeyOf<GuildActivityRow>> = {
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
  const guildLink = `/guilds/${isNonEmptyString(guild?.name) ? encodeURIComponent(guild.name) : row.guild_id}`;

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
              e.currentTarget.style.visibility = 'hidden';
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
          {row[OBJ_TO_KEY[type]]}
        </td>
      ))}
      {ACTIVITY_MAP_TYPES.map((map) => (
        <td
          key={map}
          className="w-px min-w-10 px-2 py-1 text-center text-sm whitespace-nowrap text-gray-700 tabular-nums"
        >
          {row[MAP_TO_KEY[map]]}
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

// eslint-disable-next-line react/react-compiler -- TanStack Virtual's API is intentionally used for row virtualization in this scroll container.
export function GuildActivity({ events }: GuildActivityProps) {
  const { maps, objectiveTypes, owners, timeWindow, toggleMap, toggleObjectiveType, toggleOwner, setTimeWindow } =
    useGuildActivityFilters();

  const [sortKey, setSortKey] = useState<SortKey>('lastActivity');
  const [sortDir, setSortDir] = useState<SortDir>('desc');

  const rows = useMemo(() => {
    const built = buildGuildRows(events, { maps, objectiveTypes, owners, timeWindow });
    const cmp = SORT_FN[sortKey];
    return built.toSorted((a, b) => (sortDir === 'desc' ? -cmp(a, b) : cmp(a, b)));
  }, [events, maps, objectiveTypes, owners, timeWindow, sortKey, sortDir]);

  function handleSort(key: SortKey) {
    if (key === sortKey) {
      setSortDir((d) => (d === 'desc' ? 'asc' : 'desc'));
    } else {
      setSortKey(key);
      setSortDir('desc');
    }
  }

  const scrollRef = useRef<HTMLDivElement>(null);

  const virtualizer = useVirtualizer({
    count: rows.length,
    getScrollElement: () => scrollRef.current,
    estimateSize: () => 36,
    overscan: 5,
  });

  const virtualItems = virtualizer.getVirtualItems();
  const totalSize = virtualizer.getTotalSize();
  const paddingTop = virtualItems.length > 0 ? (virtualItems[0]?.start ?? 0) : 0;
  const paddingBottom = virtualItems.length > 0 ? totalSize - (virtualItems.at(-1)?.end ?? 0) : 0;

  return (
    <section className="mt-4 rounded p-2 shadow">
      <h2 className="mb-2 text-sm font-semibold tracking-wide text-gray-500 uppercase">Guild Activity</h2>
      <div className="mb-3 flex flex-col gap-1.5">
        <TimeWindowFilter value={timeWindow} onChange={setTimeWindow} />
        <FilterGroup label="Map" options={MAP_TYPES} active={maps} onToggle={toggleMap} getLabel={getMapLabel} />
        <FilterGroup label="Type" options={OBJECTIVE_TYPES} active={objectiveTypes} onToggle={toggleObjectiveType} />
        <FilterGroup label="Owner" options={OWNER_TYPES} active={owners} onToggle={toggleOwner} />
      </div>
      <div ref={scrollRef} className="h-96 overflow-auto">
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
          <thead className="sticky top-0 z-10 bg-white">
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
              <>
                {paddingTop > 0 && (
                  <tr>
                    <td style={{ height: paddingTop }} />
                  </tr>
                )}
                {virtualItems.map((vItem) => {
                  const row = rows[vItem.index];
                  if (!row) return null;
                  return <GuildTableRow key={row.guild_id} row={row} />;
                })}
                {paddingBottom > 0 && (
                  <tr>
                    <td style={{ height: paddingBottom }} />
                  </tr>
                )}
              </>
            )}
          </tbody>
        </table>
      </div>
    </section>
  );
}
