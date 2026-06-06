import type { Metadata } from 'next';
import Link from 'next/link';
import { createClient } from '@supabase/supabase-js';

export const metadata: Metadata = {
  title: 'Landlord Resources & Guides | Keywise Blog',
  description: 'Free guides for small landlords — lease templates, inspection checklists, rent collection tips, and more.',
  alternates: { canonical: 'https://keywise.app/blog' },
  openGraph: {
    title: 'Landlord Resources & Guides | Keywise Blog',
    description: 'Free guides for small landlords — lease templates, inspection checklists, rent collection tips, and more.',
    url: 'https://keywise.app/blog',
    siteName: 'Keywise',
    type: 'website',
    images: [{ url: '/og-image.png', width: 1200, height: 628 }],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Landlord Resources & Guides | Keywise Blog',
    description: 'Free guides for small landlords — lease templates, inspection checklists, rent collection tips, and more.',
  },
  robots: { index: true, follow: true },
};

const N = '#0F3460';
const TEAL = '#00D4AA';
const BG = '#F0F4FF';
const BORDER = '#E0E6F0';
const INK = '#1A1A2E';
const INK_MID = '#4A5068';
const INK_MUTED = '#8892A4';

const POSTS = [
  {
    slug: 'late-rent-notice',
    title: 'How to Write a Late Rent Notice (Free Template)',
    description: 'A step-by-step guide to writing professional late rent notices, plus a free template you can use today.',
    date: '2026',
    tag: 'Templates',
  },
  {
    slug: 'move-in-inspection-checklist',
    title: 'Move-In Inspection Checklist for Landlords (Free Download)',
    description: 'The complete room-by-room inspection checklist every landlord needs to protect their property and security deposit.',
    date: '2026',
    tag: 'Inspections',
  },
  {
    slug: 'collect-rent-online',
    title: 'How to Collect Rent Online: Best Options for Small Landlords',
    description: 'Comparing Venmo, Zelle, PayPal, and dedicated tools — find the best way to collect rent for your small portfolio.',
    date: '2026',
    tag: 'Rent Collection',
  },
  {
    slug: 'free-lease-agreement-template',
    title: 'Free Lease Agreement Template for Small Landlords (2026)',
    description: 'Download a free, lawyer-reviewed residential lease template. Covers rent, deposits, maintenance, and early termination.',
    date: '2026',
    tag: 'Templates',
  },
  {
    slug: 'security-deposit-laws',
    title: 'Security Deposit Laws: What Every Landlord Needs to Know',
    description: 'State-by-state guide to security deposit limits, return deadlines, and deduction rules that keep you out of court.',
    date: '2026',
    tag: 'Legal',
  },
  {
    slug: 'property-management-software-comparison',
    title: 'Best Property Management Software for Small Landlords (2026)',
    description: 'Honest comparison of Avail, RentRedi, TurboTenant, Apartments.com, and Keywise for 1-10 unit portfolios.',
    date: '2026',
    tag: 'Software',
  },
  {
    slug: 'landlord-tenant-communication',
    title: 'Landlord-Tenant Communication: How to Handle It Without Losing Your Mind',
    description: 'Practical communication strategies for landlords: templates for rent reminders, maintenance updates, and difficult conversations.',
    date: '2026',
    tag: 'Management',
  },
  {
    slug: 'security-deposit-deductions',
    title: 'Security Deposit Deductions: What Landlords Can (and Can\'t) Charge For',
    description: 'Know exactly what you can deduct from a security deposit and what crosses the line. State rules, common mistakes, and documentation tips.',
    date: '2026',
    tag: 'Legal',
  },
];

export const dynamic = 'force-dynamic';

async function getPublishedDrafts() {
  try {
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    );
    const { data } = await supabase
      .from('blog_drafts')
      .select('slug, title, meta_description, target_keyword, published_at')
      .eq('status', 'published')
      .order('published_at', { ascending: false });
    return (data || []).map((d: any) => ({
      slug: d.slug,
      title: d.title,
      description: d.meta_description || d.title,
      date: d.published_at ? new Date(d.published_at).toLocaleDateString('en-US', { month: 'long', year: 'numeric' }) : '',
      tag: d.target_keyword || 'Guide',
    }));
  } catch {
    return [];
  }
}

