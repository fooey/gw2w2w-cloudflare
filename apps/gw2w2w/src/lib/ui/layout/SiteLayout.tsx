import { SiteNav } from '@gw2w2w/lib/ui/layout/SiteNav';

export default function SiteLayout({
  pageHeader,
  children,
}: {
  pageHeader?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-full">
      <SiteNav />

      <div className="py-10">
        {pageHeader ? (
          <header>
            <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
              <h1 className="text-3xl font-bold tracking-tight text-gray-900">{pageHeader}</h1>
            </div>
          </header>
        ) : null}

        <main>
          <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
            <div className="bg-white">
              <div className="mx-auto max-w-7xl p-6 lg:p-8">{children}</div>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}
