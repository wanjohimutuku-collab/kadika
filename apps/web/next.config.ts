import path from 'node:path';
import type { NextConfig } from 'next';
import createNextIntlPlugin from 'next-intl/plugin';

const withNextIntl = createNextIntlPlugin('./src/i18n/request.ts');

const securityHeaders = [
  { key: 'X-Content-Type-Options', value: 'nosniff' },
  { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
  { key: 'X-Frame-Options', value: 'DENY' },
  { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=()' },
];

/** Belt and braces with robots.txt and meta tags: these surfaces must never be indexed. */
const noindex = [{ key: 'X-Robots-Tag', value: 'noindex, nofollow' }];

const config: NextConfig = {
  // A separate dist dir lets e2e/Lighthouse use a production build while `next dev` keeps `.next`.
  distDir: process.env.NEXT_DIST_DIR ?? '.next',
  output: 'standalone',
  outputFileTracingRoot: path.join(import.meta.dirname, '../..'),
  transpilePackages: ['@harusi/i18n', '@harusi/ui-tokens', '@harusi/schemas', '@harusi/api-client'],
  poweredByHeader: false,
  devIndicators: false,
  // Linting runs separately (`pnpm lint`).
  eslint: { ignoreDuringBuilds: true },
  // Inline CSS removes the render-blocking stylesheet requests on slow networks (Lighthouse, §10).
  experimental: {
    optimizePackageImports: ['lucide-react', 'radix-ui', 'date-fns'],
    inlineCss: true,
  },
  async redirects() {
    // English-friendly alias for the Android app page.
    return [{ source: '/app-download', destination: '/programu', permanent: true }];
  },
  async headers() {
    return [
      { source: '/:path*', headers: securityHeaders },
      ...['/app', '/ops', '/c', '/s', '/k', '/dev'].flatMap((p) => [
        { source: p, headers: noindex },
        { source: `${p}/:path*`, headers: noindex },
      ]),
      {
        source: '/sw.js',
        headers: [
          { key: 'Cache-Control', value: 'no-cache' },
          { key: 'Service-Worker-Allowed', value: '/' },
        ],
      },
    ];
  },
};

export default withNextIntl(config);
