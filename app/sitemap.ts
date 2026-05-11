import type { MetadataRoute } from 'next';
import { createClient } from '@supabase/supabase-js';

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const base = 'https://keywise.app';
  const lastModified = new Date();

  // Static entries
  const staticEntries: MetadataRoute.Sitemap = [
    { url: base, lastModified, changeFrequency: 'weekly', priority: 1.0 },
    { url: `${base}/blog`, lastModified, changeFrequency: 'weekly', priority: 0.9 },
    { url: `${base}/blog/late-rent-notice`, lastModified, changeFrequency: 'monthly', priority: 0.8 },
    { url: `${base}/blog/move-in-inspection-checklist`, lastModified, changeFrequency: 'monthly', priority: 0.8 },
    { url: `${base}/blog/collect-rent-online`, lastModified, changeFrequency: 'monthly', priority: 0.8 },
    { url: `${base}/blog/free-lease-agreement-template`, lastModified, changeFrequency: 'monthly', priority: 0.8 },
    { url: `${base}/blog/security-deposit-laws`, lastModified, changeFrequency: 'monthly', priority: 0.8 },
    { url: `${base}/blog/property-management-software-comparison`, lastModified, changeFrequency: 'monthly', priority: 0.8 },
    { url: `${base}/tenant`, lastModified, changeFrequency: 'monthly', priority: 0.7 },
    { url: `${base}/contact`, lastModified, changeFrequency: 'yearly', priority: 0.5 },
    { url: `${base}/privacy`, lastModified, changeFrequency: 'yearly', priority: 0.3 },
    { url: `${base}/terms`, lastModified, changeFrequency: 'yearly', priority: 0.3 },
  ];

  // Dynamic blog posts from blog_drafts
  const hardcodedSlugs = new Set([
    'late-rent-notice', 'move-in-inspection-checklist', 'collect-rent-online',
    'free-lease-agreement-template', 'security-deposit-laws', 'property-management-software-comparison',
  ]);

  let dynamicEntries: MetadataRoute.Sitemap = [];
  try {
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    );
    const { data } = await supabase
      .from('blog_drafts')
      .select('slug, published_at')
      .eq('status', 'published');

    dynamicEntries = (data || [])
      .filter((d: any) => !hardcodedSlugs.has(d.slug))
      .map((d: any) => ({
        url: `${base}/blog/${d.slug}`,
        lastModified: d.published_at ? new Date(d.published_at) : lastModified,
        changeFrequency: 'monthly' as const,
        priority: 0.8,
      }));
  } catch {
    // Supabase unavailable — return static entries only
  }

  return [...staticEntries, ...dynamicEntries];
}
