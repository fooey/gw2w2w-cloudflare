'use client';

import { type Lang } from '#ui/wvw/config/lang';
import { MatchScoreboard } from '#ui/wvw/shared/MatchScoreboard';
import { type WvWMatchStripped } from '@repo/service-api/types';
import Link from '#ui/Link';

export function MatchupRow({ match, lang }: { match: WvWMatchStripped; lang: Lang }) {
  return (
    <li className="my-4 flex flex-row items-center">
      <div className="w-10">
        <Link href={`/wvw/matchups/${match.id}`}>{match.id}</Link>
      </div>
      <div className="w-full">
        <MatchScoreboard match={match} lang={lang} />
      </div>
    </li>
  );
}
