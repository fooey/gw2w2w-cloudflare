import type { Metadata } from 'next';
import { Geist, Geist_Mono } from 'next/font/google';

import { UpdateNotifier } from '#ui/UpdateNotifier';

import './globals.css';

// eslint-disable-next-line new-cap -- Geist/Geist_Mono are PascalCase factory functions per next/font/google's API, not constructors.
const geistSans = Geist({ variable: '--font-geist-sans', subsets: ['latin'] });
// eslint-disable-next-line new-cap -- see above.
const geistMono = Geist_Mono({ variable: '--font-geist-mono', subsets: ['latin'] });

export const metadata: Metadata = {
  title: 'gw2w2w.com - Guild Wars 2 Utilities',
  description: 'Guild Wars 2 Utilities. Guild emblem rendering, emblem designer, and WvW objective status.',
  icons: {
    icon: '/favicon.ico',
    shortcut: '/favicon.ico',
    apple: '/favicon.ico',
  },
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" className="h-full bg-zinc-50" suppressHydrationWarning={true}>
      <body
        className={`${geistSans.variable} ${geistMono.variable} h-full font-sans text-zinc-900 antialiased`}
        suppressHydrationWarning={true}
      >
        <UpdateNotifier />
        {children}
      </body>
    </html>
  );
}
