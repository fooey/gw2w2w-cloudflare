import { initOpenNextCloudflareForDev } from '@opennextjs/cloudflare';
import { getEmblemSrc } from '@gw2w2w/lib/emblems';
import type { NextConfig } from 'next';

const faviconSrc = getEmblemSrc('97C007DC-87D5-E311-9621-AC162DAE8ACD');

const nextConfig: NextConfig = {
  reactCompiler: true,
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
