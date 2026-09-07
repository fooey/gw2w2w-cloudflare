import type { PrefetchBehavior } from 'react-router';
import { Link as RouterLink } from 'react-router';

/** Absolute URLs (https:, mailto:, protocol-relative) must not go through the client router. */
function isExternal(href: string): boolean {
  return /^[a-z][a-z0-9+.-]*:/iu.test(href) || href.startsWith('//');
}

/**
 * Wraps React Router's Link (which takes `to`) behind an `href` prop, so link behaviour is
 * configured in one place rather than at ~40 call sites.
 *
 * Defaults to `prefetch="intent"`: the route module and its loader data are preloaded on
 * hover/focus, making navigation feel instant without speculatively hitting service-api for every
 * link in the viewport. Pass an explicit strategy to opt out per link.
 */
export function Link({
  href,
  prefetch = 'intent',
  ...props
}: { href: string; prefetch?: PrefetchBehavior } & React.AnchorHTMLAttributes<HTMLAnchorElement>) {
  if (isExternal(href)) {
    return <a href={href} {...props} />;
  }

  return <RouterLink to={href} prefetch={prefetch} {...props} />;
}
