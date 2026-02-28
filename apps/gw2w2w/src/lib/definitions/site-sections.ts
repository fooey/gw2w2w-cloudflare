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
  description: 'Guild Wars 2 Utilities. Guild emblem rendering, emblem designer, and WvW objective status.',
  isCurrent: (pathname: string) => pathname === '/',
} as const;

export const emblemPageAttributes: SiteSections = {
  name: 'Guild Emblems',
  href: '/guilds',
  icon: PhotoIcon,
  isFeature: true,
  description:
    'High-quality rendering of Guild Wars 2 guild emblems with customizable backgrounds, foregrounds, and colors. Perfect for websites, forums, and applications.',
  isCurrent: (pathname: string) => pathname.startsWith('/guilds'),
} as const;

export const designerPageAttributes: SiteSections = {
  name: 'Emblem Designer',
  href: '/designer',
  icon: PencilSquareIcon,
  isFeature: true,
  description:
    'Create and customize your own guild emblems with our intuitive designer. Preview combinations and export your designs for use in-game.',
  isCurrent: (pathname: string) => pathname === '/designer',
} as const;

export const wvwPageAttributes: SiteSections = {
  name: 'WvW Objective Status',
  href: '/wvw',
  icon: MapPinIcon,
  isFeature: true,
  description: 'Real-time World vs World objective tracking across all matchups.',
  isCurrent: (pathname: string) => pathname.startsWith('/wvw'),
} as const;

export const pageAttributes: readonly SiteSections[] = [
  homePageAttributes,
  emblemPageAttributes,
  designerPageAttributes,
  wvwPageAttributes,
] as const;

export const siteFeatures: readonly SiteSections[] = filter(pageAttributes, 'isFeature') as readonly SiteSections[];
