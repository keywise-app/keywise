import type { Metadata } from 'next';
import Link from 'next/link';

export const metadata: Metadata = {
  title: 'Pricing | Keywise',
  description: 'Simple pricing for independent landlords. Free for 1-2 units, $19/mo for unlimited. No contracts, cancel anytime.',
  alternates: { canonical: 'https://keywise.app/pricing' },
  openGraph: {
    title: 'Pricing | Keywise',
    description: 'Simple pricing for independent landlords. Free for 1-2 units, $19/mo for unlimited. No contracts, cancel anytime.',
    url: 'https://keywise.app/pricing',
    siteName: 'Keywise',
    type: 'website',
    images: [{ url: '/og-image.png', width: 1200, height: 628 }],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Pricing | Keywise',
    description: 'Simple pricing for independent landlords. Free for 1-2 units, $19/mo for unlimited.',
  },
  robots: { index: true, follow: true },
};

const N = '#0F3460';
const TEAL = '#00D4AA';
const TEAL_DARK = '#00A886';
const BG = '#F0F4FF';
const SURFACE = '#FFFFFF';
const BORDER = '#E0E6F0';
const INK = '#1A1A2E';
const INK_MID = '#4A5068';
const INK_MUTED = '#8892A4';

export default function PricingPage() {
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
        <Link href="/" style={{ fontSize: 13, color: INK_MID, textDecoration: 'none', fontWeight: 500 }}>← Back to home</Link>
      </nav>

      {/* Pricing */}
      <main style={{ maxWidth: 800, margin: '0 auto', padding: '60px 24px 80px' }}>
        <div style={{ textAlign: 'center', marginBottom: 52 }}>
          <h1 style={{ fontSize: 40, fontWeight: 800, color: N, letterSpacing: '-1px', margin: '0 0 12px' }}>
            Simple pricing that grows with you.
          </h1>
          <p style={{ fontSize: 16, color: INK_MUTED, margin: 0 }}>No contracts. Cancel anytime.</p>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20, maxWidth: 720, margin: '0 auto' }}>
          {/* Free */}
          <div style={{ background: SURFACE, borderRadius: 20, padding: '32px 28px', border: `1px solid ${BORDER}`, boxShadow: '0 2px 8px rgba(15,52,96,0.06)' }}>
            <div style={{ fontSize: 13, fontWeight: 700, color: INK_MUTED, textTransform: 'uppercase', letterSpacing: '0.8px', marginBottom: 8 }}>Free</div>
            <div style={{ display: 'flex', alignItems: 'baseline', gap: 4, marginBottom: 6 }}>
              <span style={{ fontSize: 44, fontWeight: 800, color: N, letterSpacing: '-2px' }}>$0</span>
              <span style={{ fontSize: 14, color: INK_MUTED }}>/forever</span>
            </div>
            <div style={{ fontSize: 13, color: INK_MID, marginBottom: 28 }}>Up to 2 units</div>
            <div style={{ borderTop: `1px solid ${BORDER}`, paddingTop: 20, marginBottom: 28 }}>
              {['Lease tracking', 'Document storage', 'AI communications', 'Tenant portal', 'Move-in/out inspections', 'Document signing'].map(f => (
                <div key={f} style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10, fontSize: 14, color: INK_MID }}>
                  <span style={{ color: TEAL_DARK, fontWeight: 700, fontSize: 16 }}>✓</span> {f}
                </div>
              ))}
            </div>
            <Link href="/?signup=true" style={{ display: 'block', textAlign: 'center', background: 'transparent', color: N, border: `1.5px solid ${BORDER}`, borderRadius: 10, padding: '12px', fontSize: 14, fontWeight: 700, textDecoration: 'none' }}>
              Get started free →
            </Link>
          </div>

          {/* Pro */}
          <div style={{ background: N, borderRadius: 20, padding: '32px 28px', border: `2px solid ${TEAL}44`, boxShadow: `0 8px 32px rgba(15,52,96,0.2)`, position: 'relative', overflow: 'hidden' }}>
            <div style={{ position: 'absolute', top: -30, right: -30, width: 120, height: 120, borderRadius: '50%', background: `${TEAL}12` }} />
            <div style={{ position: 'absolute', bottom: -20, left: -20, width: 80, height: 80, borderRadius: '50%', background: `${TEAL}08` }} />
            <div style={{ position: 'relative' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                <span style={{ fontSize: 13, fontWeight: 700, color: 'rgba(255,255,255,0.6)', textTransform: 'uppercase', letterSpacing: '0.8px' }}>Pro</span>
                <span style={{ fontSize: 11, fontWeight: 700, background: TEAL, color: N, padding: '3px 10px', borderRadius: 100 }}>POPULAR</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'baseline', gap: 4, marginBottom: 6 }}>
                <span style={{ fontSize: 44, fontWeight: 800, color: '#fff', letterSpacing: '-2px' }}>$19</span>
                <span style={{ fontSize: 14, color: 'rgba(255,255,255,0.5)' }}>/mo</span>
              </div>
              <div style={{ fontSize: 13, color: 'rgba(255,255,255,0.5)', marginBottom: 28 }}>Unlimited units</div>
              <div style={{ borderTop: '1px solid rgba(255,255,255,0.1)', paddingTop: 20, marginBottom: 28 }}>
                {['Everything in Free', 'Online rent collection', 'Payment reminders', 'Maintenance tracking', 'AI lease extraction', 'Priority support'].map(f => (
                  <div key={f} style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10, fontSize: 14, color: 'rgba(255,255,255,0.8)' }}>
                    <span style={{ color: TEAL, fontWeight: 700, fontSize: 16 }}>✓</span> {f}
                  </div>
                ))}
              </div>
              <Link href="/?signup=true" style={{ display: 'block', textAlign: 'center', background: TEAL, color: N, border: 'none', borderRadius: 10, padding: '12px', fontSize: 14, fontWeight: 700, textDecoration: 'none' }}>
                Start free trial →
              </Link>
            </div>
          </div>
        </div>

        <p style={{ textAlign: 'center', fontSize: 13, color: INK_MUTED, marginTop: 20 }}>
          $2 per online payment transaction. No hidden fees.
        </p>

        {/* FAQ */}
        <div style={{ maxWidth: 600, margin: '60px auto 0' }}>
          <h2 style={{ fontSize: 24, fontWeight: 700, color: N, textAlign: 'center', marginBottom: 24 }}>Common questions</h2>
          {[
            { q: 'Is it really free for 1-2 units?', a: 'Yes. Free forever — no credit card, no trial that expires. You only pay if you upgrade to Pro for unlimited units and online rent collection.' },
            { q: 'What does the $2 transaction fee cover?', a: 'Each online rent payment processed through Keywise costs $2 flat — not a percentage of rent. A $3,000 payment costs the same as a $1,000 one.' },
            { q: 'Can I cancel Pro anytime?', a: 'Yes. No contracts, no cancellation fees. Cancel from your settings page and your subscription ends at the end of the billing period.' },
            { q: 'What payment methods do tenants use?', a: 'Credit card, debit card, or saved card with auto-pay. Payments go directly to your bank account via Stripe.' },
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
            Free for up to 2 units. No credit card required.
          </p>
          <Link href="/?signup=true" style={{ display: 'inline-block', background: TEAL, color: N, padding: '14px 32px', borderRadius: 10, fontSize: 15, fontWeight: 700, textDecoration: 'none' }}>
            Try Keywise free →
          </Link>
        </div>
      </main>

      {/* Footer */}
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
