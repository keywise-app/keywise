import type { Metadata } from 'next';
import Link from 'next/link';

export const metadata: Metadata = {
  title: 'Chris Colwell — Founder of Keywise',
  description: 'Chris Colwell is a landlord, developer, and founder of Keywise — AI property management software for independent landlords.',
  alternates: { canonical: 'https://keywise.app/about/chris' },
  openGraph: {
    title: 'Chris Colwell — Founder of Keywise',
    description: 'Landlord, developer, and founder of Keywise.',
    url: 'https://keywise.app/about/chris',
    siteName: 'Keywise',
    type: 'profile',
  },
  robots: { index: true, follow: true },
};

const N = '#0F3460';
const TEAL = '#00D4AA';
const TEAL_DARK = '#00A886';
const BG = '#F0F4FF';
const BORDER = '#E0E6F0';
const INK = '#1A1A2E';
const INK_MID = '#4A5068';
const INK_MUTED = '#8892A4';

export default function ChrisPage() {
  const personSchema = {
    '@context': 'https://schema.org',
    '@type': 'Person',
    name: 'Chris Colwell',
    url: 'https://keywise.app/about/chris',
    jobTitle: 'Founder',
    worksFor: { '@type': 'Organization', name: 'Keywise', url: 'https://keywise.app' },
    sameAs: ['https://linkedin.com/in/chriscolwell'],
    knowsAbout: ['property management', 'real estate investing', 'landlord software', 'rental property management', 'AI lease extraction'],
    description: 'Landlord, developer, and founder of Keywise — AI-powered property management software for independent landlords.',
  };

  return (
    <div style={{ fontFamily: "'Inter', system-ui, sans-serif", background: '#fff', color: INK, minHeight: '100vh' }}>
      <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap" rel="stylesheet" />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(personSchema) }} />

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
        <Link href="/blog" style={{ fontSize: 13, color: INK_MID, textDecoration: 'none', fontWeight: 500 }}>← Blog</Link>
      </nav>

      <main style={{ maxWidth: 680, margin: '0 auto', padding: '60px 24px 80px' }}>
        <div style={{ display: 'flex', gap: 24, alignItems: 'flex-start', marginBottom: 32 }}>
          <div style={{ width: 80, height: 80, borderRadius: '50%', background: N, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
            <span style={{ color: TEAL, fontSize: 32, fontWeight: 800 }}>CC</span>
          </div>
          <div>
            <h1 style={{ fontSize: 28, fontWeight: 800, color: N, margin: '0 0 4px', letterSpacing: '-0.5px' }}>Chris Colwell</h1>
            <div style={{ fontSize: 14, color: TEAL_DARK, fontWeight: 600, marginBottom: 8 }}>Founder of Keywise</div>
            <div style={{ display: 'flex', gap: 12, fontSize: 13 }}>
              <a href="https://linkedin.com/in/chriscolwell" target="_blank" rel="noopener noreferrer" style={{ color: INK_MID, textDecoration: 'none', fontWeight: 500 }}>LinkedIn →</a>
              <a href="mailto:chris@keywise.app" style={{ color: INK_MID, textDecoration: 'none', fontWeight: 500 }}>chris@keywise.app</a>
            </div>
          </div>
        </div>

        <div style={{ fontSize: 16, color: INK_MID, lineHeight: 1.8 }}>
          <p>I own a duplex in Southern California and built Keywise because the existing tools were either overpriced or underbuilt for landlords like me.</p>

          <p>Before Keywise, I managed my rentals with a spreadsheet, Venmo, and a folder of PDFs. Collecting rent meant texting tenants. Tracking lease terms meant opening a PDF and searching for dates. Every renewal was a manual process from scratch.</p>

          <p>I'm a software developer by trade, and after years of patching together tools that weren't designed for small landlords, I built what I actually needed: a single app that reads my lease PDF, sets up payments automatically, and handles the paperwork I used to do manually.</p>

          <h2 style={{ fontSize: 22, fontWeight: 700, color: N, marginTop: 40, marginBottom: 12 }}>What I built</h2>

          <p><strong>Keywise</strong> is AI-powered property management for independent landlords with 1-50 units. The core idea: upload your lease PDF and AI extracts everything — tenant name, rent amount, payment dates, late fees, deposit terms. No manual data entry.</p>

          <p>From there: online rent collection via Stripe ($2 flat per transaction, not a percentage), built-in document signing, AI-drafted communications, tenant portal with auto-pay, and move-in/out inspections with photos and digital signatures.</p>

          <p>Free for 1-2 units. $19/month for unlimited.</p>

          <h2 style={{ fontSize: 22, fontWeight: 700, color: N, marginTop: 40, marginBottom: 12 }}>What I write about</h2>

          <p>The <Link href="/blog" style={{ color: TEAL_DARK, fontWeight: 600, textDecoration: 'none' }}>Keywise blog</Link> covers the practical stuff landlords actually deal with: <Link href="/blog/late-rent-notice" style={{ color: TEAL_DARK, textDecoration: 'none' }}>writing late rent notices</Link>, <Link href="/blog/security-deposit-laws" style={{ color: TEAL_DARK, textDecoration: 'none' }}>security deposit laws by state</Link>, <Link href="/blog/collect-rent-online" style={{ color: TEAL_DARK, textDecoration: 'none' }}>collecting rent online</Link>, and <Link href="/blog/move-in-inspection-checklist" style={{ color: TEAL_DARK, textDecoration: 'none' }}>move-in inspection checklists</Link>. Everything I write comes from managing my own properties — not from researching what landlords probably want to hear.</p>
        </div>

        <div style={{ marginTop: 48, padding: 24, background: BG, borderRadius: 12, border: `1px solid ${BORDER}` }}>
          <div style={{ fontWeight: 700, color: N, fontSize: 15, marginBottom: 8 }}>Try Keywise</div>
          <div style={{ fontSize: 14, color: INK_MID, marginBottom: 16, lineHeight: 1.6 }}>Free for 1-2 units. No credit card required.</div>
          <Link href="/?signup=true" style={{ display: 'inline-block', background: N, color: '#fff', padding: '12px 24px', borderRadius: 10, fontSize: 14, fontWeight: 700, textDecoration: 'none' }}>
            Start free →
          </Link>
        </div>
      </main>
    </div>
  );
}
