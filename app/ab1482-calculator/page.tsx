import type { Metadata } from 'next';
import AB1482Calculator from '../components/AB1482Calculator';

export const metadata: Metadata = {
  title: 'AB 1482 Rent Cap Calculator — Free California Rent Increase Calculator | Keywise',
  description: 'Calculate the maximum legal rent increase under California AB 1482. Free tool for California landlords. Auto-calculates CPI limits, flags exemptions, shows required notice periods.',
  alternates: { canonical: 'https://keywise.app/ab1482-calculator' },
  openGraph: {
    title: 'AB 1482 Rent Cap Calculator — Free',
    description: 'Calculate the maximum legal California rent increase in seconds. Free, no signup required.',
    url: 'https://keywise.app/ab1482-calculator',
  },
};

export default function AB1482Page() {
  return (
    <div style={{ fontFamily: "'Inter', system-ui, sans-serif", background: '#F0F4FF', minHeight: '100vh' }}>
      <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap" rel="stylesheet" />

      {/* Header */}
      <nav style={{ background: '#0F3460', padding: '0 40px', height: 60, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <a href="/" style={{ display: 'flex', alignItems: 'center', gap: 10, textDecoration: 'none' }}>
          <svg width="28" height="28" viewBox="0 0 32 32" fill="none">
            <rect width="32" height="32" rx="8" fill="#0F3460"/>
            <circle cx="13" cy="16" r="5.5" fill="none" stroke="#00D4AA" strokeWidth="2.5"/>
            <circle cx="13" cy="16" r="2" fill="#00D4AA"/>
            <rect x="17.5" y="14.75" width="8" height="2.5" rx="1.25" fill="#00D4AA"/>
            <rect x="22" y="17.25" width="4" height="2" rx="1" fill="#00D4AA"/>
            <rect x="19" y="17.25" width="2.5" height="2" rx="1" fill="#00D4AA"/>
          </svg>
          <span style={{ color: '#fff', fontWeight: 700, fontSize: 18 }}>Keywise</span>
        </a>
        <a href="/" style={{ color: '#fff', fontSize: 13, textDecoration: 'none', opacity: 0.7 }}>← Back to Keywise</a>
      </nav>

      <div style={{ maxWidth: 860, margin: '0 auto', padding: '48px 24px 80px' }}>

        {/* Page title */}
        <div style={{ marginBottom: 40 }}>
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: 8, background: '#E0FAF5', border: '1px solid #00D4AA44', borderRadius: 100, padding: '5px 14px', marginBottom: 16 }}>
            <span style={{ fontSize: 12, fontWeight: 700, color: '#00A886', textTransform: 'uppercase', letterSpacing: '0.6px' }}>Free Tool</span>
          </div>
          <h1 style={{ fontSize: 40, fontWeight: 800, color: '#0F3460', margin: '0 0 16px', lineHeight: 1.1, letterSpacing: '-1px' }}>
            AB 1482 Rent Cap Calculator
          </h1>
          <p style={{ fontSize: 17, color: '#4A5068', lineHeight: 1.65, margin: 0, maxWidth: 640 }}>
            Calculate the maximum legal rent increase allowed under California&apos;s Tenant Protection Act (AB 1482). Free, no signup required. Takes 60 seconds.
          </p>
        </div>

        {/* THE INTERACTIVE CALCULATOR (client component) */}
        <AB1482Calculator />

        {/* SEO CONTENT BELOW THE FOLD */}
        <div style={{ marginTop: 64 }}>
          <section style={{ marginBottom: 48 }}>
            <h2 style={{ fontSize: 28, fontWeight: 700, color: '#0F3460', margin: '0 0 16px' }}>What is AB 1482?</h2>
            <p style={{ fontSize: 15, color: '#4A5068', lineHeight: 1.75, margin: '0 0 16px' }}>
              AB 1482, California&apos;s Tenant Protection Act of 2019, limits annual rent increases for most residential properties to 5% plus the local Consumer Price Index (CPI), with a maximum cap of 10%. This law applies to most multi-family housing built more than 15 years ago, protecting tenants from sudden large rent increases while still allowing landlords to keep up with inflation.
            </p>
            <p style={{ fontSize: 15, color: '#4A5068', lineHeight: 1.75, margin: 0 }}>
              The law is enforced by the California Department of Housing and Community Development (HCD) and violations can result in significant penalties. Landlords who charge more than the AB 1482 maximum can face civil lawsuits from tenants, including damages of 3x the overcharged rent plus attorney&apos;s fees. Getting this right matters.
            </p>
          </section>

          <section style={{ marginBottom: 48 }}>
            <h2 style={{ fontSize: 28, fontWeight: 700, color: '#0F3460', margin: '0 0 16px' }}>How to Use This Calculator</h2>
            <ul style={{ fontSize: 15, color: '#4A5068', lineHeight: 1.75, margin: 0, paddingLeft: 20 }}>
              <li style={{ marginBottom: 8 }}>Enter the current monthly rent and the date of the last rent increase</li>
              <li style={{ marginBottom: 8 }}>Select the property type and ownership structure</li>
              <li style={{ marginBottom: 8 }}>Choose your region — CPI varies by location in California</li>
              <li style={{ marginBottom: 8 }}>The calculator checks exemptions automatically based on your inputs</li>
              <li style={{ marginBottom: 8 }}>If your property is covered, you&apos;ll see the exact maximum new rent and the required notice period</li>
              <li>Enter your email to receive a professionally formatted rent increase notice PDF</li>
            </ul>
          </section>

          <section style={{ marginBottom: 48 }}>
            <h2 style={{ fontSize: 28, fontWeight: 700, color: '#0F3460', margin: '0 0 16px' }}>AB 1482 Exemptions</h2>
            <p style={{ fontSize: 15, color: '#4A5068', lineHeight: 1.75, margin: '0 0 16px' }}>
              Not all residential properties are covered by AB 1482. The following property types are exempt:
            </p>
            <ul style={{ fontSize: 15, color: '#4A5068', lineHeight: 1.75, margin: 0, paddingLeft: 20 }}>
              <li style={{ marginBottom: 8 }}><strong>New construction</strong>: Buildings where the certificate of occupancy was issued within the last 15 years (rolling window — as of 2026, that means buildings built after 2011)</li>
              <li style={{ marginBottom: 8 }}><strong>Single-family homes and condos</strong>: Owned by individuals (not corporations, LLCs, REITs, or trusts), provided the landlord served a written exemption notice to the tenant</li>
              <li style={{ marginBottom: 8 }}><strong>Owner-occupied small buildings</strong>: Duplexes, triplexes, and fourplexes where the owner lives in one of the units</li>
              <li style={{ marginBottom: 8 }}><strong>Affordable housing</strong>: Units subject to deed restrictions, subsidies, or other government-mandated affordability requirements</li>
              <li style={{ marginBottom: 8 }}><strong>Dormitories</strong>: University or school-owned housing</li>
              <li><strong>Hotels</strong>: Short-term accommodations (under 30-day stays)</li>
            </ul>
          </section>

          <section style={{ marginBottom: 48 }}>
            <h2 style={{ fontSize: 28, fontWeight: 700, color: '#0F3460', margin: '0 0 16px' }}>What Notice Do You Need to Serve?</h2>
            <p style={{ fontSize: 15, color: '#4A5068', lineHeight: 1.75, margin: '0 0 16px' }}>
              California Civil Code Section 827 sets notice requirements for rent increases. The required notice period depends on the size of the increase:
            </p>
            <p style={{ fontSize: 15, color: '#4A5068', lineHeight: 1.75, margin: '0 0 16px' }}>
              <strong>30-day notice</strong>: Required for rent increases of less than 10%. You must serve this notice at least 30 days before the new rent takes effect. Service can be done by personal delivery to the tenant, or by first-class mail (which adds 5 days to the notice period under Civil Code 1013).
            </p>
            <p style={{ fontSize: 15, color: '#4A5068', lineHeight: 1.75, margin: 0 }}>
              <strong>90-day notice</strong>: Required for rent increases of 10% or more. This applies even to properties that are exempt from AB 1482&apos;s rent cap — the notice requirement is separate from the cap. You must serve this notice at least 90 days before the effective date. Given that AB 1482 caps most increases at 10%, 90-day notices are rarely needed for covered properties.
            </p>
          </section>

          <section style={{ marginBottom: 48 }}>
            <h2 style={{ fontSize: 28, fontWeight: 700, color: '#0F3460', margin: '0 0 20px' }}>Frequently Asked Questions</h2>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
              {[
                {
                  q: 'How often can I raise rent under AB 1482?',
                  a: 'AB 1482 limits landlords to one rent increase per 12-month period. Even if the increase is below the maximum cap, you cannot raise rent more than once per year per tenant.'
                },
                {
                  q: 'Does AB 1482 apply to month-to-month tenants?',
                  a: 'Yes. AB 1482 applies to all qualifying tenancies regardless of whether they are on a fixed-term lease or month-to-month. The rent cap and notice requirements apply equally to both.'
                },
                {
                  q: 'What CPI rate should I use?',
                  a: 'AB 1482 uses the CPI for All Urban Consumers for the region where your property is located. The California Department of Industrial Relations publishes these figures. Our calculator uses the most recently published annual rates for each region.'
                },
                {
                  q: 'Can I raise rent more if I add amenities or do renovations?',
                  a: 'No. AB 1482 does not allow landlords to exceed the annual cap for capital improvements or added amenities. The only exceptions are banked increases (previous years where you raised rent below the cap) — but the total increase in any 12-month period still cannot exceed the cap.'
                },
                {
                  q: 'What if my property is exempt — can I raise rent as much as I want?',
                  a: 'If your property is genuinely exempt (single-family home with proper notice given, or building built after 2011), there is no cap on the rent increase amount under AB 1482. However, you must still give proper notice (30 days for under 10%, 90 days for 10% or more), and local rent control ordinances may still apply in some cities.'
                },
                {
                  q: 'Does AB 1482 apply to rent control cities?',
                  a: 'AB 1482 is a state law that sets a floor for tenant protections. Some cities have local rent control ordinances that are stricter than AB 1482. In those cities, you must follow the stricter local rules. Los Angeles, San Francisco, San Jose, Oakland, and many other California cities have local rent control. Check your local ordinances as well.'
                },
                {
                  q: 'What happens if I accidentally charge more than the AB 1482 cap?',
                  a: "Tenants can sue for the overcharged amounts, plus up to 3x the excess rent as punitive damages, plus reasonable attorney's fees. The State can also pursue civil penalties. Correct the rent as soon as you realize the error and consult an attorney."
                },
                {
                  q: 'Is this calculator legal advice?',
                  a: 'No. This calculator is a free educational tool to help you understand AB 1482 in general terms. It is not legal advice and should not be relied upon as such. California landlord-tenant law is complex and fact-specific. Consult a licensed California attorney for advice about your specific situation.'
                },
              ].map(({ q, a }) => (
                <div key={q} style={{ borderBottom: '1px solid #E0E6F0', padding: '20px 0' }}>
                  <div style={{ fontSize: 16, fontWeight: 600, color: '#0F3460', marginBottom: 8 }}>{q}</div>
                  <div style={{ fontSize: 14, color: '#4A5068', lineHeight: 1.7 }}>{a}</div>
                </div>
              ))}
            </div>
          </section>

          {/* Bottom CTA */}
          <div style={{ background: '#0F3460', borderRadius: 20, padding: '48px 40px', textAlign: 'center' }}>
            <div style={{ fontSize: 28, fontWeight: 800, color: '#fff', marginBottom: 12, lineHeight: 1.2 }}>
              Managing multiple properties?
            </div>
            <p style={{ fontSize: 16, color: 'rgba(255,255,255,0.75)', margin: '0 0 28px', maxWidth: 520, marginLeft: 'auto', marginRight: 'auto', lineHeight: 1.65 }}>
              Keywise handles AB 1482 tracking, just-cause eviction notices, AB 2801 move-out inspections, and more — all in one place. Free for 1-2 units.
            </p>
            <a href="/"
              style={{ display: 'inline-block', background: '#00D4AA', color: '#0F3460', textDecoration: 'none', borderRadius: 12, padding: '14px 32px', fontSize: 15, fontWeight: 700 }}>
              Try Keywise Free →
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}
