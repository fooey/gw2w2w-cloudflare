import { href, isRouteErrorResponse, Links, Meta, Outlet, Scripts, ScrollRestoration } from 'react-router';

import { SiteLayout } from '#ui/layout/SiteLayout';
import { Link } from '#ui/Link';
import { NavigationProgress } from '#ui/NavigationProgress';
import { UpdateNotifier } from '#ui/UpdateNotifier';

import type { Route } from './+types/root';

import './globals.css';

export const meta: Route.MetaFunction = () => [
  { title: 'gw2w2w.com - Guild Wars 2 Utilities' },
  {
    name: 'description',
    content: 'Guild Wars 2 Utilities. Guild emblem rendering, emblem designer, and WvW objective status.',
  },
];

export const links: Route.LinksFunction = () => [
  // Only one icon link: both entries pointed at /favicon.ico, so browsers fetched the same
  // redirect twice on every cold load. apple-touch-icon wants a PNG anyway, not an .ico.
  { rel: 'icon', href: '/favicon.ico' },
];

export function Layout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className="h-full bg-zinc-50" suppressHydrationWarning>
      <head>
        <meta charSet="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <Meta />
        <Links />
      </head>
      <body className="h-full font-sans text-zinc-900 antialiased" suppressHydrationWarning>
        <NavigationProgress />
        <UpdateNotifier />
        {children}
        <ScrollRestoration />
        <Scripts />
      </body>
    </html>
  );
}

export default function App() {
  return <Outlet />;
}

/**
 * Catches anything not handled by a route-level ErrorBoundary. Thrown 404 responses and
 * render-time errors both arrive here, so the 404 case is distinguished explicitly.
 */
export function ErrorBoundary({ error }: Route.ErrorBoundaryProps) {
  if (isRouteErrorResponse(error) && error.status === 404) {
    return (
      <SiteLayout pageHeader="Not Found">
        <div>
          <h2>Not Found</h2>
          <p>Could not find requested resource</p>
          <br />
          <Link href={href('/')}>Return Home</Link>
        </div>
      </SiteLayout>
    );
  }

  const details =
    isRouteErrorResponse(error) && error.statusText !== '' ? error.statusText : 'An unexpected error occurred.';

  return (
    <SiteLayout pageHeader="Error">
      <div className="space-y-4">
        <p className="text-gray-700">{details}</p>
        {import.meta.env.DEV && error instanceof Error ? (
          <pre className="w-full overflow-x-auto rounded bg-zinc-100 p-4 text-xs">
            <code>{error.stack}</code>
          </pre>
        ) : null}
        <Link href={href('/')} className="text-indigo-600 hover:underline">
          Return Home
        </Link>
      </div>
    </SiteLayout>
  );
}
