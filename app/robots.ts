import type { MetadataRoute } from 'next';

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: '*',
        allow: ['/', '/blog', '/blog/*', '/privacy', '/terms', '/contact', '/login', '/ab1482-calculator', '/tenant'],
        disallow: ['/admin', '/api', '/sign', '/reset-password', '/tenant-login'],
      },
    ],
    sitemap: 'https://keywise.app/sitemap.xml',
  };
}
