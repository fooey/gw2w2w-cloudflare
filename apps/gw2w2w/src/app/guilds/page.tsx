import { getEmblemSrc } from '@gw2w2w/lib/emblems';
import SiteLayout from '@gw2w2w/lib/ui/layout/SiteLayout';
import clsx from 'clsx';
import Link from 'next/link';

const guildIds = [
  // '4bbb52aa-d768-4fc6-8ede-c299f2822f0f',
  'ArenaNet',
  // '0560f931-40de-e811-81a8-a25fc8b1a2fe',
  // '4b9a0dd5-79e4-e811-81a8-e8b6963692b8',
  'Undefined Guild Name',
  'Dobby is Free',
  'Fellowship and Murder',
  // 'ffffffff-ffff-ffff-ffff-ffffffffffff',
  // 'Äffchen Mit Käffchen',
];

const backgroundClasses = [
  'bg-white',
  'bg-black',
  'bg-linear-to-br from-white to-red-900',
  'bg-linear-to-br from-red-400 to-black',
];

export default function EmblemsPage() {
  return (
    <SiteLayout pageHeader={'Guild Emblems'}>
      <h2 className="mb-4 text-2xl font-bold tracking-tight text-gray-900">Examples</h2>
      <ul>
        {guildIds.map((guildId) => (
          <li key={guildId} className="my-8">
            <h3 className="mb-4 text-lg font-medium text-gray-900">
              <Link href={`/guilds/${guildId}`}>{guildId}</Link>
            </h3>
            <div className="flex gap-8">
              {backgroundClasses.map((backgroundClass) => {
                return (
                  <Link key={backgroundClass} href={`/guilds/${guildId}`}>
                    <img
                      className={clsx(backgroundClass, 'rounded-xl')}
                      src={getEmblemSrc(guildId)}
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
