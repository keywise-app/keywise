import type { Metadata } from 'next';
import Link from 'next/link';
import EvictionWizard from './EvictionWizard';

export const metadata: Metadata = {
  title: 'California Eviction Notice Generator (Free) | Keywise',
  description:
    'Generate California eviction notices with built-in defect checking. 3-day pay or quit, cure or quit, 30/60-day no-fault notices. Free tool with statutory citations and compliance checks.',
  alternates: { canonical: 'https://keywise.app/tools/ca/eviction-notice' },
  openGraph: {
    title: 'California Eviction Notice Generator (Free) | Keywise',
    description:
      'Generate California eviction notices with built-in defect checking. Free tool with statutory citations.',
    url: 'https://keywise.app/tools/ca/eviction-notice',
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

const faqs = [
  {
    q: 'What is just cause for eviction in California?',
    a: 'Under California Civil Code Section 1946.2, landlords of covered properties must have a legally recognized reason ("just cause") to terminate a tenancy after all tenants have occupied for 12+ months or at least one tenant for 24+ months. Just causes are divided into at-fault (e.g., nonpayment of rent, lease violation) and no-fault (e.g., owner move-in, substantial remodel).',
  },
  {
    q: 'How many days notice is required for a California eviction?',
    a: 'It depends on the type of notice. At-fault notices (pay or quit, cure or quit, unconditional quit) require 3 days, excluding Saturdays, Sundays, and judicial holidays. No-fault terminations require 30 days (tenancies under 1 year) or 60 days (tenancies of 1 year or more). Calendar days apply to 30/60-day notices.',
  },
  {
    q: 'What is relocation assistance in California?',
    a: 'For no-fault terminations under CC 1946.2, the landlord must provide relocation assistance equal to one month\'s rent, either as a direct payment within 15 days of serving the notice or as a waiver of the final month\'s rent. Failure to strictly comply renders the notice void. Local ordinances may require higher amounts.',
  },
  {
    q: 'Can I evict a tenant without just cause in California?',
    a: 'For tenancies covered by CC 1946.2 (most residential tenancies after 12+ months of continuous occupancy), landlords must have just cause. Some properties are exempt, including new construction (within 15 years), owner-occupied duplexes, and certain single-family homes with proper written notice of exemption.',
  },
  {
    q: 'What did SB 567 change about owner move-in evictions?',
    a: 'Effective April 1, 2024, SB 567 requires: (1) the owner must move in within 90 days of the tenant vacating, (2) at least 25% recorded ownership interest, (3) minimum 12 months continuous occupancy as primary residence, and (4) if the owner fails to comply, they must offer the unit back to the tenant at the same rent.',
  },
  {
    q: 'What makes an eviction notice defective?',
    a: 'Common defects include: wrong notice type (e.g., unconditional quit when cure is required), overstating rent amount (including non-rent charges), missing required payment recipient information, failure to state just cause, failure to provide relocation assistance for no-fault notices, improper service method, and filing before the notice period expires.',
  },
];

export default function EvictionNoticePage() {
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
          California Eviction Notice Generator
        </h1>
        <p style={{ fontSize: 16, color: INK_MID, margin: '0 auto', maxWidth: 560, lineHeight: 1.6 }}>
          Generate California eviction notices with built-in defect checking and statutory citations. Select your notice type, enter the details, and review before serving.
        </p>
        <p style={{ fontSize: 13, color: '#FF6B6B', margin: '12px auto 0', maxWidth: 480, fontWeight: 600 }}>
          This tool is NOT legal advice. Consult a licensed California attorney before serving any notice.
        </p>
      </div>

      {/* Wizard */}
      <div style={{ padding: '32px 24px 60px' }}>
        <EvictionWizard />
      </div>

      {/* FAQ */}
      <div style={{ background: BG, padding: '60px 24px' }}>
        <div style={{ maxWidth: 620, margin: '0 auto' }}>
          <h2 style={{ fontSize: 24, fontWeight: 700, color: N, marginBottom: 24 }}>Frequently Asked Questions</h2>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
            {faqs.map((faq, i) => (
              <div key={i}>
                <h3 style={{ fontSize: 15, fontWeight: 700, color: N, marginBottom: 6 }}>{faq.q}</h3>
                <p style={{ fontSize: 14, color: INK_MID, lineHeight: 1.6, margin: 0 }}>{faq.a}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Bottom */}
      <div style={{ padding: '40px 24px 60px' }}>
        <div style={{ maxWidth: 620, margin: '0 auto' }}>
          <h2 style={{ fontSize: 20, fontWeight: 700, color: N, marginBottom: 16 }}>More landlord tools</h2>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 32 }}>
            <Link href="/tools/ca/ab1482-calculator" style={{ fontSize: 14, color: '#00A886', fontWeight: 600, textDecoration: 'none' }}>{'→ AB 1482 Rent Cap Calculator'}</Link>
            <Link href="/blog/security-deposit-laws" style={{ fontSize: 14, color: '#00A886', fontWeight: 600, textDecoration: 'none' }}>{'→ Security Deposit Laws: What Every Landlord Needs to Know'}</Link>
            <Link href="/blog/landlord-tenant-communication" style={{ fontSize: 14, color: '#00A886', fontWeight: 600, textDecoration: 'none' }}>{'→ Landlord-Tenant Communication Guide'}</Link>
          </div>

          {/* Disclaimer */}
          <div style={{ background: '#FFF0F0', border: '1px solid #FF6B6B33', borderRadius: 10, padding: 16, marginBottom: 20 }}>
            <p style={{ fontSize: 12, color: '#FF6B6B', margin: 0, fontWeight: 600, marginBottom: 6 }}>Legal Disclaimer</p>
            <p style={{ fontSize: 12, color: INK_MID, margin: 0, lineHeight: 1.5 }}>
              This tool provides factual information about California eviction notice requirements. It is NOT legal advice and does not create an attorney-client relationship. The user selects the notice type — this tool does not recommend which notice to use. For legal advice specific to your situation, consult a licensed California attorney.
            </p>
            <a
              href="https://www.calbar.ca.gov/Public/Need-Legal-Help/Lawyer-Referral-Service"
              target="_blank"
              rel="noopener noreferrer"
              style={{ fontSize: 12, color: '#00A886', fontWeight: 600, textDecoration: 'none', display: 'inline-block', marginTop: 8 }}
            >
              Find a California Attorney (CA State Bar) {'->'}
            </a>
          </div>

          <div style={{ fontSize: 13, color: INK_MUTED, borderTop: `1px solid ${BORDER}`, paddingTop: 20 }}>
            <p style={{ margin: '0 0 8px' }}>
              Keywise helps California landlords stay compliant with AB 1482, just-cause eviction rules, and local ordinances.
            </p>
            <Link href="/" style={{ color: '#00A886', fontWeight: 600, textDecoration: 'none' }}>Learn more about Keywise {'→'}</Link>
          </div>
        </div>
      </div>

      {/* Structured data */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify({
            '@context': 'https://schema.org',
            '@type': 'FAQPage',
            mainEntity: faqs.map((f) => ({
              '@type': 'Question',
              name: f.q,
              acceptedAnswer: { '@type': 'Answer', text: f.a },
            })),
          }),
        }}
      />
    </div>
  );
}
