import type { NextConfig } from 'next';

const config: NextConfig = {
  // Los paquetes del monorepo se publican como TypeScript.
  transpilePackages: ['@kalo/shared', '@kalo/ui-tokens'],
  // exceljs (exportar a Excel en modo demo) se carga desde node_modules en el servidor.
  serverExternalPackages: ['exceljs'],
  poweredByHeader: false,
  reactStrictMode: true,
};

export default config;
