'use client';

import { type Lang } from '@gw2w2w/ui/wvw/config/lang';
import { MatchScoreboard } from '@gw2w2w/ui/wvw/matchup/MatchScoreboard';
import { type WvWMatch } from '@service-api/lib/resources/wvw/matches';
import Link from 'next/link';

export function MatchupRow({ match, lang }: { match: WvWMatch; lang: Lang }) {
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
