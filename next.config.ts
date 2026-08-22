import type { NextConfig } from "next";

const securityHeaders = [
  { key: 'X-DNS-Prefetch-Control', value: 'on' },
  { key: 'X-Frame-Options', value: 'SAMEORIGIN' },
  { key: 'X-Content-Type-Options', value: 'nosniff' },
  { key: 'Referrer-Policy', value: 'origin-when-cross-origin' },
];

const nextConfig: NextConfig = {
  serverExternalPackages: ['pdfkit'],
  experimental: {
    serverActions: {
      bodySizeLimit: '20mb',
    },
  },
  async redirects() {
    return [
      {
        source: '/ab1482-calculator',
        destination: '/tools/ca/ab1482-calculator',
        permanent: true,
      },
    ];
  },
  async headers() {
    return [
      {
        source: '/(.*)',
        headers: securityHeaders,
      },
      {
        // HTML pages: never serve stale content after a deploy
        source: '/((?!api/|_next/static/|favicon\\.ico|robots\\.txt|sitemap\\.xml|og-image\\.png|apple-touch-icon\\.png).*)',
        headers: [
          { key: 'Cache-Control', value: 'no-store, must-revalidate' },
        ],
      },
      {
        // Static files: cacheable for 1 hour
        source: '/(favicon\\.ico|robots\\.txt|sitemap\\.xml|og-image\\.png|apple-touch-icon\\.png)',
        headers: [
          { key: 'Cache-Control', value: 'public, max-age=3600' },
        ],
      },
    ];
  },
};

export default nextConfig;
