import type { Metadata } from 'next';
import Link from 'next/link';

export const metadata: Metadata = {
  title: 'Landlord-Tenant Communication: How to Handle It Without Losing Your Mind | Keywise',
  description: 'Practical communication strategies for landlords: templates for rent reminders, maintenance updates, lease renewals, and difficult conversations.',
  alternates: { canonical: 'https://keywise.app/blog/landlord-tenant-communication' },
  openGraph: {
    title: 'Landlord-Tenant Communication: How to Handle It Without Losing Your Mind | Keywise',
    description: 'Practical communication strategies for landlords: templates for rent reminders, maintenance updates, lease renewals, and difficult conversations.',
    url: 'https://keywise.app/blog/landlord-tenant-communication',
    siteName: 'Keywise',
    type: 'article',
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
        <div style={{ fontSize: 12, color: INK_MUTED, textTransform: 'uppercase', letterSpacing: '1px', marginBottom: 12 }}>Management · 2026</div>
        <h1 style={{ fontSize: 38, fontWeight: 800, color: N, letterSpacing: '-1px', marginBottom: 20, lineHeight: 1.2 }}>
          Landlord-Tenant Communication: How to Handle It Without Losing Your Mind
        </h1>
        <p style={{ fontSize: 18, color: INK_MID, marginBottom: 32 }}>
          Good communication prevents 90% of landlord-tenant disputes. Bad communication causes them. Here&apos;s how to get it right without turning your rental into a full-time customer service job.
        </p>

        <h2 style={{ fontSize: 24, fontWeight: 700, color: N, marginTop: 40, marginBottom: 12 }}>The golden rule: be professional, not personal</h2>
        <p style={{ fontSize: 16, color: INK_MID, marginBottom: 16 }}>
          Your tenant is not your friend. They&apos;re also not your enemy. They&apos;re your customer. Every message you send should be professional, clear, and documented. This protects both of you if things go sideways.
        </p>
        <p style={{ fontSize: 16, color: INK_MID, marginBottom: 16 }}>
          The biggest mistake small landlords make is handling everything via text message and phone calls. When a dispute reaches court, &quot;I told them on the phone&quot; carries zero weight. Written communication — email, in-app messages, formal letters — creates a paper trail that protects you.
        </p>

        <h2 style={{ fontSize: 24, fontWeight: 700, color: N, marginTop: 40, marginBottom: 12 }}>5 conversations every landlord needs to nail</h2>

        <h3 style={{ fontSize: 18, fontWeight: 700, color: N, marginTop: 24, marginBottom: 8 }}>1. Rent reminders</h3>
        <p style={{ fontSize: 16, color: INK_MID, marginBottom: 16 }}>
          Send a friendly reminder 3-5 days before rent is due. Not aggressive — just a nudge. Most late payments happen because people forget, not because they&apos;re trying to stiff you. A simple &quot;Hi [Name], just a reminder that rent of $X is due on the 1st&quot; prevents most issues before they start.
        </p>

        <h3 style={{ fontSize: 18, fontWeight: 700, color: N, marginTop: 24, marginBottom: 8 }}>2. Late rent follow-up</h3>
        <p style={{ fontSize: 16, color: INK_MID, marginBottom: 16 }}>
          If rent is late, escalate gradually. Day 1 past due: a polite check-in. Day 3: a formal late notice referencing the lease terms and any late fees. Day 7+: a more serious notice with next steps. Never threaten — state facts and reference the lease.
        </p>

        <h3 style={{ fontSize: 18, fontWeight: 700, color: N, marginTop: 24, marginBottom: 8 }}>3. Maintenance responses</h3>
        <p style={{ fontSize: 16, color: INK_MID, marginBottom: 16 }}>
          Acknowledge every maintenance request within 24 hours, even if you can&apos;t fix it immediately. &quot;Got it, scheduling a plumber for Thursday&quot; is a thousand times better than silence. Tenants who feel ignored become tenants who withhold rent or call the city.
        </p>

        <h3 style={{ fontSize: 18, fontWeight: 700, color: N, marginTop: 24, marginBottom: 8 }}>4. Lease renewal / rent increase</h3>
        <p style={{ fontSize: 16, color: INK_MID, marginBottom: 16 }}>
          Start the conversation 60-90 days before the lease ends. Lead with value: &quot;We&apos;d love to have you stay. Here are the renewal terms.&quot; If you&apos;re raising rent, show your reasoning — market data, increased costs, improvements you&apos;ve made. Tenants who understand the &quot;why&quot; are far more likely to accept.
        </p>

        <h3 style={{ fontSize: 18, fontWeight: 700, color: N, marginTop: 24, marginBottom: 8 }}>5. Difficult conversations</h3>
        <p style={{ fontSize: 16, color: INK_MID, marginBottom: 16 }}>
          Lease violations, noise complaints, unauthorized occupants — these are the conversations nobody wants to have. Keep it factual: reference the specific lease clause, describe the observed behavior, and state what needs to change by when. Never make it personal. &quot;The lease prohibits X. Please resolve this by [date]&quot; is all you need.
        </p>

        <h2 style={{ fontSize: 24, fontWeight: 700, color: N, marginTop: 40, marginBottom: 12 }}>Communication channels, ranked</h2>
        <div style={{ background: BG, border: `1px solid ${BORDER}`, borderRadius: 10, padding: 20, marginBottom: 24 }}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: 12, fontSize: 14, color: INK_MID }}>
            <div><strong>Best:</strong> Property management app (timestamped, organized, searchable)</div>
            <div><strong>Good:</strong> Email (documented, easy to reference)</div>
            <div><strong>Okay:</strong> Text message (fast, but hard to organize)</div>
            <div><strong>Avoid:</strong> Phone calls only (no paper trail)</div>
            <div><strong>Never:</strong> Social media or casual messaging apps</div>
          </div>
        </div>

        <h2 style={{ fontSize: 24, fontWeight: 700, color: N, marginTop: 40, marginBottom: 12 }}>How Keywise handles communication for you</h2>
        <p style={{ fontSize: 16, color: INK_MID, marginBottom: 16 }}>
          Keywise sends automatic rent reminders and late notices on your behalf — professionally worded, on schedule, with no effort from you. Every message is logged and timestamped. When it&apos;s time for a renewal, AI drafts the notice based on your lease terms and current market data.
        </p>
        <p style={{ fontSize: 16, color: INK_MID, marginBottom: 16 }}>
          No more copying rent amounts into text messages. No more forgetting to follow up on late payments. No more drafting the same renewal letter from scratch every year.
        </p>

        <div style={{ marginTop: 32, marginBottom: 40, padding: 24, background: BG, border: `1px solid ${BORDER}`, borderRadius: 12, textAlign: 'center' }}>
          <div style={{ fontSize: 18, fontWeight: 700, color: N, marginBottom: 8 }}>Automate the conversations you hate</div>
          <div style={{ fontSize: 14, color: INK_MID, marginBottom: 16 }}>Keywise handles rent reminders, late notices, and renewals. Free for 1-2 units.</div>
          <Link href="/?signup=true" style={{ display: 'inline-block', background: N, color: '#fff', padding: '12px 28px', borderRadius: 10, fontSize: 14, fontWeight: 700, textDecoration: 'none' }}>
            Start free →
          </Link>
        </div>

        <h2 style={{ fontSize: 24, fontWeight: 700, color: N, marginTop: 40, marginBottom: 12 }}>Related articles</h2>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 20 }}>
          <Link href="/blog/late-rent-notice" style={{ fontSize: 15, color: '#00A886', fontWeight: 600, textDecoration: 'none' }}>→ How to Write a Late Rent Notice (Free Template)</Link>
          <Link href="/blog/security-deposit-laws" style={{ fontSize: 15, color: '#00A886', fontWeight: 600, textDecoration: 'none' }}>→ Security Deposit Laws: What Every Landlord Needs to Know</Link>
          <Link href="/blog/free-lease-agreement-template" style={{ fontSize: 15, color: '#00A886', fontWeight: 600, textDecoration: 'none' }}>→ Free Lease Agreement Template for Small Landlords</Link>
        </div>

        <div style={{ marginTop: 60, padding: 32, background: N, borderRadius: 12, textAlign: 'center' }}>
          <h3 style={{ fontSize: 22, fontWeight: 700, color: '#fff', marginBottom: 8 }}>Professional communication, zero effort</h3>
          <p style={{ fontSize: 14, color: 'rgba(255,255,255,0.8)', marginBottom: 20 }}>
            AI-drafted notices, automatic reminders, and a full communication log for every tenant.
          </p>
          <Link href="/" style={{ display: 'inline-block', background: TEAL, color: N, padding: '14px 32px', borderRadius: 10, fontSize: 15, fontWeight: 700, textDecoration: 'none' }}>
            Try Keywise free →
          </Link>
        </div>
      </article>
    </div>
  );
}
