import type { Metadata } from 'next';
import Link from 'next/link';

export const metadata: Metadata = {
  title: 'Security Deposit Laws: What Every Landlord Needs to Know | Keywise',
  description: 'State-by-state guide to security deposit limits, return deadlines, and deduction rules that keep you out of court.',
  alternates: { canonical: 'https://keywise.app/blog/security-deposit-laws' },
  openGraph: {
    title: 'Security Deposit Laws: What Every Landlord Needs to Know | Keywise',
    description: 'State-by-state guide to security deposit limits, return deadlines, and deduction rules that keep you out of court.',
    url: 'https://keywise.app/blog/security-deposit-laws',
    siteName: 'Keywise',
    type: 'article',
    images: [{ url: '/og-image.png', width: 1200, height: 628 }],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Security Deposit Laws: What Every Landlord Needs to Know | Keywise',
    description: 'State-by-state guide to security deposit limits, return deadlines, and deduction rules that keep you out of court.',
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
        <div style={{ fontSize: 12, color: INK_MUTED, textTransform: 'uppercase', letterSpacing: '1px', marginBottom: 12 }}>Legal · April 2026</div>
        <h1 style={{ fontSize: 38, fontWeight: 800, color: N, letterSpacing: '-1px', marginBottom: 20, lineHeight: 1.2 }}>
          Security Deposit Laws: What Every Landlord Needs to Know
        </h1>
        <p style={{ fontSize: 18, color: INK_MID, marginBottom: 32 }}>
          Security deposits are one of the most litigated topics in landlord-tenant law. Get the rules wrong — even innocently — and you could owe your tenant double or triple the deposit in penalties, plus their attorney fees. Here is a practical guide to staying compliant.
        </p>

        <h2 style={{ fontSize: 24, fontWeight: 700, color: N, marginTop: 40, marginBottom: 12 }}>How much can you charge?</h2>
        <p style={{ fontSize: 16, color: INK_MID, marginBottom: 16 }}>
          Every state sets its own rules on maximum security deposit amounts. Some states have no cap at all, while others limit deposits strictly. Here are some of the most common limits as of 2026:
        </p>
        <div style={{ background: BG, border: `1px solid ${BORDER}`, borderRadius: 10, padding: 20, marginBottom: 24 }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, fontSize: 14, color: INK_MID }}>
            <div><strong>California:</strong> 1 month&apos;s rent (as of July 2024)</div>
            <div><strong>New York:</strong> 1 month&apos;s rent</div>
            <div><strong>Texas:</strong> No statutory limit</div>
            <div><strong>Florida:</strong> No statutory limit</div>
            <div><strong>Illinois:</strong> No statutory limit</div>
            <div><strong>Pennsylvania:</strong> 2 months (1st year), then 1 month</div>
            <div><strong>Massachusetts:</strong> 1 month&apos;s rent</div>
            <div><strong>Washington:</strong> No statutory limit</div>
            <div><strong>Colorado:</strong> No statutory limit</div>
            <div><strong>New Jersey:</strong> 1.5 months&apos; rent</div>
          </div>
        </div>
        <p style={{ fontSize: 16, color: INK_MID, marginBottom: 16 }}>
          Even in states with no cap, charging an unreasonable deposit (like six months&apos; rent) can scare off good tenants and may be challenged in court as unconscionable. One to two months&apos; rent is the industry standard regardless of state law.
        </p>

        <h2 style={{ fontSize: 24, fontWeight: 700, color: N, marginTop: 40, marginBottom: 12 }}>Where must you hold the deposit?</h2>
        <p style={{ fontSize: 16, color: INK_MID, marginBottom: 16 }}>
          Many states require landlords to hold security deposits in a separate bank account — not mixed with personal funds. Some go further:
        </p>
        <ul style={{ fontSize: 16, color: INK_MID, paddingLeft: 24, marginBottom: 20 }}>
          <li style={{ marginBottom: 8 }}><strong>Separate account required:</strong> Connecticut, Maryland, Massachusetts, New Jersey, New York, Pennsylvania, and others.</li>
          <li style={{ marginBottom: 8 }}><strong>Interest-bearing account required:</strong> Connecticut, Maryland, Massachusetts, Minnesota, New Jersey, New Mexico, New York, North Dakota, and Virginia (for 13+ units).</li>
          <li style={{ marginBottom: 8 }}><strong>Written notice required:</strong> Many states require you to tell the tenant which bank holds the deposit and the account number within a set number of days.</li>
        </ul>
        <p style={{ fontSize: 16, color: INK_MID, marginBottom: 16 }}>
          Failing to hold the deposit properly can result in penalties even if you return the full amount on time. The procedural requirements matter as much as the money.
        </p>

        <h2 style={{ fontSize: 24, fontWeight: 700, color: N, marginTop: 40, marginBottom: 12 }}>What can you deduct for?</h2>
        <p style={{ fontSize: 16, color: INK_MID, marginBottom: 16 }}>
          Generally, landlords can deduct from a security deposit for:
        </p>
        <ul style={{ fontSize: 16, color: INK_MID, paddingLeft: 24, marginBottom: 20 }}>
          <li style={{ marginBottom: 8 }}><strong>Unpaid rent</strong> — including the final month if the tenant skipped it.</li>
          <li style={{ marginBottom: 8 }}><strong>Damage beyond normal wear and tear</strong> — a hole punched in a wall is deductible; faded paint from sunlight is not.</li>
          <li style={{ marginBottom: 8 }}><strong>Cleaning costs</strong> — but only to return the unit to the condition it was in at move-in. You cannot charge for routine turnover cleaning.</li>
          <li style={{ marginBottom: 8 }}><strong>Unpaid utilities</strong> — if the lease makes the tenant responsible and they left a balance.</li>
        </ul>
        <p style={{ fontSize: 16, color: INK_MID, marginBottom: 16 }}>
          The biggest mistake landlords make is deducting for &quot;normal wear and tear.&quot; Scuffed walls, worn carpet, and minor nail holes from hanging pictures are generally considered normal. If you deduct for these, a judge will likely side with the tenant — and may award penalties on top.
        </p>

        <h2 style={{ fontSize: 24, fontWeight: 700, color: N, marginTop: 40, marginBottom: 12 }}>Return deadlines by state</h2>
        <p style={{ fontSize: 16, color: INK_MID, marginBottom: 16 }}>
          After the tenant moves out, you have a limited window to return the deposit with an itemized statement of deductions. Miss the deadline and you may forfeit the right to deduct anything — or owe penalties.
        </p>
        <div style={{ background: BG, border: `1px solid ${BORDER}`, borderRadius: 10, padding: 20, marginBottom: 24 }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, fontSize: 14, color: INK_MID }}>
            <div><strong>California:</strong> 21 days</div>
            <div><strong>New York:</strong> 14 days</div>
            <div><strong>Texas:</strong> 30 days</div>
            <div><strong>Florida:</strong> 15-30 days</div>
            <div><strong>Illinois:</strong> 30-45 days</div>
            <div><strong>Massachusetts:</strong> 30 days</div>
            <div><strong>Colorado:</strong> 30 days (or 60 if lease says)</div>
            <div><strong>Washington:</strong> 21 days</div>
            <div><strong>Georgia:</strong> 30 days</div>
            <div><strong>Ohio:</strong> 30 days</div>
          </div>
        </div>

        <h2 style={{ fontSize: 24, fontWeight: 700, color: N, marginTop: 40, marginBottom: 12 }}>The itemized deduction statement</h2>
        <p style={{ fontSize: 16, color: INK_MID, marginBottom: 16 }}>
          Nearly every state requires you to send an itemized statement alongside the remaining deposit. This should include:
        </p>
        <ul style={{ fontSize: 16, color: INK_MID, paddingLeft: 24, marginBottom: 20 }}>
          <li style={{ marginBottom: 8 }}>The original deposit amount</li>
          <li style={{ marginBottom: 8 }}>Each deduction with a description and dollar amount</li>
          <li style={{ marginBottom: 8 }}>Receipts or invoices for repairs (required in some states)</li>
          <li style={{ marginBottom: 8 }}>The remaining balance being returned</li>
        </ul>
        <p style={{ fontSize: 16, color: INK_MID, marginBottom: 16 }}>
          Vague deductions like &quot;cleaning — $300&quot; without further explanation are begging for a dispute. Be specific: &quot;Professional carpet cleaning to remove pet stains in bedroom — $175 (receipt attached).&quot;
        </p>

        <h2 style={{ fontSize: 24, fontWeight: 700, color: N, marginTop: 40, marginBottom: 12 }}>How to protect yourself: the move-in inspection</h2>
        <p style={{ fontSize: 16, color: INK_MID, marginBottom: 16 }}>
          The single best protection against security deposit disputes is a thorough <Link href="/blog/move-in-inspection-checklist" style={{ color: '#00A886', fontWeight: 600, textDecoration: 'none' }}>move-in inspection</Link> with timestamped photos. When a tenant challenges your deductions, you can show side-by-side photos of the property on move-in day versus move-out day. Without that baseline documentation, the tenant&apos;s word against yours is a coin flip in small claims court.
        </p>

        <h2 style={{ fontSize: 24, fontWeight: 700, color: N, marginTop: 40, marginBottom: 12 }}>How Keywise helps with security deposits</h2>
        <p style={{ fontSize: 16, color: INK_MID, marginBottom: 16 }}>
          Keywise tracks security deposit amounts as part of each lease record, so you always know exactly how much you are holding for each tenant. The built-in inspection tool creates timestamped, photo-documented reports at move-in and move-out, giving you the evidence you need if a deduction is ever challenged.
        </p>
        <p style={{ fontSize: 16, color: INK_MID, marginBottom: 16 }}>
          When a lease ends, Keywise surfaces the deposit return deadline based on your property&apos;s state so you never miss it. All inspection reports, lease terms, and communication history are stored in one place — no more digging through email threads and filing cabinets when a dispute arises.
        </p>

        <h2 style={{ fontSize: 24, fontWeight: 700, color: N, marginTop: 40, marginBottom: 12 }}>Related articles</h2>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 20 }}>
          <Link href="/blog/move-in-inspection-checklist" style={{ fontSize: 15, color: '#00A886', fontWeight: 600, textDecoration: 'none' }}>→ Move-In Inspection Checklist for Landlords (Free)</Link>
          <Link href="/blog/free-lease-agreement-template" style={{ fontSize: 15, color: '#00A886', fontWeight: 600, textDecoration: 'none' }}>→ Free Lease Agreement Template for Small Landlords (2026)</Link>
          <Link href="/blog/late-rent-notice" style={{ fontSize: 15, color: '#00A886', fontWeight: 600, textDecoration: 'none' }}>→ How to Write a Late Rent Notice (Free Template)</Link>
        </div>

        <div style={{ marginTop: 60, padding: 32, background: N, borderRadius: 12, textAlign: 'center' }}>
          <h3 style={{ fontSize: 22, fontWeight: 700, color: '#fff', marginBottom: 8 }}>Track deposits, inspections, and deadlines in one place</h3>
          <p style={{ fontSize: 14, color: 'rgba(255,255,255,0.8)', marginBottom: 20 }}>
            Keywise manages your security deposits and generates inspection reports with photos and digital signatures. Free for up to 2 units.
          </p>
          <Link href="/" style={{ display: 'inline-block', background: TEAL, color: N, padding: '14px 32px', borderRadius: 10, fontSize: 15, fontWeight: 700, textDecoration: 'none' }}>
            Try Keywise free →
          </Link>
        </div>
      </article>
    </div>
  );
}
