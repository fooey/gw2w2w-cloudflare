import type { Metadata } from 'next';
import { Geist, Geist_Mono } from 'next/font/google';
import './globals.css';

const geistSans = Geist({ variable: '--font-geist-sans', subsets: ['latin'] });
const geistMono = Geist_Mono({ variable: '--font-geist-mono', subsets: ['latin'] });

export const metadata: Metadata = {
  title: 'gw2w2w.com - Guild Wars 2 Utilities',
  description: 'Guild Wars 2 Utilities. Guild emblem rendering, emblem designer, and WvW objective status.',
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" className="h-full bg-gray-100" suppressHydrationWarning={true}>
      <body
        className={`${geistSans.variable} ${geistMono.variable} h-full bg-zinc-50 font-sans text-zinc-900 antialiased`}
        suppressHydrationWarning={true}
      >
        {children}
      </body>
    </html>
  );
}
