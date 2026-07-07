import { demoGuilds } from '#lib/definitions/demo-guilds';
import { Link } from '#ui/Link';

import { GuildEmblemGrid } from './GuildEmblemGrid';

export function DemoGuildList() {
  return (
    <main>
      <h2 className="mb-4 text-2xl font-bold tracking-tight text-gray-900">Examples</h2>
      <ul>
        {demoGuilds.map((guild) => (
          <li key={guild.id} className="my-8">
            <GuildEmblemGrid
              guildId={guild.id}
              linkHref={`/guilds/${guild.name}`}
              title={
                <>
                  <Link href={`/guilds/${guild.name}`} className="hover:text-indigo-600">
                    {guild.name}
                  </Link>
                  <span className="ml-2 text-sm font-medium text-gray-400">[{guild.tag}]</span>
                </>
              }
            />
          </li>
        ))}
      </ul>
    </main>
  );
}
