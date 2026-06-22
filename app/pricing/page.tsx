import type { Metadata } from 'next';
import Link from 'next/link';
import PricingCards from './PricingCards';

export const metadata: Metadata = {
  title: 'Pricing | Keywise',
  description: 'Simple pricing for California landlords. Free for 1 unit, Pro at $49/mo for unlimited. Founding member rate: $29/mo for life.',
  alternates: { canonical: 'https://keywise.app/pricing' },
  openGraph: {
    title: 'Pricing | Keywise',
    description: 'Simple pricing for California landlords. Free for 1 unit, Pro at $49/mo for unlimited. Founding member rate: $29/mo for life.',
    url: 'https://keywise.app/pricing',
    siteName: 'Keywise',
    type: 'website',
    images: [{ url: '/og-image.png', width: 1200, height: 628 }],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Pricing | Keywise',
    description: 'Simple pricing for California landlords. Free for 1 unit, Pro at $49/mo for unlimited.',
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

export default function PricingPage() {
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

      <main style={{ maxWidth: 1060, margin: '0 auto', padding: '60px 24px 80px' }}>
        <div style={{ textAlign: 'center', marginBottom: 52 }}>
          <div style={{ fontSize: 12, color: INK_MUTED, textTransform: 'uppercase', letterSpacing: '1px', marginBottom: 12 }}>Pricing</div>
          <h1 style={{ fontSize: 40, fontWeight: 800, color: N, letterSpacing: '-1px', margin: '0 0 12px' }}>
            Built for California landlords.<br />Priced for serious operators.
          </h1>
          <p style={{ fontSize: 16, color: INK_MUTED, margin: 0 }}>Free compliance tools for everyone. Pro features for landlords who want to automate everything.</p>
        </div>

        <PricingCards />

        <p style={{ textAlign: 'center', fontSize: 13, color: INK_MUTED, marginTop: 20 }}>
          $2 per online rent payment transaction. No hidden fees. · <Link href="/" style={{ color: INK_MID, fontWeight: 600, textDecoration: 'none' }}>Already a customer? Sign in</Link>
        </p>

        {/* FAQ */}
        <div style={{ maxWidth: 600, margin: '60px auto 0' }}>
          <h2 style={{ fontSize: 24, fontWeight: 700, color: N, textAlign: 'center', marginBottom: 24 }}>Common questions</h2>
          {[
            { q: "What's the founding member deal?", a: "The first 100 California landlords who subscribe get $29/mo locked in for life. The only condition: maintain a continuous subscription. If you cancel, you lose the founding rate and would resubscribe at the current price ($49/mo)." },
            { q: 'What happens to existing customers?', a: "If you're already subscribed, your rate is grandfathered. Nothing changes unless you cancel." },
            { q: 'Is there a free trial?', a: 'Yes. 14 days, full Pro features, no credit card required to start.' },
            { q: 'What does the $2 transaction fee cover?', a: 'Each online rent payment processed through Keywise costs $2 flat — not a percentage of rent. A $3,000 payment costs the same as a $1,000 one.' },
            { q: 'Can I switch from monthly to annual?', a: 'Yes, anytime from your billing settings. Annual saves $198/year vs monthly.' },
            { q: 'What if founding member spots fill up?', a: "The founding member offer disappears. You can still subscribe at the standard $49/mo or $390/yr price." },
            { q: 'Can I cancel anytime?', a: 'Yes. No contracts, no cancellation fees. Cancel from your settings page and your subscription ends at the end of the billing period.' },
          ].map((item, i) => (
            <div key={i} style={{ borderBottom: `1px solid ${BORDER}`, padding: '16px 0' }}>
              <div style={{ fontWeight: 600, fontSize: 15, color: N, marginBottom: 6 }}>{item.q}</div>
              <div style={{ fontSize: 14, color: INK_MID, lineHeight: 1.6 }}>{item.a}</div>
            </div>
          ))}
        </div>

        {/* CTA */}
        <div style={{ marginTop: 60, padding: 32, background: N, borderRadius: 12, textAlign: 'center' }}>
          <h3 style={{ fontSize: 22, fontWeight: 700, color: '#fff', marginBottom: 8 }}>Ready to manage smarter?</h3>
          <p style={{ fontSize: 14, color: 'rgba(255,255,255,0.8)', marginBottom: 20 }}>
            Free for 1 unit. 14-day Pro trial. No credit card required.
          </p>
          <Link href="/?signup=true" style={{ display: 'inline-block', background: TEAL, color: N, padding: '14px 32px', borderRadius: 10, fontSize: 15, fontWeight: 700, textDecoration: 'none' }}>
            Try Keywise free →
          </Link>
        </div>
      </main>

      <footer style={{ borderTop: `1px solid ${BORDER}`, padding: '32px 40px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 16 }}>
        <span style={{ fontSize: 13, color: INK_MUTED }}>© {new Date().getFullYear()} Keywise. All rights reserved.</span>
        <div style={{ display: 'flex', gap: 24 }}>
          <Link href="/privacy" style={{ fontSize: 13, color: INK_MUTED, textDecoration: 'none' }}>Privacy</Link>
          <Link href="/terms" style={{ fontSize: 13, color: INK_MUTED, textDecoration: 'none' }}>Terms</Link>
          <Link href="/contact" style={{ fontSize: 13, color: INK_MUTED, textDecoration: 'none' }}>Contact</Link>
        </div>
      </footer>
    </div>
  );
}
