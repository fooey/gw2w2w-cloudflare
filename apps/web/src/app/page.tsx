/* eslint-disable @next/next/no-img-element */

import clsx from 'clsx';

const guildIds = [
  '4bbb52aa-d768-4fc6-8ede-c299f2822f0f',
  '0560f931-40de-e811-81a8-a25fc8b1a2fe',
  // '4b9a0dd5-79e4-e811-81a8-e8b6963692b8',
  '97c007dc-87d5-e311-9621-ac162dae8acd',
  '41db3c08-78c3-e611-80d4-e4115beba648',
  'ffffffff-ffff-ffff-ffff-ffffffffffff',
];

const backgroundClasses = [
  'bg-white',
  'bg-black',
  'bg-linear-to-br from-white to-red-900',
  'bg-linear-to-br from-red-400 to-black',
];

export default function Home() {
  return (
    <div className="flex items-center justify-center bg-zinc-50 font-sans text-zinc-900">
      <main className="flex max-w-3xl flex-col items-center justify-between p-16 bg-white sm:items-start">
        <div className="flex flex-col items-center gap-6 text-center sm:items-start sm:text-left">
          <ul>
            {guildIds.map((guildId) => (
              <li key={guildId} className="my-4">
                <div className="flex gap-4">
                  {backgroundClasses.map((backgroundClass) => (
                    <img
                      key={backgroundClass}
                      className={clsx(backgroundClass, 'rounded-xl')}
                      src={`http://127.0.0.1:8787/emblem/${guildId}`}
                      alt="Emblem"
                      width={128}
                      height={128}
                    />
                  ))}
                </div>
                <div>{guildId}</div>
              </li>
            ))}
          </ul>
        </div>
      </main>
    </div>
  );
}
