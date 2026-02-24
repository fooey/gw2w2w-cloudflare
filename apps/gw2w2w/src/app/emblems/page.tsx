import { getEmblemSrc } from '@gw2w2w/lib/emblems';
import SiteLayout from '@gw2w2w/lib/ui/layout/SiteLayout';
import clsx from 'clsx';
import Link from 'next/link';

const guildIds = [
  '4bbb52aa-d768-4fc6-8ede-c299f2822f0f',
  'ArenaNet',
  '0560f931-40de-e811-81a8-a25fc8b1a2fe',
  // // '4b9a0dd5-79e4-e811-81a8-e8b6963692b8',
  // '97c007dc-87d5-e311-9621-ac162dae8acd',
  // '41db3c08-78c3-e611-80d4-e4115beba648',
  // 'ffffffff-ffff-ffff-ffff-ffffffffffff',
  // '48cdb90b-75be-e811-81aa-bef9b8c3e82e',
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
      <ul>
        {guildIds.map((guildId) => (
          <li key={guildId} className="my-4">
            <div className="flex gap-4">
              {backgroundClasses.map((backgroundClass) => {
                return (
                  <img
                    key={backgroundClass}
                    className={clsx(backgroundClass, 'rounded-xl')}
                    src={getEmblemSrc(guildId)}
                    alt="Emblem"
                    width={128}
                    height={128}
                  />
                );
              })}
            </div>
            <div>
              <Link href={`/guilds/${guildId}`}>{guildId}</Link>
            </div>
          </li>
        ))}
      </ul>
      10, 14, 17, 21 (upgrading 22)
    </SiteLayout>
  );
}
