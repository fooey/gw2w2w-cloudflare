import { demoGuilds } from '#lib/definitions/demo-guilds';
import { emblemBackgroundClasses } from '#lib/definitions/emblem-backgrounds';
import { getEmblemSrc } from '#lib/emblems';
import Link from '#ui/Link';
import clsx from 'clsx';

export function DemoGuildList() {
  return (
    <main>
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
              {emblemBackgroundClasses.map((backgroundClass) => (
                <Link key={backgroundClass} href={`/guilds/${guild.name}`}>
                  <img
                    className={clsx(backgroundClass, 'rounded-xl')}
                    src={getEmblemSrc(guild.id)}
                    alt="Emblem"
                    width={128}
                    height={128}
                  />
                </Link>
              ))}
            </div>
          </li>
        ))}
      </ul>
    </main>
  );
}
