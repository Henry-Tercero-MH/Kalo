import type { NextConfig } from 'next';

const config: NextConfig = {
  // Los paquetes del monorepo se publican como TypeScript.
  transpilePackages: ['@kalo/shared', '@kalo/ui-tokens'],
  poweredByHeader: false,
  reactStrictMode: true,
};

export default config;
