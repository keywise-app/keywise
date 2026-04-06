import type { Metadata } from 'next';
import Link from 'next/link';

export const metadata: Metadata = {
  title: 'How to Collect Rent Online: Best Options for Small Landlords | Keywise',
  description: 'Compare the best ways to collect rent online: Venmo, Zelle, PayPal, and dedicated landlord tools. Find what works for your portfolio.',
  alternates: { canonical: 'https://keywise.app/blog/collect-rent-online' },
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
        <div style={{ fontSize: 12, color: INK_MUTED, textTransform: 'uppercase', letterSpacing: '1px', marginBottom: 12 }}>Rent Collection · April 2026</div>
        <h1 style={{ fontSize: 38, fontWeight: 800, color: N, letterSpacing: '-1px', marginBottom: 20, lineHeight: 1.2 }}>
          How to Collect Rent Online: Best Options for Small Landlords
        </h1>
        <p style={{ fontSize: 18, color: INK_MID, marginBottom: 32 }}>
          Cash and checks are dying. Tenants expect to pay rent the same way they pay everything else — from their phone, in seconds. Here's a no-BS comparison of the main options for collecting rent online, with the pros and cons that actually matter for small landlords.
        </p>

        <h2 style={{ fontSize: 24, fontWeight: 700, color: N, marginTop: 40, marginBottom: 12 }}>Why move rent collection online?</h2>
        <p style={{ fontSize: 16, color: INK_MID, marginBottom: 16 }}>
          Online rent payments solve three big problems: chasing late payments, deciphering memo lines on checks, and the awkward "did you put it in the mail yet?" conversation. Tenants pay faster, you have a clean transaction record, and there's no paper to file.
        </p>
        <p style={{ fontSize: 16, color: INK_MID, marginBottom: 16 }}>
          The catch is that not every payment app is built for rent collection. Some have transaction limits, some don't give you the records you need at tax time, and some make refunds disturbingly easy for tenants who change their mind.
        </p>

        <h2 style={{ fontSize: 24, fontWeight: 700, color: N, marginTop: 40, marginBottom: 12 }}>Option 1: Venmo</h2>
        <p style={{ fontSize: 16, color: INK_MID, marginBottom: 16 }}>
          <strong>Best for:</strong> Casual landlords with one or two long-term tenants who already use Venmo.
        </p>
        <p style={{ fontSize: 16, color: INK_MID, marginBottom: 16 }}>
          <strong>Pros:</strong> Free for personal accounts, instant familiarity, easy for tenants. <strong>Cons:</strong> Personal accounts technically violate Venmo's terms when used for business. Switching to a Business account adds a 1.9% + $0.10 fee. There's also a weekly transfer limit ($60,000 for verified accounts) and no automated rent reminders or receipts. Tax records are basic — you'll be reconstructing them in April.
        </p>

        <h2 style={{ fontSize: 24, fontWeight: 700, color: N, marginTop: 40, marginBottom: 12 }}>Option 2: Zelle</h2>
        <p style={{ fontSize: 16, color: INK_MID, marginBottom: 16 }}>
          <strong>Best for:</strong> Landlords whose bank is in the Zelle network and who want zero fees.
        </p>
        <p style={{ fontSize: 16, color: INK_MID, marginBottom: 16 }}>
          <strong>Pros:</strong> Free, instant, money goes straight into your bank account. No third-party balance to transfer. <strong>Cons:</strong> No reversibility means a typo can send rent to a stranger forever. Daily and monthly limits vary by bank. Same record-keeping headaches as Venmo. Some banks have low limits that won't cover a full month's rent for multi-unit landlords.
        </p>

        <h2 style={{ fontSize: 24, fontWeight: 700, color: N, marginTop: 40, marginBottom: 12 }}>Option 3: PayPal</h2>
        <p style={{ fontSize: 16, color: INK_MID, marginBottom: 16 }}>
          <strong>Best for:</strong> Almost no one for rent collection.
        </p>
        <p style={{ fontSize: 16, color: INK_MID, marginBottom: 16 }}>
          <strong>Pros:</strong> Universally accepted, decent records. <strong>Cons:</strong> Fees on the goods/services side (around 2.9% + $0.30) and tenants can dispute and reverse charges with PayPal's protection program. That last point is the dealbreaker. Imagine getting rent on the 1st and having it clawed back on the 15th because the tenant filed a dispute.
        </p>

        <h2 style={{ fontSize: 24, fontWeight: 700, color: N, marginTop: 40, marginBottom: 12 }}>Option 4: Dedicated rent collection tools</h2>
        <p style={{ fontSize: 16, color: INK_MID, marginBottom: 16 }}>
          <strong>Best for:</strong> Anyone with more than one unit who wants real automation.
        </p>
        <p style={{ fontSize: 16, color: INK_MID, marginBottom: 16 }}>
          Tools built specifically for landlords (Avail, RentRedi, Apartments.com, Keywise) handle the things consumer apps can't: automated late fees, payment reminders, partial payment policies, full transaction history for taxes, and integration with your lease records. Most charge a small per-transaction fee or a monthly subscription.
        </p>
        <p style={{ fontSize: 16, color: INK_MID, marginBottom: 16 }}>
          The biggest difference is reliability. With a dedicated tool, you set it up once and rent collects itself every month. With Venmo or Zelle, you're still chasing tenants who forgot.
        </p>

        <h2 style={{ fontSize: 24, fontWeight: 700, color: N, marginTop: 40, marginBottom: 12 }}>How Keywise handles rent collection</h2>
        <p style={{ fontSize: 16, color: INK_MID, marginBottom: 16 }}>
          Keywise uses Stripe for online payments. Tenants can pay with a saved card in one tap, or set up auto-pay so monthly rent charges automatically on their due date. You connect your bank account, and rent deposits straight in.
        </p>
        <p style={{ fontSize: 16, color: INK_MID, marginBottom: 16 }}>
          Late fees are calculated automatically based on your lease terms. Receipts are sent to the tenant the moment payment clears. The whole transaction history is exportable for taxes. And you only pay $2 per online payment — not a percentage of rent, so a $3,000 monthly rent costs the same as a $1,000 one.
        </p>
        <p style={{ fontSize: 16, color: INK_MID, marginBottom: 16 }}>
          For landlords with 1-2 units, the free plan covers everything except online payments. If you upgrade to Pro ($19/mo), you unlock unlimited units plus the full payment system.
        </p>

        <div style={{ marginTop: 60, padding: 32, background: N, borderRadius: 12, textAlign: 'center' }}>
          <h3 style={{ fontSize: 22, fontWeight: 700, color: '#fff', marginBottom: 8 }}>Collect rent the easy way</h3>
          <p style={{ fontSize: 14, color: 'rgba(255,255,255,0.8)', marginBottom: 20 }}>
            Auto-pay, saved cards, automated receipts. $2 per transaction — no hidden fees.
          </p>
          <Link href="/" style={{ display: 'inline-block', background: TEAL, color: N, padding: '14px 32px', borderRadius: 10, fontSize: 15, fontWeight: 700, textDecoration: 'none' }}>
            Try Keywise free →
          </Link>
        </div>
      </article>
    </div>
  );
}
