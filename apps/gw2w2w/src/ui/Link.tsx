import NextLink, { type LinkProps } from 'next/link';

export default function Link({
  prefetch = false,
  ...props
}: LinkProps & React.AnchorHTMLAttributes<HTMLAnchorElement>) {
  return <NextLink prefetch={prefetch} {...props} />;
}
