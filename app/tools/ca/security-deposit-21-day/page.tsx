import type { Metadata } from 'next';
import Link from 'next/link';

export const metadata: Metadata = {
  title: 'California Security Deposit 21-Day Rule Explained | Keywise',
  description:
    'California landlords have 21 days to return a tenant\'s security deposit with an itemized statement for any deductions. Miss the deadline and you can owe 2x the deposit plus statutory damages. Complete guide with Civil Code § 1950.5 citations and AB 2801 photo requirements.',
  alternates: { canonical: 'https://keywise.app/tools/ca/security-deposit-21-day' },
  openGraph: {
    title: 'California Security Deposit 21-Day Rule Explained | Keywise',
    description:
      'California landlords have 21 days to return a security deposit. Miss it and you can owe 2x the deposit plus damages. Guide with Civil Code § 1950.5 citations.',
    url: 'https://keywise.app/tools/ca/security-deposit-21-day',
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
const INK = '#1A1A2E';
const INK_MID = '#4A5068';
const INK_MUTED = '#8892A4';
const CORAL = '#FF6B6B';

const faqs = [
  {
    q: 'When does the 21-day clock start?',
    a: 'The clock starts the day the tenant vacates the unit and returns possession (typically by turning in keys). Under California Civil Code § 1950.5(g), the landlord has 21 calendar days from that date to either return the full deposit, provide an itemized statement of deductions, or both. Weekends and holidays count.',
  },
  {
    q: 'What counts as "normal wear and tear" I cannot deduct for?',
    a: 'California courts generally treat as normal wear and tear: faded or lightly scuffed paint, minor carpet wear in traffic areas, small nail holes from hanging pictures, worn fixtures from ordinary use, and lightly worn appliances. You cannot deduct to restore the unit to better condition than move-in, only to compensate for damage beyond ordinary use.',
  },
  {
    q: 'Can I deduct for cleaning?',
    a: 'Yes, but only for cleaning necessary to return the unit to the same level of cleanliness it was in at move-in. Deep-cleaning charges that exceed that baseline are not allowed. Best practice: document unit condition with photos at move-in and move-out per AB 2801 requirements (see below).',
  },
  {
    q: 'Do I have to send receipts for deductions?',
    a: 'Under Civil Code § 1950.5(g)(2), if deductions exceed $125 in the aggregate, the landlord must include copies of receipts, invoices, or (for work not yet completed) good-faith cost estimates. If the tenant requests in writing, the landlord must also provide receipts for individual deductions of any amount.',
  },
  {
    q: 'What if the tenant doesn\'t give me a forwarding address?',
    a: 'Send the itemized statement and any refund to the last known address (typically the vacated unit). The 21-day deadline still applies. Save proof of mailing. The tenant\'s failure to provide a forwarding address does not extend the deadline or excuse compliance.',
  },
  {
    q: 'What are the penalties if I miss the 21-day deadline?',
    a: 'Under Civil Code § 1950.5(l), a landlord who acts in bad faith by retaining any part of the deposit can be liable for the actual amount owed plus statutory damages of up to twice the amount of the deposit. Bad-faith retention also voids the landlord\'s right to any deductions, meaning the tenant recovers the full deposit even for legitimate damages. Attorney\'s fees may also be recoverable in small claims.',
  },
  {
    q: 'Does AB 2801 (photo requirements) apply to me?',
    a: 'Yes — AB 2801 amended Civil Code § 1950.5 to add photograph requirements for nearly all California residential tenancies. Effective July 1, 2025 (for tenancies starting on or after April 1, 2025): landlords must take photographs of the unit\'s condition (1) within a reasonable time before or at move-in, (2) within a reasonable time after the tenant moves out but before any repairs or cleaning, and (3) within a reasonable time after any repairs. These photos must be provided with the itemized statement.',
  },
  {
    q: 'How much security deposit can I collect?',
    a: 'As of July 1, 2024, AB 12 capped most California residential security deposits at one month\'s rent, regardless of whether the unit is furnished. A limited exception allows up to two months\' rent for landlords who own no more than two residential properties collectively containing no more than four units — but only for the small-landlord exemption. Collecting more than the cap can trigger the same 2x statutory damages as bad-faith retention.',
  },
  {
    q: 'Do I have to pay interest on the security deposit?',
    a: 'California state law does not require paying interest on security deposits. However, many local ordinances do — including Los Angeles, San Francisco, West Hollywood, Berkeley, Santa Monica, and Watsonville — with rates set annually. Check your local rent-control or landlord-tenant ordinance.',
  },
  {
    q: 'Can I keep the deposit if the tenant broke the lease?',
    a: 'You can deduct unpaid rent and reasonable damages, but you still must send the itemized statement within 21 days and cannot keep the entire deposit as a blanket "lease-break penalty." California requires landlords to mitigate damages by attempting to re-rent, so you can only deduct rent for the period the unit was actually vacant while you made reasonable efforts to find a new tenant.',
  },
];

export default function SecurityDeposit21DayPage() {
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
          <Link href="/blog" style={{ fontSize: 13, color: INK_MID, textDecoration: 'none', fontWeight: 500 }}>Blog</Link>
          <Link href="/?signup=true" style={{ fontSize: 13, color: '#fff', textDecoration: 'none', fontWeight: 600, background: N, padding: '7px 16px', borderRadius: 8 }}>Start Free</Link>
        </div>
      </nav>

      {/* Hero */}
      <div style={{ background: `linear-gradient(160deg, ${BG} 0%, #e8f0ff 100%)`, padding: '48px 24px 40px', textAlign: 'center' }}>
        <div style={{ display: 'inline-block', background: '#FFF8E0', border: '1px solid #FEBC2E44', borderRadius: 100, padding: '4px 14px', marginBottom: 16 }}>
          <span style={{ fontSize: 12, fontWeight: 700, color: '#9A6500', textTransform: 'uppercase', letterSpacing: '0.8px' }}>Interactive tool coming soon</span>
        </div>
        <h1 style={{ fontSize: 36, fontWeight: 800, color: N, letterSpacing: '-1px', margin: '0 0 12px', lineHeight: 1.15 }}>
          California Security Deposit 21-Day Rule
        </h1>
        <p style={{ fontSize: 16, color: INK_MID, margin: '0 auto', maxWidth: 620, lineHeight: 1.6 }}>
          California landlords have exactly 21 calendar days after the tenant vacates to return the security deposit — with an itemized statement for any deductions. Miss the deadline and courts can award the tenant twice the deposit plus statutory damages.
        </p>
        <p style={{ fontSize: 13, color: CORAL, margin: '12px auto 0', maxWidth: 480, fontWeight: 600 }}>
          This page is a plain-English guide, not legal advice. Consult a licensed California attorney for your specific situation.
        </p>
      </div>

      {/* Rule at a glance */}
      <div style={{ padding: '48px 24px', maxWidth: 720, margin: '0 auto' }}>
        <h2 style={{ fontSize: 24, fontWeight: 700, color: N, marginBottom: 20, letterSpacing: '-0.4px' }}>The rule at a glance</h2>
        <div style={{ background: BG, borderRadius: 12, padding: 24, marginBottom: 32, border: `1px solid ${BORDER}` }}>
          <p style={{ fontSize: 14, color: INK_MID, lineHeight: 1.7, margin: '0 0 12px' }}>
            <strong style={{ color: N }}>Civil Code § 1950.5(g)</strong> gives the landlord 21 calendar days after the tenant vacates to send:
          </p>
          <ul style={{ fontSize: 14, color: INK_MID, lineHeight: 1.8, margin: '0 0 12px', paddingLeft: 20 }}>
            <li>Any refund owed, and</li>
            <li>An itemized written statement of any deductions, and</li>
            <li>Copies of receipts or good-faith estimates if deductions exceed $125.</li>
          </ul>
          <p style={{ fontSize: 14, color: INK_MID, lineHeight: 1.7, margin: 0 }}>
            The clock starts on the day the tenant returns possession. Weekends and holidays count.
          </p>
        </div>

        <h2 style={{ fontSize: 24, fontWeight: 700, color: N, marginBottom: 20, letterSpacing: '-0.4px' }}>What you can deduct</h2>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 16, marginBottom: 32 }}>
          <div style={{ background: '#F0FAF0', border: '1px solid #00A86B33', borderRadius: 12, padding: 20 }}>
            <div style={{ fontSize: 12, fontWeight: 700, color: '#00A86B', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: 8 }}>Allowed</div>
            <ul style={{ fontSize: 14, color: INK_MID, lineHeight: 1.7, margin: 0, paddingLeft: 18 }}>
              <li>Unpaid rent</li>
              <li>Reasonable cleaning to restore move-in condition</li>
              <li>Repair of damage beyond ordinary wear and tear</li>
              <li>Restoration of items the tenant altered per lease</li>
            </ul>
          </div>
          <div style={{ background: '#FFF0F0', border: `1px solid ${CORAL}33`, borderRadius: 12, padding: 20 }}>
            <div style={{ fontSize: 12, fontWeight: 700, color: CORAL, textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: 8 }}>Not allowed</div>
            <ul style={{ fontSize: 14, color: INK_MID, lineHeight: 1.7, margin: 0, paddingLeft: 18 }}>
              <li>Normal wear and tear (faded paint, worn carpet)</li>
              <li>Cleaning above the move-in baseline</li>
              <li>Repairs of conditions that pre-existed the tenant</li>
              <li>Improvements that primarily benefit the landlord</li>
            </ul>
          </div>
        </div>

        <h2 style={{ fontSize: 24, fontWeight: 700, color: N, marginBottom: 20, letterSpacing: '-0.4px' }}>What happens if you miss the deadline</h2>
        <div style={{ background: '#FFF0F0', border: `1px solid ${CORAL}33`, borderRadius: 12, padding: 24, marginBottom: 32 }}>
          <p style={{ fontSize: 14, color: INK_MID, lineHeight: 1.7, margin: '0 0 12px' }}>
            Under <strong style={{ color: N }}>Civil Code § 1950.5(l)</strong>, a landlord who acts in bad faith by retaining any part of the deposit can be liable for:
          </p>
          <ul style={{ fontSize: 14, color: INK_MID, lineHeight: 1.8, margin: '0 0 12px', paddingLeft: 20 }}>
            <li>The full amount of the deposit owed to the tenant, plus</li>
            <li>Statutory damages up to <strong style={{ color: CORAL }}>2x the deposit</strong>, plus</li>
            <li>Loss of any right to deductions (even legitimate ones).</li>
          </ul>
          <p style={{ fontSize: 14, color: INK_MID, lineHeight: 1.7, margin: 0 }}>
            On a $3,000 deposit, that&apos;s a potential $9,000 hit — before attorney&apos;s fees. Small claims judges see these cases constantly and lean toward the tenant when the paper trail is thin.
          </p>
        </div>

        <h2 style={{ fontSize: 24, fontWeight: 700, color: N, marginBottom: 20, letterSpacing: '-0.4px' }}>AB 2801 photo requirements (effective July 2025)</h2>
        <div style={{ background: BG, borderRadius: 12, padding: 24, marginBottom: 32, border: `1px solid ${BORDER}` }}>
          <p style={{ fontSize: 14, color: INK_MID, lineHeight: 1.7, margin: '0 0 12px' }}>
            AB 2801 amended Civil Code § 1950.5 to require photographic documentation for nearly all California residential tenancies. For tenancies starting on or after April 1, 2025, landlords must take photos:
          </p>
          <ol style={{ fontSize: 14, color: INK_MID, lineHeight: 1.8, margin: '0 0 12px', paddingLeft: 20 }}>
            <li>Within a reasonable time <strong>before or at move-in</strong>, showing baseline condition</li>
            <li>Within a reasonable time <strong>after move-out but before any repairs or cleaning</strong>, showing the damage claimed</li>
            <li>Within a reasonable time <strong>after any repairs</strong>, showing the work done</li>
          </ol>
          <p style={{ fontSize: 14, color: INK_MID, lineHeight: 1.7, margin: 0 }}>
            Photos must be provided along with the itemized statement. Without them, deductions for damage are much harder to defend in small claims.
          </p>
        </div>

        <h2 style={{ fontSize: 24, fontWeight: 700, color: N, marginBottom: 20, letterSpacing: '-0.4px' }}>How much deposit can you collect?</h2>
        <p style={{ fontSize: 14, color: INK_MID, lineHeight: 1.7, margin: '0 0 32px' }}>
          Since July 1, 2024, AB 12 caps most California residential security deposits at <strong style={{ color: N }}>one month&apos;s rent</strong>, regardless of whether the unit is furnished. A narrow exception lets small landlords (owning no more than 2 residential properties, no more than 4 total units) collect up to two months. Collecting more triggers the same statutory-damages risk as bad-faith retention.
        </p>

        {/* Waitlist CTA */}
        <div style={{ background: N, borderRadius: 16, padding: 32, marginBottom: 40, textAlign: 'center', position: 'relative', overflow: 'hidden' }}>
          <div style={{ position: 'absolute', top: -40, right: -40, width: 160, height: 160, borderRadius: '50%', background: `${TEAL}14` }} />
          <div style={{ position: 'relative' }}>
            <h3 style={{ fontSize: 22, fontWeight: 800, color: '#fff', margin: '0 0 8px', letterSpacing: '-0.4px' }}>
              Deposit deadline tracker + itemization generator
            </h3>
            <p style={{ fontSize: 14, color: 'rgba(255,255,255,0.75)', margin: '0 auto 20px', maxWidth: 420, lineHeight: 1.6 }}>
              Track your 21-day clock automatically, generate the itemized statement, and store AB 2801 photos per unit. Coming soon to Keywise Pro.
            </p>
            <Link href="/?signup=true" style={{ display: 'inline-block', background: TEAL, color: N, padding: '12px 28px', borderRadius: 10, fontSize: 14, fontWeight: 700, textDecoration: 'none' }}>
              Get notified when it ships →
            </Link>
          </div>
        </div>
      </div>

      {/* FAQ */}
      <div style={{ background: BG, padding: '60px 24px' }}>
        <div style={{ maxWidth: 720, margin: '0 auto' }}>
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
        <div style={{ maxWidth: 720, margin: '0 auto' }}>
          <h2 style={{ fontSize: 20, fontWeight: 700, color: N, marginBottom: 16 }}>More California landlord tools</h2>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 32 }}>
            <Link href="/tools/ca/ab1482-calculator" style={{ fontSize: 14, color: '#00A886', fontWeight: 600, textDecoration: 'none' }}>{'→ AB 1482 Rent Cap Calculator'}</Link>
            <Link href="/tools/ca/eviction-notice" style={{ fontSize: 14, color: '#00A886', fontWeight: 600, textDecoration: 'none' }}>{'→ California Eviction Notice Generator'}</Link>
            <Link href="/inspections" style={{ fontSize: 14, color: '#00A886', fontWeight: 600, textDecoration: 'none' }}>{'→ AB 2801 Move-Out Inspections'}</Link>
            <Link href="/compliance" style={{ fontSize: 14, color: '#00A886', fontWeight: 600, textDecoration: 'none' }}>{'→ All California compliance tools'}</Link>
          </div>

          {/* Disclaimer */}
          <div style={{ background: '#FFF0F0', border: `1px solid ${CORAL}33`, borderRadius: 10, padding: 16, marginBottom: 20 }}>
            <p style={{ fontSize: 12, color: CORAL, margin: 0, fontWeight: 600, marginBottom: 6 }}>Legal Disclaimer</p>
            <p style={{ fontSize: 12, color: INK_MID, margin: 0, lineHeight: 1.5 }}>
              This guide summarizes California Civil Code § 1950.5 and related statutes in plain English. It is NOT legal advice and does not create an attorney-client relationship. Local ordinances (Los Angeles, San Francisco, Oakland, Berkeley, and others) may impose additional deposit interest or return requirements. For advice specific to your situation, consult a licensed California attorney.
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
              Keywise helps California landlords stay compliant with AB 1482, AB 2801, just-cause eviction rules, and local ordinances.
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
