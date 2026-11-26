import type { Metadata } from 'next';
import Link from 'next/link';
import ReminderTemplate from './ReminderTemplate';

export const metadata: Metadata = {
  title: 'Late Rent Notice Template: Copyable Rent Reminder | Keywise',
  description: 'Copy a free late rent reminder for your tenant. Check the rent details, personalize the message, and learn when a formal notice needs a local form.',
  alternates: { canonical: 'https://keywise.app/blog/late-rent-notice' },
  openGraph: {
    title: 'Late Rent Notice Template: Copyable Rent Reminder | Keywise',
    description: 'Copy and personalize a free late rent reminder for your tenant.',
    url: 'https://keywise.app/blog/late-rent-notice',
    siteName: 'Keywise',
    type: 'article',
    images: [{ url: '/og-image.png', width: 1200, height: 628 }],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Late Rent Notice Template: Copyable Rent Reminder | Keywise',
    description: 'Copy and personalize a free late rent reminder for your tenant.',
  },
  robots: { index: true, follow: true },
};

const N = '#0F3460';
const TEAL = '#00D4AA';
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
        <div style={{ fontSize: 14, color: INK_MUTED, textTransform: 'uppercase', letterSpacing: '1px', marginBottom: 12 }}>Free template · Small landlords</div>
        <h1 style={{ fontSize: 38, fontWeight: 800, color: N, letterSpacing: '-1px', marginBottom: 20, lineHeight: 1.2 }}>
          Late Rent Notice Template: Copyable Rent Reminder
        </h1>
        <p style={{ fontSize: 18, color: INK_MID, marginBottom: 32 }}>
          Start with a clear, respectful payment reminder. Copy the example below, replace the brackets, and check your rent records before sending it.
        </p>

        <h2 style={{ fontSize: 24, fontWeight: 700, color: N, marginTop: 40, marginBottom: 12 }}>Free late rent reminder template</h2>
        <ReminderTemplate />
        <p style={{ fontSize: 16, color: INK_MID, marginBottom: 16 }}>
          This example is a payment reminder, not a statutory notice to pay or quit. Formal notices can have specific wording, deadlines, and delivery rules. The <a href="https://selfhelp.courts.ca.gov/eviction-landlord/notice-types" style={{ color: '#007D68', fontWeight: 600 }}>California Courts notice guide</a> and <a href="https://www.nycourts.gov/new-york-city-housing-court/starting-nonpayment-case" style={{ color: '#007D68', fontWeight: 600 }}>New York Courts rent-demand guide</a> show how requirements differ. Check the current rules where the rental is located before using a formal notice.
        </p>

        <div style={{ margin: '28px 0', padding: 24, border: `1px solid ${BORDER}`, borderRadius: 12 }}>
          <h2 style={{ fontSize: 22, fontWeight: 700, color: N, margin: '0 0 8px' }}>Keep the next rent cycle organized</h2>
          <p style={{ fontSize: 16, color: INK_MID, margin: '0 0 14px' }}>Keywise keeps the lease, rent records, tenant details, and messages together. You can set up one rental on the free plan.</p>
          <Link href="/start/landlords" style={{ color: '#007D68', fontSize: 16, fontWeight: 700 }}>Set up your first rental</Link>
        </div>

        <h2 style={{ fontSize: 24, fontWeight: 700, color: N, marginTop: 40, marginBottom: 12 }}>Before you send the reminder</h2>
        <p style={{ fontSize: 16, color: INK_MID, marginBottom: 16 }}>
          Confirm that the payment is still outstanding and review the lease before stating an amount, fee, or deadline. Save a copy of what you send and any reply with the tenant's records.
        </p>

        <h2 style={{ fontSize: 24, fontWeight: 700, color: N, marginTop: 40, marginBottom: 12 }}>What to include in a rent reminder</h2>
        <ul style={{ fontSize: 16, color: INK_MID, paddingLeft: 24, marginBottom: 20 }}>
          <li style={{ marginBottom: 8 }}><strong>Date</strong> the reminder is being sent</li>
          <li style={{ marginBottom: 8 }}><strong>Tenant's full name</strong> and property address</li>
          <li style={{ marginBottom: 8 }}><strong>Rent amount</strong> that your records show is unpaid</li>
          <li style={{ marginBottom: 8 }}><strong>Original due date</strong> from the lease or payment schedule</li>
          <li style={{ marginBottom: 8 }}><strong>Payment instructions</strong> — exactly how and where to pay</li>
          <li style={{ marginBottom: 8 }}><strong>Your contact information</strong> for questions or payment arrangements</li>
        </ul>

        <h2 style={{ fontSize: 24, fontWeight: 700, color: N, marginTop: 40, marginBottom: 12 }}>A clear tone helps</h2>
        <p style={{ fontSize: 16, color: INK_MID, marginBottom: 16 }}>
          State what your records show and give the tenant a way to respond if the payment has already been made or the balance is disputed. A reminder should be easy to understand without assuming why the payment is late.
        </p>
        <p style={{ fontSize: 16, color: INK_MID, marginBottom: 16 }}>
          If you need to take a formal step, use the correct local form and service process. Do not turn this general reminder into an eviction demand by adding an assumed deadline or threat.
        </p>

        <h2 style={{ fontSize: 24, fontWeight: 700, color: N, marginTop: 40, marginBottom: 12 }}>Keep the record in Keywise</h2>
        <p style={{ fontSize: 16, color: INK_MID, marginBottom: 16 }}>
          Keywise keeps the lease, payment history, and tenant conversations together, so you can check the facts before sending a message. Its writing tool can help draft an editable rent reminder from the details you provide. Review every draft for accuracy and local requirements before sending.
        </p>
        <p style={{ fontSize: 16, color: INK_MID, marginBottom: 16 }}>
          The same tenant file can hold your <Link href="/blog/landlord-move-in-checklist" style={{ color: '#007D68', fontWeight: 600 }}>move-in checklist</Link> and other documents, making the next conversation easier to prepare.
        </p>

        <h2 style={{ fontSize: 24, fontWeight: 700, color: N, marginTop: 40, marginBottom: 12 }}>Related articles</h2>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 20 }}>
          <Link href="/blog/collect-rent-online" style={{ fontSize: 15, color: '#00A886', fontWeight: 600, textDecoration: 'none' }}>→ How to Collect Rent Online: Best Options for Small Landlords</Link>
          <Link href="/blog/free-lease-agreement-template" style={{ fontSize: 15, color: '#00A886', fontWeight: 600, textDecoration: 'none' }}>→ Free Lease Agreement Template for Small Landlords (2026)</Link>
          <Link href="/blog/security-deposit-laws" style={{ fontSize: 15, color: '#00A886', fontWeight: 600, textDecoration: 'none' }}>→ Security Deposit Laws: What Every Landlord Needs to Know</Link>
        </div>

        <div style={{ marginTop: 60, padding: 32, background: N, borderRadius: 12, textAlign: 'center' }}>
          <h3 style={{ fontSize: 22, fontWeight: 700, color: '#fff', marginBottom: 8 }}>Keep rent details and tenant messages together</h3>
          <p style={{ fontSize: 16, color: '#fff', marginBottom: 20 }}>
            Set up one rental on Keywise's free plan and start with a clearer record for your next rent cycle.
          </p>
          <Link href="/start/landlords" style={{ display: 'inline-block', background: TEAL, color: N, padding: '14px 24px', borderRadius: 10, fontSize: 16, fontWeight: 700, textDecoration: 'none' }}>
            Set up your first rental
          </Link>
        </div>
      </article>
    </div>
  );
}
