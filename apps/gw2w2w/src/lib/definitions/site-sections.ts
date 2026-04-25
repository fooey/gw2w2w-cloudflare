import { HomeIcon, MapPinIcon, PencilSquareIcon, PhotoIcon } from '@heroicons/react/20/solid';
import filter from 'lodash-es/filter';

export interface SiteSections {
  name: string;
  href: string;
  icon: React.ComponentType<React.SVGProps<SVGSVGElement>>;
  description: string;
  isFeature: boolean;
  isCurrent: (pathname: string) => boolean;
}

export const homePageAttributes: SiteSections = {
  name: 'gw2w2w.com',
  href: '/',
  icon: HomeIcon,
  isFeature: false,
  description: 'Guild Wars 2 tools for players. Look up guild emblems, design your own, and track WvW activity.',
  isCurrent: (pathname: string) => pathname === '/',
} as const;

export const emblemPageAttributes: SiteSections = {
  name: 'Guild Emblems',
  href: '/guilds',
  icon: PhotoIcon,
  isFeature: true,
  description:
    'Pixel-perfect rendering of Guild Wars 2 guild emblems, served as WebP from the cloud. Hotlink any emblem directly by guild name or ID — no API key required. Perfect for websites, forums, Discord profile pictures, and applications.',
  isCurrent: (pathname: string) => pathname.startsWith('/guilds'),
} as const;

export const designerPageAttributes: SiteSections = {
  name: 'Emblem Designer',
  href: '/designer',
  icon: PencilSquareIcon,
  isFeature: true,
  description:
    'Build and preview custom Guild Wars 2 emblems in your browser. Explore backgrounds, foregrounds, and colors — then save a shareable link to your design.',
  isCurrent: (pathname: string) => pathname === '/designer',
} as const;

export const wvwMatchupPageAttributes: SiteSections = {
  name: 'WvW Objective Status',
  href: '/wvw/matchups',
  icon: MapPinIcon,
  isFeature: true,
  description: 'Track World vs World objective ownership across all matchups in real time.',
  isCurrent: (pathname: string) => pathname.startsWith('/wvw/matchups'),
} as const;

export const wvwTeamsPageAttributes: SiteSections = {
  name: 'WvW Teams',
  href: '/wvw/teams',
  icon: MapPinIcon,
  isFeature: true,
  description: 'Browse which guilds are registered to each World vs World team across all worlds.',
  isCurrent: (pathname: string) => pathname.startsWith('/wvw/teams'),
} as const;

export const pageAttributes: readonly SiteSections[] = [
  homePageAttributes,
  emblemPageAttributes,
  designerPageAttributes,
  wvwMatchupPageAttributes,
  // wvwTeamsPageAttributes,
] as const;

export const siteFeatures: readonly SiteSections[] = filter(pageAttributes, 'isFeature');
