import type { Metadata } from 'next';
import Link from 'next/link';
import CalculatorSection from './CalculatorSection';

export const metadata: Metadata = {
  title: 'Free California Rent Cap Calculator (AB 1482) | Keywise',
  description: 'Estimate the maximum allowable rent increase for your California rental property under AB 1482. Free tool with current 2026 CPI rates from BLS.',
  alternates: { canonical: 'https://keywise.app/tools/ca/ab1482-calculator' },
  openGraph: {
    title: 'Free California Rent Cap Calculator (AB 1482) | Keywise',
    description: 'Estimate the maximum allowable rent increase for your California rental property under AB 1482.',
    url: 'https://keywise.app/tools/ca/ab1482-calculator',
    siteName: 'Keywise',
    type: 'website',
    images: [{ url: '/og-image.png', width: 1200, height: 628 }],
  },
  robots: { index: true, follow: true },
};

const N = '#0F3460';
const TEAL = '#00D4AA';
const BG = '#F0F4FF';
const BORDER = '#E0E6F0';
const INK_MID = '#4A5068';
const INK_MUTED = '#8892A4';

export default function AB1482CalculatorPage() {
  return (
    <div style={{ fontFamily: "'Inter', system-ui, sans-serif", background: '#fff', color: '#1A1A2E', minHeight: '100vh' }}>
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
          <Link href="/blog" style={{ fontSize: 13, color: INK_MID, textDecoration: 'none', fontWeight: 500 }}>Blog</Link>
          <Link href="/?signup=true" style={{ fontSize: 13, color: '#fff', textDecoration: 'none', fontWeight: 600, background: N, padding: '7px 16px', borderRadius: 8 }}>Start Free</Link>
        </div>
      </nav>

      {/* Hero */}
      <div style={{ background: `linear-gradient(160deg, ${BG} 0%, #e8f0ff 100%)`, padding: '48px 24px 40px', textAlign: 'center' }}>
        <div style={{ display: 'inline-block', background: '#E0FAF5', border: '1px solid #00D4AA44', borderRadius: 100, padding: '4px 14px', marginBottom: 16 }}>
          <span style={{ fontSize: 12, fontWeight: 700, color: '#00A886', textTransform: 'uppercase', letterSpacing: '0.8px' }}>Free Tool</span>
        </div>
        <h1 style={{ fontSize: 36, fontWeight: 800, color: N, letterSpacing: '-1px', margin: '0 0 12px', lineHeight: 1.15 }}>
          California Rent Cap Calculator
        </h1>
        <p style={{ fontSize: 16, color: INK_MID, margin: '0 auto', maxWidth: 520, lineHeight: 1.6 }}>
          Estimate the maximum allowable rent increase for your California rental property under AB 1482 (Tenant Protection Act). Updated with 2026 CPI data from the Bureau of Labor Statistics.
        </p>
      </div>

      {/* Calculator */}
      <div style={{ padding: '32px 24px 60px' }}>
        <CalculatorSection />
      </div>

      {/* FAQ section for SEO */}
      <div style={{ background: BG, padding: '60px 24px' }}>
        <div style={{ maxWidth: 620, margin: '0 auto' }}>
          <h2 style={{ fontSize: 24, fontWeight: 700, color: N, marginBottom: 24 }}>Frequently Asked Questions</h2>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
            {[
              {
                q: 'What is AB 1482?',
                a: 'AB 1482, the California Tenant Protection Act, limits annual rent increases to 5% plus the local Consumer Price Index (CPI) change, or 10%, whichever is lower. It applies to most residential rental properties in California built more than 15 years ago.',
              },
              {
                q: 'How is the rent cap calculated?',
                a: 'The maximum annual increase is 5% + the April-to-April CPI change for your region, capped at 10%. The CPI component uses the BLS Consumer Price Index for All Urban Consumers (CPI-U) for the metropolitan area where the property is located.',
              },
              {
                q: 'Which properties are exempt from AB 1482?',
                a: 'Exempt properties include: new construction (built within the last 15 years), single-family homes owned by individuals who have given proper written notice, owner-occupied duplexes, deed-restricted affordable housing, and units already covered by a local rent control ordinance that is stricter than AB 1482.',
              },
              {
                q: 'What if my city has its own rent control?',
                a: 'If your city has a local rent control ordinance with a lower cap than AB 1482 (e.g., Los Angeles RSO at 3%, San Francisco at 1.4%), the stricter local rate applies. This calculator checks for local ordinances and shows the applicable rate.',
              },
              {
                q: 'How much notice do I need to give?',
                a: 'Per California Civil Code 827, landlords must give at least 30 days written notice for rent increases of 10% or less within a 12-month period, and 90 days for increases exceeding 10%.',
              },
              {
                q: 'When does AB 1482 expire?',
                a: 'AB 1482 is currently set to expire on January 1, 2030. Legislation has been proposed to extend or make the protections permanent, but as of 2026, the sunset date remains 2030.',
              },
            ].map((faq, i) => (
              <div key={i}>
                <h3 style={{ fontSize: 15, fontWeight: 700, color: N, marginBottom: 6 }}>{faq.q}</h3>
                <p style={{ fontSize: 14, color: INK_MID, lineHeight: 1.6, margin: 0 }}>{faq.a}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Related tools / bottom CTA */}
      <div style={{ padding: '40px 24px 60px' }}>
        <div style={{ maxWidth: 620, margin: '0 auto' }}>
          <h2 style={{ fontSize: 20, fontWeight: 700, color: N, marginBottom: 16 }}>More landlord tools</h2>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 32 }}>
            <Link href="/blog/security-deposit-laws" style={{ fontSize: 14, color: '#00A886', fontWeight: 600, textDecoration: 'none' }}>→ Security Deposit Laws: What Every Landlord Needs to Know</Link>
            <Link href="/blog/landlord-tenant-communication" style={{ fontSize: 14, color: '#00A886', fontWeight: 600, textDecoration: 'none' }}>→ Landlord-Tenant Communication Guide</Link>
            <Link href="/blog/free-lease-agreement-template" style={{ fontSize: 14, color: '#00A886', fontWeight: 600, textDecoration: 'none' }}>→ Free Lease Agreement Template</Link>
          </div>

          <div style={{ fontSize: 13, color: INK_MUTED, borderTop: `1px solid ${BORDER}`, paddingTop: 20 }}>
            <p style={{ margin: '0 0 8px' }}>
              Keywise helps California landlords stay compliant with AB 1482, just-cause eviction rules, and local ordinances.
            </p>
            <Link href="/" style={{ color: '#00A886', fontWeight: 600, textDecoration: 'none' }}>Learn more about Keywise →</Link>
          </div>
        </div>
      </div>

      {/* Structured data for SEO */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify({
            '@context': 'https://schema.org',
            '@type': 'FAQPage',
            mainEntity: [
              { '@type': 'Question', name: 'What is AB 1482?', acceptedAnswer: { '@type': 'Answer', text: 'AB 1482, the California Tenant Protection Act, limits annual rent increases to 5% plus the local CPI change, or 10%, whichever is lower.' } },
              { '@type': 'Question', name: 'How is the California rent cap calculated?', acceptedAnswer: { '@type': 'Answer', text: 'The maximum annual increase is 5% + the April-to-April CPI change for your region, capped at 10%.' } },
              { '@type': 'Question', name: 'Which properties are exempt from AB 1482?', acceptedAnswer: { '@type': 'Answer', text: 'New construction (within 15 years), single-family homes with proper notice, owner-occupied duplexes, and deed-restricted affordable housing.' } },
            ],
          }),
        }}
      />
    </div>
  );
}
