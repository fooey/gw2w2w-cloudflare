import { emblemBackgroundClasses } from '@gw2w2w/lib/definitions/emblem-backgrounds';
import { getEmblemSrc } from '@gw2w2w/lib/emblems';
import { GuildSearch } from '@gw2w2w/ui/guilds/guild-search/GuildSearch';
import SiteLayout from '@gw2w2w/ui/layout/SiteLayout';
import { type Guild } from '@service-api/lib/types';
import clsx from 'clsx';
import Link from 'next/link';

const demoGuilds: Pick<Guild, 'id' | 'name' | 'tag'>[] = [
  {
    id: '4BBB52AA-D768-4FC6-8EDE-C299F2822F0F',
    name: 'ArenaNet',
    tag: 'ArenaNet',
  },
  {
    id: '97C007DC-87D5-E311-9621-AC162DAE8ACD',
    name: 'Undefined Guild Name',
    tag: 'NULL',
  },
  {
    id: '9C05A42C-1F3A-EE11-8465-02315AB41281',
    name: 'Dobby Is Free',
    tag: 'SOCK',
  },
  {
    id: '94698BF8-5519-EF11-BA1F-12061042B485',
    name: 'Fellowship And Murder',
    tag: 'FAM',
  },
];

export default function EmblemsPage() {
  return (
    <SiteLayout pageHeader={'Guild Emblems'} headerActions={<GuildSearch />}>
      <h2 className="mb-4 text-2xl font-bold tracking-tight text-gray-900">Examples</h2>
      <ul>
        {demoGuilds.map((guild) => (
          <li key={guild.id} className="my-8">
            <h3 className="mb-3 flex items-baseline gap-2 border-b border-gray-200 pb-2">
              <Link
                href={`/guilds/${guild.name}`}
                className="text-lg font-semibold text-gray-900 hover:text-indigo-600"
              >
                {guild.name}
              </Link>
              <span className="text-sm font-medium text-gray-400">[{guild.tag}]</span>
            </h3>
            <div className="grid grid-cols-3 gap-3 md:grid-cols-5">
              {emblemBackgroundClasses.map((backgroundClass) => {
                return (
                  <Link key={backgroundClass} href={`/guilds/${guild.name}`}>
                    <img
                      className={clsx(backgroundClass, 'rounded-xl')}
                      src={getEmblemSrc(guild.id)}
                      alt="Emblem"
                      width={128}
                      height={128}
                    />
                  </Link>
                );
              })}
            </div>
          </li>
        ))}
      </ul>
    </SiteLayout>
  );
}
