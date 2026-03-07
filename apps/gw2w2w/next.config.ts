/* eslint-disable @typescript-eslint/no-non-null-assertion */
import { getEmblemSrc } from '@gw2w2w/lib/emblems';
import { initOpenNextCloudflareForDev } from '@opennextjs/cloudflare';
import type { NextConfig } from 'next';

const faviconSrc = getEmblemSrc('97C007DC-87D5-E311-9621-AC162DAE8ACD');
const emblemUrl = new URL(process.env.NEXT_PUBLIC_SERVICE_EMBLEM_HOST!);

const nextConfig: NextConfig = {
  reactCompiler: true,
  images: {
    remotePatterns: [
      {
        protocol: emblemUrl.protocol.replace(':', '') as 'http' | 'https',
        hostname: emblemUrl.hostname,
        port: emblemUrl.port,
        pathname: '/**',
      },
    ],
  },
  redirects() {
    return [
      {
        source: '/favicon.ico',
        destination: faviconSrc,
        permanent: false,
      },
    ];
  },
};

export default nextConfig;

void initOpenNextCloudflareForDev();
