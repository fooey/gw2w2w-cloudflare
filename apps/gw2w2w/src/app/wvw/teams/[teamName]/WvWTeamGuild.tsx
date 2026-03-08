import { getEmblemSrc } from '@gw2w2w/lib/emblems';
import type { Guild } from '@repo/service-api/lib/types';
import Link from 'next/link';

export function Highlight({ text, query }: { text: string; query: string }) {
  if (!query) return <>{text}</>;
  const index = text.toLowerCase().indexOf(query.toLowerCase());
  if (index === -1) return <>{text}</>;
  return (
    <>
      {text.slice(0, index)}
      <mark className="rounded bg-yellow-200 text-inherit">{text.slice(index, index + query.length)}</mark>
      {text.slice(index + query.length)}
    </>
  );
}

export function WvWTeamGuild({ guild, query = '' }: { guild: Guild; query?: string }) {
  return (
    <div key={guild.id} className="w-32">
      <div className="text-center">
        <Link href={`/guilds/${guild.id}`}>
          <img src={getEmblemSrc(guild.id)} width={128} height={128} loading="lazy" />
        </Link>
      </div>
      <div className="text-center text-xs text-balance">
        <Link href={`/guilds/${guild.id}`}>
          <Highlight text={guild.name} query={query} /> [<Highlight text={guild.tag} query={query} />]
        </Link>
      </div>
    </div>
  );
}
