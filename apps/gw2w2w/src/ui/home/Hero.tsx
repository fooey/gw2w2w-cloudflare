import { homePageAttributes } from '#lib/definitions/site-sections';
import { Link } from '#ui/Link';

export function Hero() {
  return (
    <div className="mb-16 border-b border-gray-200 pb-16">
      <h1 className="text-4xl font-bold tracking-tight text-gray-900 sm:text-5xl">gw2w2w.com</h1>
      <p className="mt-4 max-w-2xl text-xl/8 text-gray-600">{homePageAttributes.description}</p>
      <div className="mt-8 flex flex-wrap gap-4">
        <Link
          href="/guilds"
          className="rounded-md bg-rose-900 px-4 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-rose-800 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-rose-900"
        >
          Look up a guild emblem
        </Link>
        <Link
          href="/designer"
          className="rounded-md border border-gray-300 bg-white px-4 py-2.5 text-sm font-semibold text-gray-900 shadow-sm hover:bg-gray-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-gray-900"
        >
          Open the designer
        </Link>
      </div>
    </div>
  );
}
