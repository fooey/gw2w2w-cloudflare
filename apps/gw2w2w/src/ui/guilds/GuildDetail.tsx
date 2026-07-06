import type { Guild } from '@repo/service-api/types';

import { Card } from '#ui/Card';
import { GuildEmblemGrid } from '#ui/guilds/GuildEmblemGrid';
import { GuildEmblemUsage } from '#ui/guilds/GuildEmblemUsage';
import { GuildId } from '#ui/guilds/GuildId';
import { GuildOpenInDesigner } from '#ui/guilds/GuildOpenInDesigner';
import { Link } from '#ui/Link';

interface GuildDetailProps {
  guild: Guild;
}

export function GuildDetail({ guild }: GuildDetailProps) {
  return (
    <div className="flex flex-col gap-8">
      <header className="flex flex-col gap-2">
        <h2 className="text-2xl font-bold tracking-tight text-gray-900">
          <Link href={`/guilds/${guild.name}`}>
            {guild.name} [{guild.tag}]
          </Link>
        </h2>
        <h3 className="flex flex-col">
          <GuildId guildId={guild.id} />
        </h3>
      </header>

      {guild.emblem ? (
        <GuildEmblemGrid guildId={guild.id} />
      ) : (
        <Card title="No Emblem">
          <p className="text-sm text-gray-500">This guild has not set a custom emblem.</p>
        </Card>
      )}

      {guild.emblem && <GuildOpenInDesigner emblem={guild.emblem} />}

      <GuildEmblemUsage guildId={guild.id} guildName={guild.name} />
    </div>
  );
}