export default async function BlogIndex() {
  const publishedDrafts = await getPublishedDrafts();

  // Merge: published drafts first (newest), then hardcoded, deduplicate by slug
  const hardcodedSlugs = new Set(POSTS.map(p => p.slug));
  const dynamicPosts = publishedDrafts.filter(p => !hardcodedSlugs.has(p.slug));
  const allPosts = [...dynamicPosts, ...POSTS];

  return (
    <div style={{ fontFamily: "'Inter', system-ui, sans-serif", background: '#fff', color: INK, minHeight: '100vh' }}>
      <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap" rel="stylesheet" />

      <nav style={{ borderBottom: `1px solid ${BORDER}`, padding: '0 40px', height: 60, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <Link href="/" style={{ textDecoration: 'none', display: 'flex', alignItems: 'center', gap: 8 }}>
          <div style={{ width: 28, height: 28, borderRadius: 7, background: N, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <svg width="16" height="16" viewBox="0 0 32 32" fill="none">
              <circle cx="13" cy="16" r="5.5" fill="none" stroke={TEAL} strokeWidth="2.5" />
              <circle cx="13" cy="16" r="2" fill={TEAL} />
              <rect x="17.5" y="14.75" width="8" height="2.5" rx="1.25" fill={TEAL} />
            </svg>
          </div>
          <span style={{ fontSize: 16, fontWeight: 700, color: N, letterSpacing: '-0.3px' }}>keywise</span>
        </Link>
        <Link href="/" style={{ fontSize: 13, color: INK_MID, textDecoration: 'none', fontWeight: 500 }}>← Back to home</Link>
      </nav>

      <div style={{ maxWidth: 760, margin: '0 auto', padding: '60px 24px' }}>
        <h1 style={{ fontSize: 40, fontWeight: 800, color: N, letterSpacing: '-1px', marginBottom: 12 }}>Keywise Blog</h1>
        <p style={{ fontSize: 17, color: INK_MID, lineHeight: 1.6, marginBottom: 48 }}>
          Practical guides for independent landlords. Templates, checklists, and tips to make property management easier.
        </p>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
          {allPosts.map(post => (
            <Link key={post.slug} href={`/blog/${post.slug}`} style={{ textDecoration: 'none', color: 'inherit' }}>
              <article style={{ background: BG, borderRadius: 12, padding: 28, border: `1px solid ${BORDER}` }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12 }}>
                  <span style={{ background: TEAL + '22', color: '#00A886', fontSize: 11, fontWeight: 700, padding: '3px 10px', borderRadius: 20, textTransform: 'uppercase', letterSpacing: '0.5px' }}>{post.tag}</span>
                  <span style={{ fontSize: 12, color: INK_MUTED }}>{post.date}</span>
                </div>
                <h2 style={{ fontSize: 22, fontWeight: 700, color: N, marginBottom: 8, letterSpacing: '-0.3px' }}>{post.title}</h2>
                <p style={{ fontSize: 14, color: INK_MID, lineHeight: 1.6, margin: 0 }}>{post.description}</p>
                <div style={{ marginTop: 14, fontSize: 13, color: '#00A886', fontWeight: 600 }}>Read article →</div>
              </article>
            </Link>
          ))}
        </div>

        <div style={{ marginTop: 60, padding: 32, background: N, borderRadius: 12, textAlign: 'center' }}>
          <h3 style={{ fontSize: 22, fontWeight: 700, color: '#fff', marginBottom: 8 }}>Tired of managing rentals manually?</h3>
          <p style={{ fontSize: 14, color: 'rgba(255,255,255,0.8)', marginBottom: 20 }}>
            Keywise automates the time-consuming parts of being a landlord — late rent notices, inspections, document storage, and more.
          </p>
          <Link href="/" style={{ display: 'inline-block', background: TEAL, color: N, padding: '14px 32px', borderRadius: 10, fontSize: 15, fontWeight: 700, textDecoration: 'none' }}>
            Try Keywise free →
          </Link>
        </div>
      </div>
    </div>
  );
}
