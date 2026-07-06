import { execSync } from 'node:child_process';

import { initOpenNextCloudflareForDev } from '@opennextjs/cloudflare';
import type { NextConfig } from 'next';

import { getEmblemSrc } from './src/lib/emblems';

const faviconSrc = getEmblemSrc('97C007DC-87D5-E311-9621-AC162DAE8ACD');

void initOpenNextCloudflareForDev();

const nextConfig: NextConfig = {
  reactCompiler: true,

  typescript: {
    ignoreBuildErrors: true, // We will check them ourselves with the faster engine
  },
  env: {
    NEXT_PUBLIC_BUILD_HASH: (() => {
      try {
        return execSync('git rev-parse --short HEAD').toString().trim();
      } catch {
        return 'dev';
      }
    })(),
    NEXT_PUBLIC_BUILD_TIMESTAMP: new Date().toISOString(),
  },
  redirects() {
    return [
      {
        source: '/favicon.ico',
        destination: faviconSrc,
        permanent: false,
      },
      {
        source: '/guilds/:guildId/:size.svg',
        destination: getEmblemSrc(':guildId'),
        permanent: false,
      },
    ];
  },
};

export default nextConfig;
