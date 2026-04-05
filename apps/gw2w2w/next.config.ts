import { getEmblemSrc } from '@gw2w2w/lib/emblems';
import { initOpenNextCloudflareForDev } from '@opennextjs/cloudflare';
import { type NextConfig } from 'next';

const faviconSrc = getEmblemSrc('97C007DC-87D5-E311-9621-AC162DAE8ACD');

void initOpenNextCloudflareForDev();

const nextConfig: NextConfig = {
  reactCompiler: true,
  env: {
    NEXT_PUBLIC_BUILD_ID: process.env.CF_PAGES_COMMIT_SHA ?? 'dev',
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
