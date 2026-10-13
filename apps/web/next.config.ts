import path from 'node:path';
import type { NextConfig } from 'next';

const config: NextConfig = {
  output: 'standalone',
  outputFileTracingRoot: path.join(import.meta.dirname, '../..'),
  transpilePackages: ['@harusi/i18n', '@harusi/ui-tokens'],
  poweredByHeader: false,
  // Linting runs separately (`pnpm lint`).
  eslint: { ignoreDuringBuilds: true },
};

export default config;
