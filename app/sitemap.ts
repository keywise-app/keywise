import type { MetadataRoute } from 'next';

export default function sitemap(): MetadataRoute.Sitemap {
  const base = 'https://keywise.app';
  const lastModified = new Date();

  return [
    { url: base, lastModified, changeFrequency: 'weekly', priority: 1.0 },
    { url: `${base}/blog`, lastModified, changeFrequency: 'weekly', priority: 0.9 },
    { url: `${base}/blog/late-rent-notice`, lastModified, changeFrequency: 'monthly', priority: 0.8 },
    { url: `${base}/blog/move-in-inspection-checklist`, lastModified, changeFrequency: 'monthly', priority: 0.8 },
    { url: `${base}/blog/collect-rent-online`, lastModified, changeFrequency: 'monthly', priority: 0.8 },
    { url: `${base}/blog/free-lease-agreement-template`, lastModified, changeFrequency: 'monthly', priority: 0.8 },
    { url: `${base}/blog/security-deposit-laws`, lastModified, changeFrequency: 'monthly', priority: 0.8 },
    { url: `${base}/blog/property-management-software-comparison`, lastModified, changeFrequency: 'monthly', priority: 0.8 },
    { url: `${base}/contact`, lastModified, changeFrequency: 'yearly', priority: 0.5 },
    { url: `${base}/privacy`, lastModified, changeFrequency: 'yearly', priority: 0.3 },
    { url: `${base}/terms`, lastModified, changeFrequency: 'yearly', priority: 0.3 },
  ];
}
