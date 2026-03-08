'use client';

import { Highlight, WvWTeamGuild } from '@gw2w2w/app/wvw/teams/[teamName]/WvWTeamGuild';
import type { Guild } from '@repo/service-api/lib/types';
import { matchSorter } from 'match-sorter';
import Link from 'next/link';
import { useState } from 'react';

export function WvWTeamGuildFilter({ guilds }: { guilds: Guild[] }) {
  const [query, setQuery] = useState('');

  const filtered = query ? matchSorter(guilds, query, { keys: ['tag', 'name'] }) : guilds;

  const guildsWithEmblems = filtered.filter((g) => g.emblem);
  const guildsWithoutEmblems = filtered.filter((g) => !g.emblem);

  return (
    <div className="space-y-6">
      <input
        type="search"
        placeholder="Filter by name or tag…"
        value={query}
        onChange={(e) => {
          setQuery(e.target.value);
        }}
        className="block w-full max-w-sm rounded-md bg-white px-3 py-1.5 text-sm text-gray-900 outline-1 -outline-offset-1 outline-gray-300 placeholder:text-gray-400 focus:outline-2 focus:-outline-offset-2 focus:outline-indigo-600"
      />

      <div className="grid grid-cols-[repeat(auto-fill,minmax(128px,1fr))] gap-4">
        {guildsWithEmblems.map((guild) => (
          <WvWTeamGuild key={guild.id} guild={guild} query={query} />
        ))}
      </div>

      {guildsWithoutEmblems.length > 0 && (
        <ul className="space-y-1">
          {guildsWithoutEmblems.map((guild) => (
            <li key={guild.id} className="text-center">
              <Link href={`/guilds/${guild.id}`} className="text-sm text-gray-700 hover:text-gray-900">
                <Highlight text={guild.name} query={query} /> [<Highlight text={guild.tag} query={query} />]
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
