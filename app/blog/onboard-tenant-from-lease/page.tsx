import type { Metadata } from 'next';
import Link from 'next/link';

export const metadata: Metadata = {
  title: 'How to Onboard a Tenant in 60 Seconds With a Lease PDF | Keywise',
  description: 'Upload your lease and let AI create the building, unit, tenant, and payment schedule automatically. No retyping, no data entry.',
  alternates: { canonical: 'https://keywise.app/blog/onboard-tenant-from-lease' },
  openGraph: {
    title: 'How to Onboard a Tenant in 60 Seconds With a Lease PDF | Keywise',
    description: 'Upload your lease and let AI create the building, unit, tenant, and payment schedule automatically.',
    url: 'https://keywise.app/blog/onboard-tenant-from-lease',
    siteName: 'Keywise',
    type: 'article',
    images: [{ url: '/og-image.png', width: 1200, height: 628 }],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'How to Onboard a Tenant in 60 Seconds With a Lease PDF | Keywise',
    description: 'Upload your lease and let AI create the building, unit, tenant, and payment schedule automatically.',
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
        <div style={{ fontSize: 12, color: INK_MUTED, textTransform: 'uppercase', letterSpacing: '1px', marginBottom: 12 }}>Product · June 2026</div>
        <h1 style={{ fontSize: 38, fontWeight: 800, color: N, letterSpacing: '-1px', marginBottom: 20, lineHeight: 1.2 }}>
          How to Onboard a Tenant in 60 Seconds With a Lease PDF
        </h1>
        <p style={{ fontSize: 18, color: INK_MID, marginBottom: 32 }}>
          Most property management tools make you type in tenant details, property info, lease dates, and payment terms by hand. Keywise reads your lease document and does it all for you &mdash; building, unit, tenant, and payment schedule created in a single flow.
        </p>

        <nav style={{ background: BG, border: `1px solid ${BORDER}`, borderRadius: 10, padding: '16px 20px', marginBottom: 32 }}>
          <div style={{ fontSize: 12, fontWeight: 700, color: INK_MUTED, textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: 8 }}>In this article</div>
          <ul style={{ margin: 0, padding: 0, listStyle: 'none', display: 'flex', flexDirection: 'column', gap: 6 }}>
            <li><a href="#problem" style={{ fontSize: 14, color: TEAL_DARK, textDecoration: 'none', fontWeight: 500 }}>The data entry problem</a></li>
            <li><a href="#how-it-works" style={{ fontSize: 14, color: TEAL_DARK, textDecoration: 'none', fontWeight: 500 }}>How lease-to-tenant onboarding works</a></li>
            <li><a href="#what-gets-created" style={{ fontSize: 14, color: TEAL_DARK, textDecoration: 'none', fontWeight: 500 }}>What gets created automatically</a></li>
            <li><a href="#edge-cases" style={{ fontSize: 14, color: TEAL_DARK, textDecoration: 'none', fontWeight: 500 }}>Multi-unit buildings and new properties</a></li>
            <li><a href="#try-it" style={{ fontSize: 14, color: TEAL_DARK, textDecoration: 'none', fontWeight: 500 }}>Try it now</a></li>
          </ul>
        </nav>

        <h2 id="problem" style={{ fontSize: 24, fontWeight: 700, color: N, marginTop: 40, marginBottom: 12 }}>The data entry problem</h2>
        <p style={{ fontSize: 16, color: INK_MID, marginBottom: 16 }}>
          You already have a signed lease. It contains the tenant&apos;s name, the property address, the unit number, the rent amount, the security deposit, the lease start and end dates, and the late fee terms. All of that information is sitting in a PDF on your computer or in your email.
        </p>
        <p style={{ fontSize: 16, color: INK_MID, marginBottom: 16 }}>
          So why should you have to type it all in again? With most property management software, you do &mdash; field by field, screen by screen. It takes 5&ndash;10 minutes per tenant, and if you&apos;re onboarding multiple units at once, you&apos;re looking at an afternoon of data entry.
        </p>

        <h2 id="how-it-works" style={{ fontSize: 24, fontWeight: 700, color: N, marginTop: 40, marginBottom: 12 }}>How lease-to-tenant onboarding works</h2>
        <p style={{ fontSize: 16, color: INK_MID, marginBottom: 16 }}>
          Keywise&apos;s &ldquo;Onboard a Unit&rdquo; wizard now supports a single upload-to-done flow:
        </p>
        <ol style={{ paddingLeft: 24, fontSize: 16, color: INK_MID, marginBottom: 16, display: 'flex', flexDirection: 'column', gap: 12 }}>
          <li><strong>Upload your lease PDF</strong> (or a photo of a paper lease). Keywise&apos;s AI reads the document and extracts tenant name, address, unit number, rent, deposit, dates, and late fee terms.</li>
          <li><strong>Confirm the extracted data.</strong> The wizard shows you what it found &mdash; each field is editable if the AI got something wrong or the lease was ambiguous.</li>
          <li><strong>Building and unit are matched or created automatically.</strong> If your building already exists in Keywise, the wizard matches it. If the unit doesn&apos;t exist yet, you can create it inline without leaving the wizard.</li>
          <li><strong>Payment schedule is generated.</strong> Based on the rent amount, due day, and lease end date, Keywise creates pending payment records from today forward.</li>
          <li><strong>Invite your tenant.</strong> Send an email or SMS invitation so they can view their lease, pay rent, and message you through Keywise.</li>
        </ol>

        <div style={{ background: BG, border: `1px solid ${TEAL}44`, borderRadius: 12, padding: '20px 24px', marginBottom: 32, marginTop: 32 }}>
          <div style={{ fontWeight: 700, fontSize: 15, color: N, marginBottom: 8 }}>What the AI extracts from your lease</div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, fontSize: 14, color: INK_MID }}>
            <div>&#10003; Tenant name</div>
            <div>&#10003; Email &amp; phone</div>
            <div>&#10003; Building address</div>
            <div>&#10003; Unit number</div>
            <div>&#10003; Monthly rent</div>
            <div>&#10003; Security deposit</div>
            <div>&#10003; Lease start &amp; end dates</div>
            <div>&#10003; Late fee terms &amp; clause</div>
            <div>&#10003; Bedrooms &amp; bathrooms</div>
            <div>&#10003; Square footage</div>
          </div>
        </div>

        <h2 id="what-gets-created" style={{ fontSize: 24, fontWeight: 700, color: N, marginTop: 40, marginBottom: 12 }}>What gets created automatically</h2>
        <p style={{ fontSize: 16, color: INK_MID, marginBottom: 16 }}>
          After you click &ldquo;Complete Setup,&rdquo; Keywise creates all of the following in one step:
        </p>
        <ul style={{ paddingLeft: 24, fontSize: 16, color: INK_MID, marginBottom: 16, display: 'flex', flexDirection: 'column', gap: 8 }}>
          <li><strong>Building record</strong> &mdash; if this is a new property, the building is created with address, type, and any mortgage/insurance costs you entered.</li>
          <li><strong>Unit record</strong> &mdash; the unit is created under the building with beds, baths, sqft, and rent. If the building already exists, only the unit is added.</li>
          <li><strong>Lease record</strong> &mdash; all extracted terms are saved, including the verbatim late fee clause from your lease.</li>
          <li><strong>Lease document</strong> &mdash; the original PDF is stored in your document vault, linked to the tenant and lease for later retrieval.</li>
          <li><strong>Payment schedule</strong> &mdash; pending payment records are generated from today through the lease end date.</li>
        </ul>

        <h2 id="edge-cases" style={{ fontSize: 24, fontWeight: 700, color: N, marginTop: 40, marginBottom: 12 }}>Multi-unit buildings and new properties</h2>
        <p style={{ fontSize: 16, color: INK_MID, marginBottom: 16 }}>
          The wizard handles every combination:
        </p>
        <ul style={{ paddingLeft: 24, fontSize: 16, color: INK_MID, marginBottom: 16, display: 'flex', flexDirection: 'column', gap: 8 }}>
          <li><strong>New building + new unit:</strong> Both are created. The AI extracts the address and unit number from the lease so you don&apos;t have to type them.</li>
          <li><strong>Existing building + new unit:</strong> The wizard recognizes your building and shows an inline form to create the unit &mdash; pre-filled with the extracted unit number, beds, and baths.</li>
          <li><strong>Existing building + existing unit:</strong> The wizard matches both and pre-selects them in the dropdowns. You just click Continue.</li>
          <li><strong>Single-family home (no unit number):</strong> The unit number field is optional. The building and unit are still created, just without a unit designator.</li>
        </ul>
        <p style={{ fontSize: 16, color: INK_MID, marginBottom: 16 }}>
          Duplicate prevention is built in &mdash; if you try to create a unit that already exists at that building, the wizard warns you and lets you select the existing one instead.
        </p>

        <h2 id="try-it" style={{ fontSize: 24, fontWeight: 700, color: N, marginTop: 40, marginBottom: 12 }}>Try it now</h2>
        <p style={{ fontSize: 16, color: INK_MID, marginBottom: 16 }}>
          Log in to Keywise and click &ldquo;Onboard a Unit&rdquo; in the sidebar. Drop your lease PDF and watch the wizard do the rest.
        </p>

        <div style={{ background: N, borderRadius: 14, padding: '32px 28px', marginTop: 48, textAlign: 'center' }}>
          <div style={{ fontSize: 22, fontWeight: 700, color: '#fff', marginBottom: 8 }}>Stop retyping your leases</div>
          <div style={{ fontSize: 14, color: 'rgba(255,255,255,0.7)', marginBottom: 20, maxWidth: 460, margin: '0 auto 20px' }}>
            Upload a lease PDF and onboard your tenant in under a minute. Free for up to 2 units.
          </div>
          <Link href="/" style={{ display: 'inline-block', background: TEAL, color: N, padding: '12px 28px', borderRadius: 10, fontWeight: 700, fontSize: 15, textDecoration: 'none', letterSpacing: '-0.2px' }}>
            Start Free →
          </Link>
        </div>

        <div style={{ marginTop: 48, paddingTop: 24, borderTop: `1px solid ${BORDER}` }}>
          <div style={{ fontSize: 12, fontWeight: 700, color: INK_MUTED, textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: 12 }}>Related articles</div>
          <ul style={{ listStyle: 'none', padding: 0, display: 'flex', flexDirection: 'column', gap: 8 }}>
            <li><Link href="/blog/california-compliance-tools-landlords" style={{ fontSize: 14, color: TEAL_DARK, textDecoration: 'none', fontWeight: 500 }}>3 Free Compliance Tools Every California Landlord Should Know About →</Link></li>
            <li><Link href="/blog/move-in-inspection-checklist" style={{ fontSize: 14, color: TEAL_DARK, textDecoration: 'none', fontWeight: 500 }}>Move-In Inspection Checklist for Landlords →</Link></li>
            <li><Link href="/blog/free-lease-agreement-template" style={{ fontSize: 14, color: TEAL_DARK, textDecoration: 'none', fontWeight: 500 }}>Free Lease Agreement Template for Small Landlords →</Link></li>
          </ul>
        </div>
      </article>

      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify({
          '@context': 'https://schema.org',
          '@type': 'Article',
          headline: 'How to Onboard a Tenant in 60 Seconds With a Lease PDF',
          description: 'Upload your lease and let AI create the building, unit, tenant, and payment schedule automatically.',
          datePublished: '2026-06-21',
          url: 'https://keywise.app/blog/onboard-tenant-from-lease',
          author: { '@type': 'Organization', name: 'Keywise', url: 'https://keywise.app' },
          publisher: { '@type': 'Organization', name: 'Keywise', url: 'https://keywise.app' },
        }) }}
      />
    </div>
  );
}
