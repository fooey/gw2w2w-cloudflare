import { getEmblemSrc } from '@gw2w2w/lib/emblems';
import type { Guild } from '@repo/service-api/lib/types';
import Link from 'next/link';

export function WvWTeamGuild({ guild }: { guild: Guild }) {
  return (
    <div key={guild.id} className="w-32">
      <div className="text-center">
        <Link href={`/guilds/${guild.id}`}>
          <img src={getEmblemSrc(guild.id)} width={128} height={128} loading="lazy" />
        </Link>
      </div>
      <div className="text-center text-xs text-balance">
        <Link href={`/guilds/${guild.id}`}>
          {guild.name} [{guild.tag}]
        </Link>
      </div>
    </div>
  );
}
