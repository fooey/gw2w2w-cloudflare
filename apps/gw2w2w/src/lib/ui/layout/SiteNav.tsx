'use client';

import { pageAttributes } from '@gw2w2w/lib/definitions/site-sections';
import {
  Disclosure,
  DisclosureButton,
  DisclosurePanel,
  Menu,
  MenuButton,
  MenuItem,
  MenuItems,
} from '@headlessui/react';
import { Bars3Icon, CodeBracketIcon, XMarkIcon } from '@heroicons/react/24/outline';
import { clsx } from 'clsx';
import Link from 'next/link';
import { usePathname } from 'next/navigation';

const repoUrl = 'https://github.com/fooey/gw2w2w-cloudflare';

const contactNavigation = [
  { name: 'Source Code', href: repoUrl },
  {
    name: 'Report an issue',
    href: `${repoUrl}/issues/new?template=bug_report.md`,
  },
  {
    name: 'Suggest a feature',
    href: `${repoUrl}/issues/new?template=feature_request.md`,
  },
  { name: 'Discussions', href: `${repoUrl}/discussions` },
  { name: 'Open issues', href: `${repoUrl}/issues` },
  { name: 'fooey.5824' },
];

export function SiteNav() {
  const pathname = usePathname();

  return (
    <Disclosure as="nav" className="border-b border-gray-200 bg-white">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="flex h-16 justify-between">
          <div className="hidden sm:-my-px sm:ml-6 sm:flex sm:space-x-8">
            {pageAttributes.map((item) => (
              <Link
                key={item.name}
                href={item.href}
                aria-current={item.isCurrent(pathname) ? 'page' : undefined}
                className={clsx(
                  item.isCurrent(pathname)
                    ? 'border-rose-900/50 text-gray-900'
                    : 'border-transparent text-gray-500 hover:border-gray-300 hover:text-gray-700',
                  'inline-flex items-center gap-2 border-b-2 px-1 pt-1 text-sm font-medium',
                )}
              >
                <item.icon aria-hidden="true" className="size-5 flex-none text-rose-900" />
                {item.name}
              </Link>
            ))}
          </div>
          <div className="hidden sm:ml-6 sm:flex sm:items-center">
            <Menu as="div" className="relative ml-3">
              <MenuButton className="relative flex max-w-xs items-center rounded-full focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-600">
                <span className="absolute -inset-1.5" />
                <span className="sr-only">Open GitHub menu</span>
                <CodeBracketIcon aria-hidden="true" className="size-6" />
              </MenuButton>

              <MenuItems
                transition
                className="absolute right-0 z-10 mt-2 w-48 origin-top-right rounded-md bg-white py-1 shadow-lg outline outline-black/5 transition data-closed:scale-95 data-closed:transform data-closed:opacity-0 data-enter:duration-200 data-enter:ease-out data-leave:duration-75 data-leave:ease-in"
              >
                {contactNavigation.map((item) => (
                  <MenuItem key={item.name}>
                    {item.href ? (
                      <Link
                        target="_blank"
                        rel="noopener noreferrer"
                        href={item.href}
                        className="block px-4 py-2 text-sm text-gray-700 data-focus:bg-gray-100 data-focus:outline-hidden"
                      >
                        {item.name}
                      </Link>
                    ) : (
                      <span className="block px-4 py-2 text-sm text-gray-700">{item.name}</span>
                    )}
                  </MenuItem>
                ))}
              </MenuItems>
            </Menu>
          </div>
          <div className="-mr-2 flex items-center sm:hidden">
            {/* Mobile menu button */}
            <DisclosureButton className="group relative inline-flex items-center justify-center rounded-md bg-white p-2 text-gray-400 hover:bg-gray-100 hover:text-gray-500 focus:outline-2 focus:outline-offset-2 focus:outline-indigo-600">
              <span className="absolute -inset-0.5" />
              <span className="sr-only">Open main menu</span>
              <Bars3Icon aria-hidden="true" className="block size-6 group-data-open:hidden" />
              <XMarkIcon aria-hidden="true" className="hidden size-6 group-data-open:block" />
            </DisclosureButton>
          </div>
        </div>
      </div>

      <DisclosurePanel className="sm:hidden">
        <div className="space-y-1 pt-2 pb-3">
          {pageAttributes.map((item) => (
            <DisclosureButton
              key={item.name}
              as="a"
              href={item.href}
              aria-current={item.isCurrent(pathname) ? 'page' : undefined}
              className={clsx(
                item.isCurrent(pathname)
                  ? 'border-indigo-600 bg-indigo-50 text-indigo-700'
                  : 'border-transparent text-gray-600 hover:border-gray-300 hover:bg-gray-50 hover:text-gray-800',
                'block border-l-4 py-2 pr-4 pl-3 text-base font-medium',
              )}
            >
              {item.name}
            </DisclosureButton>
          ))}
        </div>
        <div className="border-t border-gray-200 pt-4 pb-3">
          <div className="flex items-center px-4">
            <div className="shrink-0">
              <CodeBracketIcon aria-hidden="true" className="size-6" />
            </div>
            <div className="ml-3">
              <div className="text-base font-medium text-gray-800">GitHub</div>
            </div>
          </div>
          <div className="mt-3 space-y-1">
            {contactNavigation.map((item) => (
              <DisclosureButton
                key={item.name}
                as="a"
                href={item.href}
                className="block px-4 py-2 text-base font-medium text-gray-500 hover:bg-gray-100 hover:text-gray-800"
              >
                {item.name}
              </DisclosureButton>
            ))}
          </div>
        </div>
      </DisclosurePanel>
    </Disclosure>
  );
}
