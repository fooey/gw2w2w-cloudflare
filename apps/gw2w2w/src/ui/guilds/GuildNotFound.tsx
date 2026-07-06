import { MagnifyingGlassIcon } from '@heroicons/react/24/outline';

import { GuildSearch } from '#ui/guilds/guild-search/GuildSearch';

export function GuildNotFound({ guildId }: { guildId: string }) {
  return (
    <div className="flex flex-col items-center gap-4 py-16 text-center">
      <MagnifyingGlassIcon className="size-16 text-gray-300" />
      <div className="flex flex-col gap-1">
        <h2 className="text-lg font-semibold text-gray-900">
          No guild found for &quot;{decodeURIComponent(guildId)}&quot;
        </h2>
        <p className="text-sm text-gray-500">Try searching by exact guild name or UUID.</p>
      </div>
      <GuildSearch defaultValue={decodeURIComponent(guildId)} />
    </div>
  );
}
