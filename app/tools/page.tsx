import type { Metadata } from 'next';
import Link from 'next/link';

export const metadata: Metadata = {
  title: 'Free Tools for California Landlords | Keywise',
  description: 'Free compliance tools for California landlords. AB 1482 rent cap calculator, move-out inspection workflow, eviction notice generator.',
  alternates: { canonical: 'https://keywise.app/tools' },
  openGraph: {
    title: 'Free Tools for California Landlords | Keywise',
    description: 'Free compliance tools for California landlords. AB 1482 rent cap calculator, move-out inspection workflow, eviction notice generator.',
    url: 'https://keywise.app/tools',
    siteName: 'Keywise',
    type: 'website',
    images: [{ url: '/og-image.png', width: 1200, height: 628 }],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Free Tools for California Landlords | Keywise',
    description: 'Free compliance tools for California landlords. AB 1482 rent cap calculator, move-out inspection workflow, eviction notice generator.',
  },
  robots: { index: true, follow: true },
};

const N = '#0F3460';
const TEAL = '#00D4AA';
const TEAL_DARK = '#00A886';
const TEAL_LIGHT = '#E0FAF5';
const BG = '#F0F4FF';
const BORDER = '#E0E6F0';
const INK = '#1A1A2E';
const INK_MID = '#4A5068';
const INK_MUTED = '#8892A4';

const tools = [
  {
    icon: '\u2726',
    title: 'AB 1482 Rent Cap Calculator',
    description: 'Estimate the maximum allowable rent increase for your California rental property. Current 2026 CPI rates, multi-property support, local ordinance detection.',
    href: '/tools/ca/ab1482-calculator',
  },
  {
    icon: '\uD83D\uDCCB',
    title: 'AB 2801 Move-Out Inspections',
    description: 'Photo-documented move-out inspections with digital signatures. Compliant with California AB 2801 requirements for itemized statements.',
    href: '/inspections',
  },
  {
    icon: '\u2696\uFE0F',
    title: 'Just-Cause Eviction Notice Wizard',
    description: 'Generate compliant eviction notices for California just-cause requirements. Covers all 12 at-fault and no-fault grounds under AB 1482.',
    href: '/tools/ca/eviction-notice',
  },
];

export default function ToolsIndexPage() {
  return (
    <div style={{ fontFamily: "'Inter', system-ui, sans-serif", background: '#fff', color: INK, minHeight: '100vh' }}>
      <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap" rel="stylesheet" />

      {/* Nav */}
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
        <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
          <span style={{ fontSize: 13, color: TEAL_DARK, fontWeight: 600 }}>Free Tools</span>
          <Link href="/?signup=true" style={{ fontSize: 13, color: '#fff', textDecoration: 'none', fontWeight: 600, background: N, padding: '7px 16px', borderRadius: 8 }}>Start Free</Link>
        </div>
      </nav>

      {/* Hero */}
      <div style={{ background: `linear-gradient(160deg, ${BG} 0%, #e8f0ff 100%)`, padding: '64px 24px 56px', textAlign: 'center' }}>
        <h1 style={{ fontSize: 40, fontWeight: 800, color: N, letterSpacing: '-1px', margin: '0 0 14px', lineHeight: 1.15 }}>
          Free Tools for California Landlords
        </h1>
        <p style={{ fontSize: 17, color: INK_MID, margin: '0 auto', maxWidth: 480, lineHeight: 1.6 }}>
          Compliance shouldn&apos;t require a law degree.
        </p>
      </div>

      {/* Tool Cards */}
      <div style={{ maxWidth: 960, margin: '0 auto', padding: '48px 24px 32px' }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 24 }}>
          {tools.map(tool => (
            <div key={tool.title} style={{ background: '#fff', border: `1px solid ${BORDER}`, borderRadius: 14, padding: 28, display: 'flex', flexDirection: 'column', gap: 12 }}>
              <div style={{ fontSize: 28 }}>{tool.icon}</div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <h2 style={{ fontSize: 18, fontWeight: 700, color: N, margin: 0 }}>{tool.title}</h2>
                <span style={{ fontSize: 10, fontWeight: 700, color: TEAL_DARK, background: TEAL_LIGHT, border: `1px solid ${TEAL}44`, borderRadius: 4, padding: '2px 6px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>LIVE</span>
              </div>
              <p style={{ fontSize: 14, color: INK_MID, lineHeight: 1.6, margin: 0, flex: 1 }}>{tool.description}</p>
              <Link href={tool.href} style={{ fontSize: 14, color: TEAL_DARK, fontWeight: 700, textDecoration: 'none', marginTop: 4 }}>
                Use Tool &rarr;
              </Link>
            </div>
          ))}
        </div>

        <p style={{ textAlign: 'center', fontSize: 13, color: INK_MUTED, marginTop: 32 }}>
          More tools coming soon &mdash; lease clause analyzer, habitability checklist, and more.
        </p>
      </div>

      {/* Bottom CTA */}
      <div style={{ padding: '40px 24px 64px' }}>
        <div style={{ maxWidth: 560, margin: '0 auto', padding: 32, background: N, borderRadius: 12, textAlign: 'center' }}>
          <h3 style={{ fontSize: 22, fontWeight: 700, color: '#fff', marginBottom: 8 }}>Keywise helps California landlords stay compliant.</h3>
          <p style={{ fontSize: 14, color: 'rgba(255,255,255,0.8)', marginBottom: 20 }}>
            AI-powered property management for 1-50 units. Free for up to 2 units, no credit card required.
          </p>
          <Link href="/?signup=true" style={{ display: 'inline-block', background: TEAL, color: N, padding: '14px 32px', borderRadius: 10, fontSize: 15, fontWeight: 700, textDecoration: 'none' }}>
            Start Free &rarr;
          </Link>
        </div>
      </div>
    </div>
  );
}
