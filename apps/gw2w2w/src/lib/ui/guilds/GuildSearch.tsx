import { searchGuild } from '@gw2w2w/lib/ui/guilds/actions';
import { MagnifyingGlassIcon } from '@heroicons/react/20/solid';

export function GuildSearch({ defaultValue }: { defaultValue?: string }) {
  return (
    <form action={searchGuild} className="flex items-center gap-2">
      <input
        type="search"
        name="guild"
        placeholder="Search guild…"
        defaultValue={defaultValue}
        className="rounded-md border border-gray-300 px-3 py-1.5 text-sm shadow-sm focus:border-rose-500 focus:ring-1 focus:ring-rose-500 focus:outline-none"
      />
      <button
        type="submit"
        className="rounded-md bg-rose-800 px-2 py-1.5 text-white shadow-sm hover:bg-rose-700 focus:ring-2 focus:ring-rose-500 focus:outline-none"
      >
        <MagnifyingGlassIcon className="size-4" />
      </button>
    </form>
  );
}
