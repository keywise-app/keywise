import type { Metadata } from 'next';
import Link from 'next/link';

export const metadata: Metadata = {
  title: 'Security Deposit Deductions: What Landlords Can (and Can\'t) Charge For | Keywise',
  description: 'Know exactly what you can deduct from a security deposit and what crosses the line. State rules, common mistakes, and documentation tips.',
  alternates: { canonical: 'https://keywise.app/blog/security-deposit-deductions' },
  openGraph: {
    title: 'Security Deposit Deductions: What Landlords Can (and Can\'t) Charge For | Keywise',
    description: 'Know exactly what you can deduct from a security deposit and what crosses the line.',
    url: 'https://keywise.app/blog/security-deposit-deductions',
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
        <div style={{ fontSize: 12, color: INK_MUTED, textTransform: 'uppercase', letterSpacing: '1px', marginBottom: 12 }}>Legal · 2026</div>
        <h1 style={{ fontSize: 38, fontWeight: 800, color: N, letterSpacing: '-1px', marginBottom: 20, lineHeight: 1.2 }}>
          Security Deposit Deductions: What Landlords Can (and Can&apos;t) Charge For
        </h1>
        <p style={{ fontSize: 18, color: INK_MID, marginBottom: 32 }}>
          Returning a security deposit sounds simple until you&apos;re standing in a trashed apartment wondering what counts as &quot;normal wear and tear.&quot; Get the deductions wrong and you could owe penalties. Here&apos;s how to do it right.
        </p>

        <h2 style={{ fontSize: 24, fontWeight: 700, color: N, marginTop: 40, marginBottom: 12 }}>What you CAN deduct</h2>
        <div style={{ background: '#E8F8F0', border: '1px solid #86EFAC', borderRadius: 10, padding: 20, marginBottom: 24 }}>
          <ul style={{ margin: 0, paddingLeft: 18, fontSize: 15, color: INK_MID, lineHeight: 1.8 }}>
            <li><strong>Unpaid rent</strong> — any balance owed at move-out</li>
            <li><strong>Damage beyond normal wear and tear</strong> — holes in walls, broken fixtures, stained carpets (beyond age-related wear), burn marks, pet damage</li>
            <li><strong>Cleaning costs</strong> — if the unit is left significantly dirtier than move-in condition (not just dusty — actually dirty)</li>
            <li><strong>Unreturned keys or remotes</strong> — cost of replacement or rekeying</li>
            <li><strong>Lease violation costs</strong> — unauthorized modifications, removal of fixtures, disposal of abandoned property (where state law allows)</li>
          </ul>
        </div>

        <h2 style={{ fontSize: 24, fontWeight: 700, color: N, marginTop: 40, marginBottom: 12 }}>What you CANNOT deduct</h2>
        <div style={{ background: '#FFEDED', border: '1px solid #FCA5A5', borderRadius: 10, padding: 20, marginBottom: 24 }}>
          <ul style={{ margin: 0, paddingLeft: 18, fontSize: 15, color: INK_MID, lineHeight: 1.8 }}>
            <li><strong>Normal wear and tear</strong> — faded paint, worn carpet from foot traffic, minor scuffs on walls, loose door handles from age</li>
            <li><strong>Pre-existing damage</strong> — anything documented in the move-in inspection</li>
            <li><strong>Appliance depreciation</strong> — a 10-year-old dishwasher breaking is not the tenant&apos;s fault</li>
            <li><strong>Routine maintenance</strong> — repainting between tenants, steam cleaning carpets (unless damage exceeds normal use), replacing air filters</li>
            <li><strong>Improvements or upgrades</strong> — you can&apos;t charge the tenant for upgrades you wanted to make anyway</li>
          </ul>
        </div>

        <h2 style={{ fontSize: 24, fontWeight: 700, color: N, marginTop: 40, marginBottom: 12 }}>The gray area: wear and tear vs. damage</h2>
        <p style={{ fontSize: 16, color: INK_MID, marginBottom: 16 }}>
          This is where most disputes happen. The legal standard is: would this condition have occurred through ordinary, reasonable use of the property? If yes, it&apos;s wear and tear. If no, it&apos;s damage.
        </p>
        <div style={{ background: BG, border: `1px solid ${BORDER}`, borderRadius: 10, padding: 20, marginBottom: 24 }}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: 16, fontSize: 14 }}>
            <div>
              <div style={{ fontWeight: 700, color: '#00875A', marginBottom: 8 }}>Normal wear and tear</div>
              <ul style={{ margin: 0, paddingLeft: 16, color: INK_MID, lineHeight: 1.7 }}>
                <li>Small nail holes from hanging pictures</li>
                <li>Faded paint or wallpaper</li>
                <li>Carpet worn thin in high-traffic areas</li>
                <li>Minor scuffs on hardwood floors</li>
                <li>Loose grout in bathroom tile</li>
              </ul>
            </div>
            <div>
              <div style={{ fontWeight: 700, color: '#CC3333', marginBottom: 8 }}>Deductible damage</div>
              <ul style={{ margin: 0, paddingLeft: 16, color: INK_MID, lineHeight: 1.7 }}>
                <li>Large holes in walls or doors</li>
                <li>Crayon/marker on walls</li>
                <li>Carpet stains from spills or pets</li>
                <li>Gouges or burns in hardwood</li>
                <li>Broken tiles or fixtures</li>
              </ul>
            </div>
          </div>
        </div>

        <h2 style={{ fontSize: 24, fontWeight: 700, color: N, marginTop: 40, marginBottom: 12 }}>How to protect yourself: documentation</h2>
        <p style={{ fontSize: 16, color: INK_MID, marginBottom: 16 }}>
          The single most important thing you can do is document the property condition at move-in and move-out. Photos, video, and a signed checklist make deductions defensible. Without documentation, a judge will almost always side with the tenant.
        </p>
        <ol style={{ fontSize: 16, color: INK_MID, lineHeight: 1.8, paddingLeft: 20, marginBottom: 24 }}>
          <li><strong>Move-in inspection</strong> — walk through with the tenant, document every room, take timestamped photos, both parties sign</li>
          <li><strong>Move-out inspection</strong> — same process, compare against move-in records</li>
          <li><strong>Itemized deduction statement</strong> — most states require you to send this with the remaining deposit, listing each deduction with a dollar amount and description</li>
          <li><strong>Keep receipts</strong> — for any repair or cleaning you deduct, keep the invoice or receipt</li>
        </ol>

        <h2 style={{ fontSize: 24, fontWeight: 700, color: N, marginTop: 40, marginBottom: 12 }}>How Keywise helps with deposit deductions</h2>
        <p style={{ fontSize: 16, color: INK_MID, marginBottom: 16 }}>
          Keywise tracks the deposit amount in each lease record and surfaces return deadlines based on your state. Move-in and move-out inspections are documented digitally with photos and condition ratings — giving you a side-by-side comparison when it&apos;s time to assess deductions.
        </p>

        <div style={{ marginTop: 32, marginBottom: 40, padding: 24, background: BG, border: `1px solid ${BORDER}`, borderRadius: 12, textAlign: 'center' }}>
          <div style={{ fontSize: 18, fontWeight: 700, color: N, marginBottom: 8 }}>Make deposit deductions defensible</div>
          <div style={{ fontSize: 14, color: INK_MID, marginBottom: 16 }}>Documented inspections, tracked deadlines, and organized records. Free for 1-2 units.</div>
          <Link href="/?signup=true" style={{ display: 'inline-block', background: N, color: '#fff', padding: '12px 28px', borderRadius: 10, fontSize: 14, fontWeight: 700, textDecoration: 'none' }}>
            Start free →
          </Link>
        </div>

        <h2 style={{ fontSize: 24, fontWeight: 700, color: N, marginTop: 40, marginBottom: 12 }}>Related articles</h2>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 20 }}>
          <Link href="/blog/security-deposit-laws" style={{ fontSize: 15, color: '#00A886', fontWeight: 600, textDecoration: 'none' }}>→ Security Deposit Laws: What Every Landlord Needs to Know</Link>
          <Link href="/blog/move-in-inspection-checklist" style={{ fontSize: 15, color: '#00A886', fontWeight: 600, textDecoration: 'none' }}>→ Move-In Inspection Checklist for Landlords (Free)</Link>
          <Link href="/blog/landlord-tenant-communication" style={{ fontSize: 15, color: '#00A886', fontWeight: 600, textDecoration: 'none' }}>→ Landlord-Tenant Communication: How to Handle It</Link>
        </div>

        <div style={{ marginTop: 60, padding: 32, background: N, borderRadius: 12, textAlign: 'center' }}>
          <h3 style={{ fontSize: 22, fontWeight: 700, color: '#fff', marginBottom: 8 }}>Never guess at deposit deductions again</h3>
          <p style={{ fontSize: 14, color: 'rgba(255,255,255,0.8)', marginBottom: 20 }}>
            Side-by-side inspection comparisons, state-specific deadlines, and organized documentation.
          </p>
          <Link href="/" style={{ display: 'inline-block', background: TEAL, color: N, padding: '14px 32px', borderRadius: 10, fontSize: 15, fontWeight: 700, textDecoration: 'none' }}>
            Try Keywise free →
          </Link>
        </div>
      </article>
    </div>
  );
}
