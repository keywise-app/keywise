import type { Metadata } from 'next';
import Link from 'next/link';

export const metadata: Metadata = {
  title: 'How to Write a Late Rent Notice (Free Template) | Keywise',
  description: 'Step-by-step guide to writing a professional late rent notice. Includes a free template and legal tips for landlords.',
  alternates: { canonical: 'https://keywise.app/blog/late-rent-notice' },
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
          How to Write a Late Rent Notice (Free Template)
        </h1>
        <p style={{ fontSize: 18, color: INK_MID, marginBottom: 32 }}>
          When a tenant misses rent, the way you respond sets the tone for everything that follows. A professional late rent notice protects your legal position, keeps the relationship workable, and — most importantly — usually gets you paid.
        </p>

        <h2 style={{ fontSize: 24, fontWeight: 700, color: N, marginTop: 40, marginBottom: 12 }}>What is a late rent notice?</h2>
        <p style={{ fontSize: 16, color: INK_MID, marginBottom: 16 }}>
          A late rent notice is a formal written communication informing a tenant that their rent is overdue. It's typically the first step before any legal action like serving a Pay or Quit notice. Sending one promptly creates a paper trail and gives the tenant a clear deadline to make things right.
        </p>
        <p style={{ fontSize: 16, color: INK_MID, marginBottom: 16 }}>
          Most leases include a grace period (typically 3-5 days) before rent is officially considered late. Once that grace period passes, you can issue a notice. Many states require this notice before you can proceed with eviction, so even informal landlords should treat it as a critical document.
        </p>

        <h2 style={{ fontSize: 24, fontWeight: 700, color: N, marginTop: 40, marginBottom: 12 }}>What to include in a late rent notice</h2>
        <ul style={{ fontSize: 16, color: INK_MID, paddingLeft: 24, marginBottom: 20 }}>
          <li style={{ marginBottom: 8 }}><strong>Date</strong> the notice is being sent</li>
          <li style={{ marginBottom: 8 }}><strong>Tenant's full name</strong> and property address</li>
          <li style={{ marginBottom: 8 }}><strong>Amount owed</strong> — include the rent and any late fees specified in the lease</li>
          <li style={{ marginBottom: 8 }}><strong>Original due date</strong> and how many days late the payment is</li>
          <li style={{ marginBottom: 8 }}><strong>Payment instructions</strong> — exactly how and where to pay</li>
          <li style={{ marginBottom: 8 }}><strong>Deadline</strong> for payment (typically 3-5 days from notice)</li>
          <li style={{ marginBottom: 8 }}><strong>Consequences</strong> if not paid by the deadline (additional fees, formal eviction notice)</li>
          <li style={{ marginBottom: 8 }}><strong>Your contact information</strong> for questions or payment arrangements</li>
        </ul>

        <h2 style={{ fontSize: 24, fontWeight: 700, color: N, marginTop: 40, marginBottom: 12 }}>Free late rent notice template</h2>
        <div style={{ background: BG, border: `1px solid ${BORDER}`, borderRadius: 10, padding: 24, fontSize: 14, color: INK, fontFamily: 'Georgia, serif', lineHeight: 1.8, marginBottom: 24 }}>
          <p style={{ margin: '0 0 12px' }}><strong>NOTICE OF LATE RENT</strong></p>
          <p style={{ margin: '0 0 12px' }}>Date: [Today's Date]</p>
          <p style={{ margin: '0 0 12px' }}>To: [Tenant Name]<br/>[Property Address]</p>
          <p style={{ margin: '0 0 12px' }}>Dear [Tenant Name],</p>
          <p style={{ margin: '0 0 12px' }}>This is a friendly reminder that your rent payment of <strong>$[Amount]</strong> for the property at [Address] was due on [Due Date]. As of today, [X] days have passed and we have not received payment.</p>
          <p style={{ margin: '0 0 12px' }}>Per your lease agreement, a late fee of $[Fee] has been added, bringing the total amount due to <strong>$[Total]</strong>.</p>
          <p style={{ margin: '0 0 12px' }}>Please remit payment by <strong>[Deadline Date]</strong> via [payment method]. If you are experiencing difficulty paying, please contact me as soon as possible so we can discuss options.</p>
          <p style={{ margin: '0 0 12px' }}>If payment is not received by the deadline, additional action may be required as outlined in your lease.</p>
          <p style={{ margin: '0 0 4px' }}>Sincerely,</p>
          <p style={{ margin: 0 }}>[Your Name]<br/>[Phone] · [Email]</p>
        </div>

        <h2 style={{ fontSize: 24, fontWeight: 700, color: N, marginTop: 40, marginBottom: 12 }}>Tone matters</h2>
        <p style={{ fontSize: 16, color: INK_MID, marginBottom: 16 }}>
          Even though you're collecting on a debt, the tone of your notice should be firm but respectful. Most late payments are caused by a job change, an unexpected expense, or simple forgetfulness — not malice. A professional notice that opens the door to communication often gets faster resolution than an aggressive one.
        </p>
        <p style={{ fontSize: 16, color: INK_MID, marginBottom: 16 }}>
          Save the harsher legal language for the formal "Pay or Quit" notice if it comes to that. The first late notice should make it easy for a tenant to do the right thing.
        </p>

        <h2 style={{ fontSize: 24, fontWeight: 700, color: N, marginTop: 40, marginBottom: 12 }}>How Keywise automates this</h2>
        <p style={{ fontSize: 16, color: INK_MID, marginBottom: 16 }}>
          Writing late rent notices manually for every overdue payment gets old fast. Keywise watches your payment schedule and drafts a professional late notice the moment rent goes overdue — pre-filled with the tenant's name, property, exact amount owed, and your late fee terms pulled directly from the lease.
        </p>
        <p style={{ fontSize: 16, color: INK_MID, marginBottom: 16 }}>
          You can edit the draft, then send it via email or SMS in one click. Every notice is timestamped and saved in the tenant's file, building the paper trail you'd need if it ever came to court.
        </p>

        <div style={{ marginTop: 60, padding: 32, background: N, borderRadius: 12, textAlign: 'center' }}>
          <h3 style={{ fontSize: 22, fontWeight: 700, color: '#fff', marginBottom: 8 }}>Stop writing late notices from scratch</h3>
          <p style={{ fontSize: 14, color: 'rgba(255,255,255,0.8)', marginBottom: 20 }}>
            Keywise drafts professional notices automatically. Free for up to 2 units.
          </p>
          <Link href="/" style={{ display: 'inline-block', background: TEAL, color: N, padding: '14px 32px', borderRadius: 10, fontSize: 15, fontWeight: 700, textDecoration: 'none' }}>
            Try Keywise free →
          </Link>
        </div>
      </article>
    </div>
  );
}
