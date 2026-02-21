import { siteFeatures } from '@gw2w2w/lib/definitions/site-sections';
import SiteLayout from '@gw2w2w/lib/ui/layout/SiteLayout';
import Link from 'next/link';

export default function Home() {
  return (
    <SiteLayout pageHeader="Welcome to gw2w2w.com">
      <div className="mx-auto max-w-2xl lg:max-w-none">
        <Features />
      </div>
    </SiteLayout>
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
