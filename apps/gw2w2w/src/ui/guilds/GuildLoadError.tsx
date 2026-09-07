import { ExclamationTriangleIcon } from '@heroicons/react/24/outline';

import { decodeSafe } from '#lib/utils/decodeSafe';
import { GuildSearch } from '#ui/guilds/guild-search/GuildSearch';

/**
 * Shown when the guild lookup failed upstream, as distinct from the guild not existing. The route
 * pairs this with a 503, so users, crawlers and link unfurlers are never told a guild is absent
 * when the truth is only that the service could not be reached.
 */
export function GuildLoadError({ guildId }: { guildId: string }) {
  return (
    <div className="flex flex-col items-center gap-4 py-16 text-center">
      <ExclamationTriangleIcon className="size-16 text-amber-400" />
      <div className="flex flex-col gap-1">
        <h2 className="text-lg font-semibold text-gray-900">Could not load &quot;{decodeSafe(guildId)}&quot;</h2>
        <p className="text-sm text-gray-500">
          The guild service is not responding right now. This is temporary — try again in a moment.
        </p>
      </div>
      <GuildSearch defaultValue={decodeSafe(guildId)} />
    </div>
  );
}
