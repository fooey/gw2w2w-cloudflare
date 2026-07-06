'use client';

import { useQuery, type UseQueryOptions } from '@tanstack/react-query';
import clsx from 'clsx';

import type { WvWMatch } from '@repo/service-api/types';
import { withJitter } from '@repo/utils';

import { getClientApi } from '#lib/api/api.client.ts';
import { fetchWvwMatchesService } from '#lib/api/gw2/wvw/matches';
import { useUserPrefs } from '#lib/store/userPrefs';
import { LANGS } from '#ui/wvw/config/lang';

import { MatchupRow } from './MatchupRow';

const matchupRegions = [
  { name: 'North America', matchPrefix: '1' },
  { name: 'Europe', matchPrefix: '2' },
];

function useMatches(queryOptions: Partial<UseQueryOptions<WvWMatch[] | null>>) {
  return useQuery({
    queryKey: ['wvwMatches'],
    queryFn: async () => fetchWvwMatchesService(getClientApi()),
    refetchInterval: () => withJitter(60_000, 0.5),
    staleTime: 60_000,
    refetchOnWindowFocus: true,
    refetchIntervalInBackground: true,
    ...queryOptions,
  });
}

interface DashboardProps {
  matches: WvWMatch[] | null;
}

export function Dashboard({ matches }: DashboardProps) {
  const lang = useUserPrefs((s) => s.lang);
  const setLang = useUserPrefs((s) => s.setLang);

  const matchesQuery = useMatches({ initialData: matches });

  if (matchesQuery.isLoading) {
    return <div>Loading...</div>;
  } else if (matchesQuery.isError) {
    return <div>Error: {matchesQuery.error.message}</div>;
  } else if (!matchesQuery.data) {
    return <div>No data</div>;
  }

  const matchesData = matchesQuery.data;

  return (
    <>
      {matchupRegions.map(({ name, matchPrefix }) => (
        <div key={name}>
          <header className="mb-4 flex items-center justify-between">
            <h2 className="text-2xl font-bold tracking-tight text-gray-900">{name} Matchups</h2>
            <div className="flex gap-1">
              {LANGS.map((l) => (
                <button
                  key={l}
                  type="button"
                  onClick={() => {
                    setLang(l);
                  }}
                  className={clsx(
                    'cursor-pointer px-2 py-1 text-sm uppercase',
                    lang === l ? 'font-bold text-gray-900' : 'text-gray-400 hover:text-gray-600',
                  )}
                >
                  {l}
                </button>
              ))}
            </div>
          </header>
          <ul>
            {matchesData
              .filter((match) => match.id.startsWith(matchPrefix))
              .map((match) => (
                <MatchupRow key={match.id} match={match} lang={lang} />
              ))}
          </ul>
        </div>
      ))}
    </>
  );
}
