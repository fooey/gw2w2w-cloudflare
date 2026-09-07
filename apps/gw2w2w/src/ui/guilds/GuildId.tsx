import { href } from 'react-router';

import { Link } from '#ui/Link';

export function GuildId({ guildId }: { guildId: string }) {
  return (
    <p className="text-sm text-gray-700">
      <span>Guild ID: </span>
      <Link href={href('/guilds/:guildId', { guildId })} className="text-rose-900">
        {guildId}
      </Link>
    </p>
  );
}
