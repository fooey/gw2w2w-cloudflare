import { homePageAttributes, siteFeatures } from '@gw2w2w/lib/definitions/site-sections';
import SiteLayout from '@gw2w2w/ui/layout/SiteLayout';
import Link from 'next/link';

export default function Home() {
  return (
    <SiteLayout>
      <div className="mx-auto max-w-2xl lg:max-w-none">
        <Hero />
        <Features />
      </div>
    </SiteLayout>
  );
}

function Hero() {
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

function Features() {
  return (
    <dl className="grid max-w-2xl grid-cols-1 gap-x-8 gap-y-16">
      {siteFeatures.map((section) => (
        <div key={section.name} className="flex flex-col">
          <dt className="flex items-center gap-x-3 text-base/7 font-semibold text-gray-900">
            <section.icon aria-hidden="true" className="size-5 flex-none text-rose-900" />
            <Link href={section.href} className="text-gray-900 hover:text-gray-700">
              {section.name}
            </Link>
          </dt>
          <dd className="mt-4 flex flex-auto flex-col text-base/7 text-gray-600">
            <p className="flex-auto">{section.description}</p>
            <p className="mt-6">
              <Link href={section.href} className="text-sm/6 font-semibold text-rose-900 hover:text-rose-900/50">
                Explore <span aria-hidden="true">→</span>
              </Link>
            </p>
          </dd>
        </div>
      ))}
    </dl>
  );
}
