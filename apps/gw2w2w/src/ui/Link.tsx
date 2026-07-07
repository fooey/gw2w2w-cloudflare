import type { LinkProps } from 'next/link';
import NextLink from 'next/link';

export function Link({ prefetch = false, ...props }: LinkProps & React.AnchorHTMLAttributes<HTMLAnchorElement>) {
  return <NextLink prefetch={prefetch} {...props} />;
}
