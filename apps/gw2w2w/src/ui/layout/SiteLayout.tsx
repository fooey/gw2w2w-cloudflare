import { cn } from '#lib/utils/cn';
import { LocalTimestamp } from '#ui/LocalTimestamp';
import { SiteNav } from '#ui/layout/SiteNav';

interface SiteLayoutProps {
  pageHeader?: React.ReactNode;
  headerActions?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
  classNameInner?: string;
  classNameOuter?: string;
}

function SiteHeader({ pageHeader, headerActions }: Pick<SiteLayoutProps, 'pageHeader' | 'headerActions'>) {
  if (!pageHeader && !headerActions) return null;
  return (
    <header>
      <div className="mx-auto flex max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
        {pageHeader ? <h1 className="text-3xl font-bold tracking-tight text-gray-900">{pageHeader}</h1> : null}
        {headerActions ? <div className="flex items-center">{headerActions}</div> : null}
      </div>
    </header>
  );
}

function SiteFooter() {
  return (
    <footer className="mt-auto border-t border-gray-200 py-6">
      <div className="mx-auto max-w-7xl space-y-1 px-4 sm:px-6 lg:px-8">
        <p className="text-xs text-gray-500">
          gw2w2w.com is an unofficial fan site and is not affiliated with or endorsed by ArenaNet or NCSoft.
        </p>
        <p className="text-xs text-gray-500">
          Guild Wars 2 and all related content, artwork, and trademarks are the property of ArenaNet, LLC.
        </p>
        <p className="mt-3 font-mono text-xs text-gray-400">
          {process.env.NEXT_PUBLIC_BUILD_TIMESTAMP ? (
            <LocalTimestamp value={process.env.NEXT_PUBLIC_BUILD_TIMESTAMP} />
          ) : (
            'dev'
          )}{' '}
          &middot; {process.env.NEXT_PUBLIC_BUILD_HASH ?? 'dev'}
        </p>
      </div>
    </footer>
  );
}

export default function SiteLayout({
  pageHeader,
  headerActions,
  children,
  className,
  classNameInner,
  classNameOuter,
}: SiteLayoutProps) {
  return (
    <div className={cn('flex min-h-full flex-col', classNameOuter)}>
      <SiteNav />
      <main className={cn('py-10', className)}>
        <SiteHeader pageHeader={pageHeader} headerActions={headerActions} />
        <section>
          <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
            <div className="bg-white">
              <div className={cn('mx-auto max-w-7xl p-6 lg:p-8', classNameInner)}>{children}</div>
            </div>
          </div>
        </section>
      </main>
      <SiteFooter />
    </div>
  );
}

export function SiteLayoutFullWidth({
  pageHeader,
  headerActions,
  children,
  className,
  classNameInner,
  classNameOuter,
}: SiteLayoutProps) {
  return (
    <div className={cn('flex min-h-full flex-col', classNameOuter)}>
      <SiteNav />
      <main className={cn('py-10', className)}>
        <SiteHeader pageHeader={pageHeader} headerActions={headerActions} />
        <section>
          <div className={cn('px-4 py-8 sm:px-6 lg:px-8', classNameInner)}>{children}</div>
        </section>
      </main>
      <SiteFooter />
    </div>
  );
}
