'use client';

import { getEmblemSrc } from '@gw2w2w/lib/emblems';
import { getTimeCutoff, OBJECTIVE_TYPES, OWNER_TYPES, useLogFilters } from '@gw2w2w/lib/store/logFilters';
import { type ClaimEvent, useObjectiveLog } from '@gw2w2w/lib/store/objectiveLog';
import { cn } from '@gw2w2w/lib/utils/cn';
import { useGuild } from '@gw2w2w/lib/wvw/useGuild';
import { ObjectiveIcon } from '@gw2w2w/ui/wvw/common/ObjectiveIcon';
import { MAP_TYPES, teamColorConfig } from '@gw2w2w/ui/wvw/config/teamColorConfig';
import { FilterGroup, TimeWindowFilter } from '@gw2w2w/ui/wvw/matchup/LogFilterGroup';
import { getMapLabel } from '@gw2w2w/ui/wvw/matchup/ObjectiveLogsRow';
import Link from 'next/link';
import { useState } from 'react';

const ACTIVITY_OBJ_TYPES = ['Castle', 'Keep', 'Tower', 'Camp'] as const;
type ActivityObjType = (typeof ACTIVITY_OBJ_TYPES)[number];

type SortKey = ActivityObjType | 'total' | 'lastActivity';
type SortDir = 'asc' | 'desc';

interface GuildStats {
  guildId: string;
  byType: Record<ActivityObjType, number>;
  total: number;
  lastActivity: Temporal.Instant;
  lastActivityMap: string;
  lastActivityOwner: string;
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

function GuildActivityRow({ stats }: { stats: GuildStats }) {
  const guildQuery = useGuild(stats.guildId);
  const guild = guildQuery.data;
  const teamText = (teamColorConfig as Record<string, { text: string } | undefined>)[stats.lastActivityOwner]?.text;

  return (
    <tr className="border-t border-gray-100 hover:bg-gray-50">
      <td className="w-px px-2 py-1 whitespace-nowrap">
        <Link
          href={`/guilds/${guild?.name ? encodeURIComponent(guild.name) : stats.guildId}`}
          title={guild ? `${guild.name} [${guild.tag}]` : stats.guildId}
        >
          <img
            src={getEmblemSrc(stats.guildId)}
            alt={guild?.name ?? 'Guild Emblem'}
            width={20}
            height={20}
            className="shrink-0"
            onError={(e) => {
              (e.currentTarget as HTMLImageElement).style.visibility = 'hidden';
            }}
          />
        </Link>
      </td>
      <td className={cn('w-px px-2 py-1 font-mono text-xs whitespace-nowrap', teamText)}>
        <Link href={`/guilds/${guild?.name ? encodeURIComponent(guild.name) : stats.guildId}`}>
          [{guild?.tag ?? '…'}]
        </Link>
      </td>
      <td className={cn('px-2 py-1 text-sm font-medium', teamText)}>
        <Link href={`/guilds/${guild?.name ? encodeURIComponent(guild.name) : stats.guildId}`}>
          {guild?.name ?? stats.guildId}
        </Link>
      </td>
      {ACTIVITY_OBJ_TYPES.map((type) => (
        <td
          key={type}
          className="w-px min-w-10 px-2 py-1 text-center text-sm whitespace-nowrap text-gray-700 tabular-nums"
        >
          {stats.byType[type]}
        </td>
      ))}
      <td className="w-px px-2 py-1 text-center text-sm font-semibold whitespace-nowrap text-gray-800 tabular-nums">
        {stats.total}
      </td>
      <td className="w-px px-2 py-1 text-right font-mono text-xs whitespace-nowrap text-gray-400">
        <span>{getMapLabel(stats.lastActivityMap)}</span>
        <span className="ml-2">
          {stats.lastActivity.toLocaleString(undefined, {
            weekday: 'short',
            hour: '2-digit',
            minute: '2-digit',
          })}
        </span>
      </td>
    </tr>
  );
}

interface GuildActivityProps {
  matchId: string;
}

export function GuildActivity({ matchId }: GuildActivityProps) {
  const allEvents = useObjectiveLog((state) => state.events);
  const { maps, objectiveTypes, owners, timeWindow, toggleMap, toggleObjectiveType, toggleOwner, setTimeWindow } =
    useLogFilters();

  const [sortKey, setSortKey] = useState<SortKey>('lastActivity');
  const [sortDir, setSortDir] = useState<SortDir>('desc');

  const cutoff = getTimeCutoff(timeWindow);

  const claimEvents = allEvents.filter(
    (e): e is ClaimEvent =>
      e.type === 'claim' &&
      e.matchId === matchId &&
      maps.includes(e.mapType) &&
      objectiveTypes.includes(e.objectiveType) &&
      owners.includes(e.owner) &&
      (cutoff === null || Temporal.Instant.compare(e.at, cutoff) >= 0),
  );

  // Aggregate by guild
  const statsByGuild = new Map<string, GuildStats>();
  for (const event of claimEvents) {
    const existing = statsByGuild.get(event.claimedBy);
    const type = event.objectiveType as ActivityObjType;
    if (!ACTIVITY_OBJ_TYPES.includes(type)) continue;

    if (!existing) {
      statsByGuild.set(event.claimedBy, {
        guildId: event.claimedBy,
        byType: { Castle: 0, Keep: 0, Tower: 0, Camp: 0, [type]: 1 },
        total: 1,
        lastActivity: event.at,
        lastActivityMap: event.mapType,
        lastActivityOwner: event.owner,
      });
    } else {
      existing.byType[type] += 1;
      existing.total += 1;
      if (Temporal.Instant.compare(event.at, existing.lastActivity) > 0) {
        existing.lastActivity = event.at;
        existing.lastActivityMap = event.mapType;
        existing.lastActivityOwner = event.owner;
      }
    }
  }

  const rows = [...statsByGuild.values()].sort((a, b) => {
    let cmp: number;
    if (sortKey === 'lastActivity') {
      cmp = Temporal.Instant.compare(a.lastActivity, b.lastActivity);
    } else if (sortKey === 'total') {
      cmp = a.total - b.total;
    } else {
      cmp = a.byType[sortKey] - b.byType[sortKey];
    }
    return sortDir === 'desc' ? -cmp : cmp;
  });

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
      {rows.length === 0 ? (
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
              {rows.map((stats) => (
                <GuildActivityRow key={stats.guildId} stats={stats} />
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}
