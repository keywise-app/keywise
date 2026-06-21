import type { Metadata } from 'next';
import Link from 'next/link';

export const metadata: Metadata = {
  title: '3 Free Compliance Tools Every California Landlord Needs in 2026 | Keywise',
  description: 'AB 1482 rent cap calculator, just-cause eviction notice wizard, and AB 2801 move-out inspections — all free, all built for small landlords.',
  alternates: { canonical: 'https://keywise.app/blog/california-compliance-tools-landlords' },
  openGraph: {
    title: '3 Free Compliance Tools Every California Landlord Needs in 2026 | Keywise',
    description: 'AB 1482 rent cap calculator, just-cause eviction notice wizard, and AB 2801 move-out inspections — all free.',
    url: 'https://keywise.app/blog/california-compliance-tools-landlords',
    siteName: 'Keywise',
    type: 'article',
    images: [{ url: '/og-image.png', width: 1200, height: 628 }],
  },
  twitter: {
    card: 'summary_large_image',
    title: '3 Free Compliance Tools Every California Landlord Needs in 2026 | Keywise',
    description: 'AB 1482 rent cap calculator, just-cause eviction notice wizard, and AB 2801 move-out inspections — all free.',
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
const CORAL = '#FF6B6B';

export default function Page() {
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
        <Link href="/blog" style={{ fontSize: 13, color: INK_MID, textDecoration: 'none', fontWeight: 500 }}>← All articles</Link>
      </nav>

      <article style={{ maxWidth: 720, margin: '0 auto', padding: '60px 24px', lineHeight: 1.7 }}>
        <div style={{ fontSize: 12, color: INK_MUTED, textTransform: 'uppercase', letterSpacing: '1px', marginBottom: 12 }}>Compliance · June 2026</div>
        <h1 style={{ fontSize: 38, fontWeight: 800, color: N, letterSpacing: '-1px', marginBottom: 20, lineHeight: 1.2 }}>
          3 Free Compliance Tools Every California Landlord Needs in 2026
        </h1>
        <p style={{ fontSize: 18, color: INK_MID, marginBottom: 32 }}>
          California has some of the most complex landlord-tenant laws in the country. AB 1482 caps your rent increases. AB 2801 requires photo documentation of every move-out. Just-cause eviction rules mean you can&apos;t remove a tenant without following specific statutory procedures. Getting any of these wrong can cost you thousands.
        </p>

        <p style={{ fontSize: 16, color: INK_MID, marginBottom: 16 }}>
          Keywise offers three free compliance tools built specifically for small California landlords. No signup required for the calculators. No legal degree needed. Here&apos;s what each tool does and when to use it.
        </p>

        <nav style={{ background: BG, border: `1px solid ${BORDER}`, borderRadius: 10, padding: '16px 20px', marginBottom: 32 }}>
          <div style={{ fontSize: 12, fontWeight: 700, color: INK_MUTED, textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: 8 }}>In this article</div>
          <ul style={{ margin: 0, padding: 0, listStyle: 'none', display: 'flex', flexDirection: 'column', gap: 6 }}>
            <li><a href="#ab1482" style={{ fontSize: 14, color: TEAL_DARK, textDecoration: 'none', fontWeight: 500 }}>AB 1482 Rent Cap Calculator</a></li>
            <li><a href="#eviction" style={{ fontSize: 14, color: TEAL_DARK, textDecoration: 'none', fontWeight: 500 }}>Just-Cause Eviction Notice Wizard</a></li>
            <li><a href="#ab2801" style={{ fontSize: 14, color: TEAL_DARK, textDecoration: 'none', fontWeight: 500 }}>AB 2801 Move-Out Inspections</a></li>
            <li><a href="#dashboard" style={{ fontSize: 14, color: TEAL_DARK, textDecoration: 'none', fontWeight: 500 }}>Compliance dashboard for logged-in users</a></li>
          </ul>
        </nav>

        {/* Tool 1 */}
        <h2 id="ab1482" style={{ fontSize: 24, fontWeight: 700, color: N, marginTop: 40, marginBottom: 12 }}>1. AB 1482 Rent Cap Calculator</h2>
        <p style={{ fontSize: 16, color: INK_MID, marginBottom: 16 }}>
          California&apos;s Tenant Protection Act (AB 1482) limits annual rent increases to 5% + local CPI, or 10%, whichever is lower. The tricky part is figuring out which CPI region applies to your property, whether your property is exempt, and what the actual dollar amount works out to.
        </p>
        <p style={{ fontSize: 16, color: INK_MID, marginBottom: 16 }}>
          The Keywise AB 1482 calculator handles all of this. Enter your zip code, year built, property type, and current rent. The calculator determines your CPI region, checks exemption status, and shows you the maximum allowable increase in both percentage and dollar terms.
        </p>

        <div style={{ background: BG, border: `1px solid ${TEAL}44`, borderRadius: 12, padding: '20px 24px', marginBottom: 16 }}>
          <div style={{ fontWeight: 700, fontSize: 15, color: N, marginBottom: 8 }}>What the calculator does</div>
          <ul style={{ paddingLeft: 20, fontSize: 14, color: INK_MID, margin: 0, display: 'flex', flexDirection: 'column', gap: 6 }}>
            <li>Looks up the correct CPI rate for your zip code (2026 rates built in)</li>
            <li>Checks exemptions: year built, property type, owner-occupancy, corporate ownership</li>
            <li>Flags local ordinances that override AB 1482 (SF, LA, Oakland, Berkeley, and more)</li>
            <li>Shows the notice period required for your increase amount (30 vs 90 days)</li>
            <li>Supports multi-property mode for landlords with several units</li>
          </ul>
        </div>

        <p style={{ fontSize: 16, color: INK_MID, marginBottom: 16 }}>
          If you&apos;re logged in, results are saved to your portfolio and you can track which units are eligible for an increase and which are still within the 12-month waiting period.
        </p>

        <div style={{ textAlign: 'center', marginBottom: 32, marginTop: 24 }}>
          <Link href="/tools/ca/ab1482-calculator" style={{ display: 'inline-block', background: TEAL, color: N, padding: '12px 24px', borderRadius: 10, fontWeight: 700, fontSize: 14, textDecoration: 'none' }}>
            Use the AB 1482 Calculator →
          </Link>
        </div>

        {/* Tool 2 */}
        <h2 id="eviction" style={{ fontSize: 24, fontWeight: 700, color: N, marginTop: 40, marginBottom: 12 }}>2. Just-Cause Eviction Notice Wizard</h2>
        <p style={{ fontSize: 16, color: INK_MID, marginBottom: 16 }}>
          Under California Civil Code 1946.2, landlords must have a legally recognized reason (&ldquo;just cause&rdquo;) to terminate a tenancy after 12 months. There are 11 at-fault grounds (nonpayment, lease violation, nuisance, etc.) and 4 no-fault grounds (owner move-in, demolition, withdrawal from rental market, substantial remodel). Each ground has different notice periods, cure requirements, and relocation obligations.
        </p>
        <p style={{ fontSize: 16, color: INK_MID, marginBottom: 16 }}>
          The Keywise Eviction Notice Wizard walks you through all 12 notice types step by step:
        </p>
        <ol style={{ paddingLeft: 24, fontSize: 16, color: INK_MID, marginBottom: 16, display: 'flex', flexDirection: 'column', gap: 8 }}>
          <li><strong>Select your unit</strong> &mdash; the wizard pulls in the tenant name and property address.</li>
          <li><strong>Choose the notice type</strong> &mdash; 3-day, 30-day, 60-day, or 90-day, based on the ground for termination.</li>
          <li><strong>Enter the details</strong> &mdash; the wizard prompts for the specific information required for that notice type (unpaid amount, violation description, etc.).</li>
          <li><strong>Defect check</strong> &mdash; the wizard scans your notice for 13 common procedural defects that could get it thrown out in court.</li>
          <li><strong>Review and generate</strong> &mdash; the final notice includes statutory citations, tenant rights disclosures, and proof of service instructions.</li>
        </ol>

        <div style={{ background: '#FFF8E0', border: '1px solid #F5D76E', borderRadius: 10, padding: '14px 18px', marginBottom: 16 }}>
          <div style={{ fontWeight: 700, fontSize: 13, color: '#9A6500', marginBottom: 4 }}>Important disclaimer</div>
          <div style={{ fontSize: 13, color: INK_MID }}>
            This tool provides informational templates based on California statute. It is not legal advice. For complex evictions, contested cases, or local rent ordinance jurisdictions, consult a qualified attorney.
          </div>
        </div>

        <div style={{ textAlign: 'center', marginBottom: 32, marginTop: 24 }}>
          <Link href="/tools/ca/eviction-notice" style={{ display: 'inline-block', background: TEAL, color: N, padding: '12px 24px', borderRadius: 10, fontWeight: 700, fontSize: 14, textDecoration: 'none' }}>
            Use the Eviction Notice Wizard →
          </Link>
        </div>

        {/* Tool 3 */}
        <h2 id="ab2801" style={{ fontSize: 24, fontWeight: 700, color: N, marginTop: 40, marginBottom: 12 }}>3. AB 2801 Move-Out Inspections</h2>
        <p style={{ fontSize: 16, color: INK_MID, marginBottom: 16 }}>
          California AB 2801 (effective 2025) amended Civil Code 1950.5 to require landlords to provide photo documentation of unit condition at three points: move-in, after the tenant vacates, and after any repairs. Landlords who fail to comply risk forfeiting all deductions from the security deposit &mdash; plus 2x the deposit amount in bad faith penalties, plus attorney fees.
        </p>
        <p style={{ fontSize: 16, color: INK_MID, marginBottom: 16 }}>
          Keywise&apos;s inspection tool is designed around this requirement:
        </p>
        <ul style={{ paddingLeft: 24, fontSize: 16, color: INK_MID, marginBottom: 16, display: 'flex', flexDirection: 'column', gap: 8 }}>
          <li><strong>Room-by-room photo capture</strong> &mdash; wide shots for context, close-ups for detail. Mobile-optimized for on-site use.</li>
          <li><strong>AI comparison</strong> &mdash; Claude vision compares move-in and move-out photos side by side and flags damage vs. normal wear.</li>
          <li><strong>Deposit itemization</strong> &mdash; draft an itemized statement with editable line items, linked to the specific photos that document each deduction.</li>
          <li><strong>21-day deadline tracker</strong> &mdash; California requires the itemized statement within 21 days of move-out. Keywise tracks the deadline and sends email alerts at 14, 7, and 3 days.</li>
          <li><strong>Digital signatures</strong> &mdash; both landlord and tenant can sign the inspection report electronically.</li>
        </ul>

        <div style={{ textAlign: 'center', marginBottom: 32, marginTop: 24 }}>
          <Link href="/inspections" style={{ display: 'inline-block', background: TEAL, color: N, padding: '12px 24px', borderRadius: 10, fontWeight: 700, fontSize: 14, textDecoration: 'none' }}>
            Start an Inspection →
          </Link>
        </div>

        {/* Dashboard */}
        <h2 id="dashboard" style={{ fontSize: 24, fontWeight: 700, color: N, marginTop: 40, marginBottom: 12 }}>Compliance dashboard for logged-in users</h2>
        <p style={{ fontSize: 16, color: INK_MID, marginBottom: 16 }}>
          If you use Keywise to manage your portfolio, all three tools are integrated directly into your dashboard:
        </p>
        <ul style={{ paddingLeft: 24, fontSize: 16, color: INK_MID, marginBottom: 16, display: 'flex', flexDirection: 'column', gap: 8 }}>
          <li><strong>Compliance section in the sidebar</strong> &mdash; one-click access to all three tools from any page.</li>
          <li><strong>Compliance Overview widget on the dashboard</strong> &mdash; shows how many units are eligible for rent increases, any pending inspections, and deposit deadlines approaching.</li>
          <li><strong>Contextual buttons on every unit card</strong> &mdash; click &ldquo;Rent Cap&rdquo; on a unit in your portfolio and the calculator opens pre-filled with that unit&apos;s zip code, year built, and current rent.</li>
          <li><strong>Compliance Actions in the tenant view</strong> &mdash; when a lease end date is approaching, the inspection link changes to &ldquo;Start Move-Out Inspection&rdquo; with a countdown.</li>
        </ul>
        <p style={{ fontSize: 16, color: INK_MID, marginBottom: 16 }}>
          The public tools work without an account. But logging in connects them to your portfolio data so you don&apos;t have to re-enter property details every time.
        </p>

        <div style={{ background: N, borderRadius: 14, padding: '32px 28px', marginTop: 48, textAlign: 'center' }}>
          <div style={{ fontSize: 22, fontWeight: 700, color: '#fff', marginBottom: 8 }}>California compliance, simplified</div>
          <div style={{ fontSize: 14, color: 'rgba(255,255,255,0.7)', marginBottom: 20, maxWidth: 460, margin: '0 auto 20px' }}>
            Three free tools that help you stay compliant with AB 1482, AB 2801, and just-cause eviction rules. No legal degree required.
          </div>
          <Link href="/tools" style={{ display: 'inline-block', background: TEAL, color: N, padding: '12px 28px', borderRadius: 10, fontWeight: 700, fontSize: 15, textDecoration: 'none', letterSpacing: '-0.2px' }}>
            View All Free Tools →
          </Link>
        </div>

        <div style={{ marginTop: 48, paddingTop: 24, borderTop: `1px solid ${BORDER}` }}>
          <div style={{ fontSize: 12, fontWeight: 700, color: INK_MUTED, textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: 12 }}>Related articles</div>
          <ul style={{ listStyle: 'none', padding: 0, display: 'flex', flexDirection: 'column', gap: 8 }}>
            <li><Link href="/blog/california-ab-1482-explained-2026" style={{ fontSize: 14, color: TEAL_DARK, textDecoration: 'none', fontWeight: 500 }}>California AB 1482 in 2026: The Small Landlord&apos;s Guide →</Link></li>
            <li><Link href="/blog/security-deposit-deductions" style={{ fontSize: 14, color: TEAL_DARK, textDecoration: 'none', fontWeight: 500 }}>Security Deposit Deductions: What Landlords Can (and Can&apos;t) Charge For →</Link></li>
            <li><Link href="/blog/onboard-tenant-from-lease" style={{ fontSize: 14, color: TEAL_DARK, textDecoration: 'none', fontWeight: 500 }}>How to Onboard a Tenant in 60 Seconds With a Lease PDF →</Link></li>
          </ul>
        </div>
      </article>

      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify({
          '@context': 'https://schema.org',
          '@type': 'Article',
          headline: '3 Free Compliance Tools Every California Landlord Needs in 2026',
          description: 'AB 1482 rent cap calculator, just-cause eviction notice wizard, and AB 2801 move-out inspections — all free, all built for small landlords.',
          datePublished: '2026-06-21',
          url: 'https://keywise.app/blog/california-compliance-tools-landlords',
          author: { '@type': 'Organization', name: 'Keywise', url: 'https://keywise.app' },
          publisher: { '@type': 'Organization', name: 'Keywise', url: 'https://keywise.app' },
        }) }}
      />
    </div>
  );
}
