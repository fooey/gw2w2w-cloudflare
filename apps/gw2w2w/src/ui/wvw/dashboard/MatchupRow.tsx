import { href } from 'react-router';

import type { WvWMatch } from '@repo/service-api/types';

import type { Lang } from '#ui/wvw/config/lang';
import { Link } from '#ui/Link';
import { MatchScoreboard } from '#ui/wvw/shared/MatchScoreboard';

export function MatchupRow({ match, lang }: { match: WvWMatch; lang: Lang }) {
  return (
    <li className="my-4 flex flex-row items-center">
      <div className="w-10">
        <Link href={href('/wvw/matchups/:slug', { slug: match.id })}>{match.id}</Link>
      </div>
      <div className="w-full">
        <MatchScoreboard match={match} lang={lang} />
      </div>
    </li>
  );
}
