import type { Metadata } from 'next';
import Link from 'next/link';

export const metadata: Metadata = {
  title: 'Free Lease Agreement Template for Small Landlords (2026) | Keywise',
  description: 'Download a free, lawyer-reviewed residential lease template. Covers rent, deposits, maintenance, and early termination clauses.',
  alternates: { canonical: 'https://keywise.app/blog/free-lease-agreement-template' },
  openGraph: {
    title: 'Free Lease Agreement Template for Small Landlords (2026) | Keywise',
    description: 'Download a free, lawyer-reviewed residential lease template. Covers rent, deposits, maintenance, and early termination clauses.',
    url: 'https://keywise.app/blog/free-lease-agreement-template',
    siteName: 'Keywise',
    type: 'article',
    images: [{ url: '/og-image.png', width: 1200, height: 628 }],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Free Lease Agreement Template for Small Landlords (2026) | Keywise',
    description: 'Download a free, lawyer-reviewed residential lease template. Covers rent, deposits, maintenance, and early termination clauses.',
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
        <div style={{ fontSize: 12, color: INK_MUTED, textTransform: 'uppercase', letterSpacing: '1px', marginBottom: 12 }}>Templates · April 2026</div>
        <h1 style={{ fontSize: 38, fontWeight: 800, color: N, letterSpacing: '-1px', marginBottom: 20, lineHeight: 1.2 }}>
          Free Lease Agreement Template for Small Landlords (2026)
        </h1>
        <p style={{ fontSize: 18, color: INK_MID, marginBottom: 32 }}>
          A solid lease agreement is the foundation of every successful landlord-tenant relationship. It spells out the rules, protects both parties, and gives you legal standing if things go sideways. Here is everything you need to include — plus a free template you can customize for your rental.
        </p>

        <h2 style={{ fontSize: 24, fontWeight: 700, color: N, marginTop: 40, marginBottom: 12 }}>Why you need a written lease agreement</h2>
        <p style={{ fontSize: 16, color: INK_MID, marginBottom: 16 }}>
          Handshake deals and verbal agreements feel friendly, but they are a lawsuit waiting to happen. Without a written lease, you have no enforceable record of what the tenant agreed to — the rent amount, the security deposit terms, the pet policy, or even the move-in date.
        </p>
        <p style={{ fontSize: 16, color: INK_MID, marginBottom: 16 }}>
          Every state in the U.S. allows verbal leases for terms under one year, but &quot;allows&quot; does not mean &quot;advisable.&quot; A written lease protects you in eviction proceedings, security deposit disputes, and insurance claims. It also sets professional expectations from day one — tenants who sign a thorough lease take the arrangement more seriously than those who get a text message saying &quot;rent is $1,200, move in whenever.&quot;
        </p>

        <h2 style={{ fontSize: 24, fontWeight: 700, color: N, marginTop: 40, marginBottom: 12 }}>Essential clauses every lease must include</h2>

        <h3 style={{ fontSize: 18, fontWeight: 700, color: N, marginTop: 24, marginBottom: 8 }}>1. Parties and property</h3>
        <p style={{ fontSize: 16, color: INK_MID, marginBottom: 16 }}>
          List the full legal names of every adult tenant (not just &quot;John&quot;) and the complete property address including unit number. Specify that only named tenants and approved occupants may reside in the unit. This prevents unauthorized subletting and gives you grounds for lease violation if strangers move in.
        </p>

        <h3 style={{ fontSize: 18, fontWeight: 700, color: N, marginTop: 24, marginBottom: 8 }}>2. Lease term and renewal</h3>
        <p style={{ fontSize: 16, color: INK_MID, marginBottom: 16 }}>
          State the exact start and end dates. Specify whether the lease converts to month-to-month after the initial term or requires a new agreement. Include how much notice either party must give to terminate — 30 days is standard for month-to-month, but some states require 60 days. Check your local laws.
        </p>

        <h3 style={{ fontSize: 18, fontWeight: 700, color: N, marginTop: 24, marginBottom: 8 }}>3. Rent amount and payment terms</h3>
        <p style={{ fontSize: 16, color: INK_MID, marginBottom: 16 }}>
          The monthly rent, due date (usually the 1st), accepted payment methods, and where to send payment. Include your grace period (typically 3-5 days) and the late fee amount. Many states cap late fees at a percentage of rent — California limits it to a &quot;reasonable&quot; amount, while New York caps it at $50 or 5% of monthly rent.
        </p>

        <h3 style={{ fontSize: 18, fontWeight: 700, color: N, marginTop: 24, marginBottom: 8 }}>4. Security deposit</h3>
        <p style={{ fontSize: 16, color: INK_MID, marginBottom: 16 }}>
          The deposit amount, where it will be held, conditions for deductions, and the timeline for return after move-out. Security deposit laws vary wildly by state — some require interest-bearing accounts, some cap the deposit at one month&apos;s rent, and return deadlines range from 14 to 60 days. Get this wrong and you may owe the tenant double or triple the deposit, regardless of actual damages.
        </p>

        <h3 style={{ fontSize: 18, fontWeight: 700, color: N, marginTop: 24, marginBottom: 8 }}>5. Maintenance responsibilities</h3>
        <p style={{ fontSize: 16, color: INK_MID, marginBottom: 16 }}>
          Define who handles what. Landlords are generally responsible for structural repairs, plumbing, heating, and habitability issues. Tenants typically handle minor maintenance like changing light bulbs, replacing HVAC filters, and keeping the unit clean. Spell out the process for reporting maintenance — &quot;submit a maintenance request through Keywise or email landlord@email.com&quot; — and your expected response time.
        </p>

        <h3 style={{ fontSize: 18, fontWeight: 700, color: N, marginTop: 24, marginBottom: 8 }}>6. Rules and restrictions</h3>
        <p style={{ fontSize: 16, color: INK_MID, marginBottom: 16 }}>
          Pet policy (breed restrictions, pet deposit, monthly pet rent), smoking policy, noise hours, parking rules, and any HOA restrictions that apply. Be specific. &quot;No pets&quot; is enforceable. &quot;Be respectful of neighbors&quot; is not.
        </p>

        <h3 style={{ fontSize: 18, fontWeight: 700, color: N, marginTop: 24, marginBottom: 8 }}>7. Early termination</h3>
        <p style={{ fontSize: 16, color: INK_MID, marginBottom: 16 }}>
          What happens if the tenant needs to break the lease early? Common options include a penalty fee (usually one or two months&apos; rent), a requirement to find a replacement tenant, or forfeiture of the security deposit. Without this clause, you may be stuck with an empty unit and no recourse.
        </p>

        <h2 style={{ fontSize: 24, fontWeight: 700, color: N, marginTop: 40, marginBottom: 12 }}>Free lease agreement template</h2>
        <div style={{ background: BG, border: `1px solid ${BORDER}`, borderRadius: 10, padding: 24, fontSize: 14, color: INK, fontFamily: 'Georgia, serif', lineHeight: 1.8, marginBottom: 24 }}>
          <p style={{ margin: '0 0 12px' }}><strong>RESIDENTIAL LEASE AGREEMENT</strong></p>
          <p style={{ margin: '0 0 12px' }}>This Lease Agreement (&quot;Lease&quot;) is entered into on [Date] by and between:</p>
          <p style={{ margin: '0 0 12px' }}><strong>Landlord:</strong> [Full Legal Name], [Address], [Phone], [Email]</p>
          <p style={{ margin: '0 0 12px' }}><strong>Tenant(s):</strong> [Full Legal Name(s)]</p>
          <p style={{ margin: '0 0 12px' }}><strong>Property:</strong> [Full Address Including Unit Number]</p>
          <p style={{ margin: '0 0 16px' }}><strong>Lease Term:</strong> [Start Date] through [End Date], converting to month-to-month thereafter unless either party provides [30/60] days&apos; written notice.</p>
          <p style={{ margin: '0 0 8px' }}><strong>Monthly Rent:</strong> $[Amount], due on the [1st] of each month.</p>
          <p style={{ margin: '0 0 8px' }}><strong>Late Fee:</strong> $[Amount] if rent is not received within [X] days of the due date.</p>
          <p style={{ margin: '0 0 8px' }}><strong>Security Deposit:</strong> $[Amount], refundable within [X] days of move-out, less any lawful deductions.</p>
          <p style={{ margin: '0 0 8px' }}><strong>Utilities Included:</strong> [List or &quot;None — tenant is responsible for all utilities&quot;]</p>
          <p style={{ margin: '0 0 8px' }}><strong>Pets:</strong> [Allowed with $X deposit / Not permitted]</p>
          <p style={{ margin: '0 0 8px' }}><strong>Smoking:</strong> [Prohibited / Permitted in designated areas only]</p>
          <p style={{ margin: '0 0 16px' }}><strong>Early Termination:</strong> Tenant may terminate this lease early by providing [60] days&apos; notice and paying a fee of $[Amount].</p>
          <p style={{ margin: '0 0 16px' }}>Both parties agree to the terms outlined in this Lease and any attached addenda.</p>
          <p style={{ margin: '0 0 8px' }}>Landlord Signature: _________________________ Date: _________</p>
          <p style={{ margin: 0 }}>Tenant Signature: _________________________ Date: _________</p>
        </div>

        <h2 style={{ fontSize: 24, fontWeight: 700, color: N, marginTop: 40, marginBottom: 12 }}>Common mistakes to avoid</h2>
        <p style={{ fontSize: 16, color: INK_MID, marginBottom: 16 }}>
          <strong>Using a generic template without customization.</strong> Every state has different landlord-tenant laws. A lease that works in Texas may violate California law. Always check your state&apos;s requirements for security deposit limits, notice periods, and required disclosures (lead paint, mold, bed bugs, etc.).
        </p>
        <p style={{ fontSize: 16, color: INK_MID, marginBottom: 16 }}>
          <strong>Forgetting required disclosures.</strong> Federal law requires a lead-based paint disclosure for homes built before 1978. Many states require additional disclosures — flood zone status, registered sex offenders nearby, past meth contamination, or history of mold. Missing a required disclosure can void parts of your lease.
        </p>
        <p style={{ fontSize: 16, color: INK_MID, marginBottom: 16 }}>
          <strong>Not keeping a signed copy.</strong> Both you and the tenant should have signed copies. Store yours digitally so it does not get lost in a drawer. If you ever end up in court, the judge will ask for the lease — and &quot;I think I left it at the property&quot; is not an answer.
        </p>

        <h2 style={{ fontSize: 24, fontWeight: 700, color: N, marginTop: 40, marginBottom: 12 }}>How Keywise simplifies lease management</h2>
        <p style={{ fontSize: 16, color: INK_MID, marginBottom: 16 }}>
          Instead of filling out a Word document and chasing down signatures, Keywise lets you upload any lease PDF and automatically extracts the key terms — rent amount, dates, deposit, tenant info — using AI. The extracted data populates your dashboard so you can track lease expirations, rent schedules, and renewals without manually entering anything.
        </p>
        <p style={{ fontSize: 16, color: INK_MID, marginBottom: 16 }}>
          Need digital signatures? Keywise has built-in document signing. Upload the lease, send a signing link to your tenant, and both parties get a signed PDF stored permanently in the tenant&apos;s file. No printing, no scanning, no chasing.
        </p>

        <h2 style={{ fontSize: 24, fontWeight: 700, color: N, marginTop: 40, marginBottom: 12 }}>Related articles</h2>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 20 }}>
          <Link href="/blog/security-deposit-laws" style={{ fontSize: 15, color: '#00A886', fontWeight: 600, textDecoration: 'none' }}>→ Security Deposit Laws: What Every Landlord Needs to Know</Link>
          <Link href="/blog/late-rent-notice" style={{ fontSize: 15, color: '#00A886', fontWeight: 600, textDecoration: 'none' }}>→ How to Write a Late Rent Notice (Free Template)</Link>
          <Link href="/blog/move-in-inspection-checklist" style={{ fontSize: 15, color: '#00A886', fontWeight: 600, textDecoration: 'none' }}>→ Move-In Inspection Checklist for Landlords</Link>
        </div>

        <div style={{ marginTop: 60, padding: 32, background: N, borderRadius: 12, textAlign: 'center' }}>
          <h3 style={{ fontSize: 22, fontWeight: 700, color: '#fff', marginBottom: 8 }}>Stop managing leases in a filing cabinet</h3>
          <p style={{ fontSize: 14, color: 'rgba(255,255,255,0.8)', marginBottom: 20 }}>
            Keywise extracts lease terms with AI, tracks expirations, and handles digital signatures. Free for up to 2 units.
          </p>
          <Link href="/" style={{ display: 'inline-block', background: TEAL, color: N, padding: '14px 32px', borderRadius: 10, fontSize: 15, fontWeight: 700, textDecoration: 'none' }}>
            Try Keywise free →
          </Link>
        </div>
      </article>
    </div>
  );
}
