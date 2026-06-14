import type { Metadata } from 'next';
import Link from 'next/link';

export const metadata: Metadata = {
  title: 'California AB 1482 in 2026: The Small Landlord\'s Guide | Keywise',
  description: 'Everything California landlords need to know about AB 1482 rent caps. Free calculator, CPI rates, exemptions, local overrides, and common mistakes.',
  alternates: { canonical: 'https://keywise.app/blog/california-ab-1482-explained-2026' },
  openGraph: {
    title: 'California AB 1482 in 2026: The Small Landlord\'s Guide | Keywise',
    description: 'Everything California landlords need to know about AB 1482 rent caps. Free calculator, CPI rates, exemptions, local overrides, and common mistakes.',
    url: 'https://keywise.app/blog/california-ab-1482-explained-2026',
    siteName: 'Keywise',
    type: 'article',
    images: [{ url: '/og-image.png', width: 1200, height: 628 }],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'California AB 1482 in 2026: The Small Landlord\'s Guide | Keywise',
    description: 'Everything California landlords need to know about AB 1482 rent caps. Free calculator, CPI rates, exemptions, local overrides, and common mistakes.',
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
        <Link href="/blog" style={{ fontSize: 13, color: INK_MID, textDecoration: 'none', fontWeight: 500 }}>&larr; All articles</Link>
      </nav>

      <article style={{ maxWidth: 720, margin: '0 auto', padding: '60px 24px', lineHeight: 1.7 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, fontSize: 12, color: INK_MUTED, marginBottom: 12 }}>
          <span style={{ textTransform: 'uppercase', letterSpacing: '1px' }}>Compliance</span>
          <span style={{ background: BG, border: `1px solid ${BORDER}`, borderRadius: 6, padding: '2px 8px', fontSize: 11 }}>Last reviewed: May 2026</span>
        </div>
        <h1 style={{ fontSize: 38, fontWeight: 800, color: N, letterSpacing: '-1px', marginBottom: 20, lineHeight: 1.2 }}>
          California AB 1482 in 2026: The Small Landlord&apos;s Guide
        </h1>
        <p style={{ fontSize: 18, color: INK_MID, marginBottom: 32 }}>
          AB 1482 caps how much you can raise rent in California &mdash; and the penalties for getting it wrong are brutal. Overcap by even $50/month and a tenant can sue for actual damages, punitive damages, and attorney fees. In bad-faith cases, courts have awarded tenants a full year&apos;s rent. This guide covers everything you need to know to stay compliant in 2026, including the formula, exemptions, CPI rates, local overrides, and the seven most common mistakes landlords make.
        </p>

        {/* Section 1: What is AB 1482? */}
        <h2 style={{ fontSize: 24, fontWeight: 700, color: N, marginTop: 40, marginBottom: 12 }}>What is AB 1482?</h2>
        <p style={{ fontSize: 16, color: INK_MID, marginBottom: 16 }}>
          Assembly Bill 1482, officially the <strong>Tenant Protection Act of 2019</strong>, was signed into law by Governor Newsom on October 8, 2019 and took effect January 1, 2020. It is California&apos;s statewide rent cap and just-cause eviction law &mdash; the first of its kind in the state.
        </p>
        <p style={{ fontSize: 16, color: INK_MID, marginBottom: 16 }}>
          The law has two main parts. First, it limits annual rent increases to <strong>5% plus the regional Consumer Price Index (CPI) change, or 10%, whichever is lower</strong>. Second, it requires landlords to have &quot;just cause&quot; to evict tenants who have occupied the unit for 12 months or more. Both protections apply to most residential rental housing in California.
        </p>
        <p style={{ fontSize: 16, color: INK_MID, marginBottom: 16 }}>
          AB 1482 is currently set to <strong>sunset on January 1, 2030</strong>. Multiple bills have been introduced to extend or make the protections permanent, but as of mid-2026 the expiration date remains unchanged. Regardless, landlords must comply with the law through the end of 2029.
        </p>

        {/* Section 2: Who is covered? Who is exempt? */}
        <h2 style={{ fontSize: 24, fontWeight: 700, color: N, marginTop: 40, marginBottom: 12 }}>Who is covered? Who is exempt?</h2>
        <p style={{ fontSize: 16, color: INK_MID, marginBottom: 16 }}>
          AB 1482 applies to most residential rental properties in California, including apartments, condos, townhomes, and single-family homes &mdash; but there are five important exemptions. If your property qualifies for any of these, the rent cap does not apply:
        </p>
        <div style={{ background: BG, border: `1px solid ${BORDER}`, borderRadius: 10, padding: 20, marginBottom: 24 }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12, fontSize: 14, color: INK_MID }}>
            <div><strong>1. New construction (15-year rolling exemption).</strong> Properties with a certificate of occupancy issued within the last 15 years are exempt. For 2026, this means buildings completed after 2011 are exempt. The cutoff rolls forward every year.</div>
            <div><strong>2. Single-family homes &mdash; with notice.</strong> Single-family homes and condos are exempt <em>only if</em> the owner is a natural person (not a corporation, LLC, or REIT) <em>and</em> has provided the tenant with a specific written notice of exemption using the language prescribed by Civil Code 1946.2(g)(1)(A). Without the notice, the exemption does not apply, even if the property otherwise qualifies.</div>
            <div><strong>3. Owner-occupied duplexes.</strong> If you own a duplex and live in one of the units, the other unit is exempt from both the rent cap and just-cause protections.</div>
            <div><strong>4. Deed-restricted affordable housing.</strong> Properties subject to affordability restrictions imposed by a government agency are exempt because they already have separate rent limitations.</div>
            <div><strong>5. Properties already covered by a local rent stabilization ordinance.</strong> If a city or county has its own rent control law that is more restrictive than AB 1482, the local law governs instead. The property is not subject to <em>both</em> laws &mdash; the stricter one wins.</div>
          </div>
        </div>
        <p style={{ fontSize: 16, color: INK_MID, marginBottom: 16 }}>
          The most common mistake landlords make with exemptions is assuming their single-family home is automatically exempt. It is not &mdash; you must deliver the required written notice to your tenant. If you have not done so, your property is treated as covered under AB 1482 retroactively.
        </p>

        {/* Section 3: The maximum allowable increase */}
        <h2 style={{ fontSize: 24, fontWeight: 700, color: N, marginTop: 40, marginBottom: 12 }}>The maximum allowable increase</h2>
        <p style={{ fontSize: 16, color: INK_MID, marginBottom: 16 }}>
          The formula is straightforward: <strong>5% + regional CPI change = maximum increase</strong>, with an absolute ceiling of 10%. The CPI component is based on the April-to-April change in the Consumer Price Index for All Urban Consumers (CPI-U) published by the Bureau of Labor Statistics (BLS).
        </p>
        <p style={{ fontSize: 16, color: INK_MID, marginBottom: 16 }}>
          The applicable CPI rate depends on when the rent increase takes effect. For increases effective between August 1, 2025 and July 31, 2026, you use the April 2024 to April 2025 CPI data. For increases effective August 1, 2026 and later, you use the April 2025 to April 2026 data (released in May 2026).
        </p>

        <h3 style={{ fontSize: 18, fontWeight: 700, color: N, marginTop: 28, marginBottom: 12 }}>2026 CPI rates by region</h3>
        <div style={{ overflowX: 'auto', marginBottom: 24 }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 14, color: INK_MID }}>
            <thead>
              <tr style={{ borderBottom: `2px solid ${BORDER}`, textAlign: 'left' }}>
                <th style={{ padding: '10px 12px', fontWeight: 700, color: N }}>Region</th>
                <th style={{ padding: '10px 12px', fontWeight: 700, color: N }}>CPI (pre-Aug 2026)</th>
                <th style={{ padding: '10px 12px', fontWeight: 700, color: N }}>Max Increase</th>
                <th style={{ padding: '10px 12px', fontWeight: 700, color: N }}>CPI (post-Aug 2026)</th>
                <th style={{ padding: '10px 12px', fontWeight: 700, color: N }}>Max Increase</th>
              </tr>
            </thead>
            <tbody>
              {[
                ['Los Angeles', '3.0%', '8.0%', '3.7%', '8.7%'],
                ['San Francisco', '2.5%', '7.5%', 'Pending', 'Pending'],
                ['Riverside', '3.5%', '8.5%', 'Pending', 'Pending'],
                ['San Diego', '4.0%', '9.0%', 'Pending', 'Pending'],
                ['West Region (fallback)', '2.1%', '7.1%', '3.5%', '8.5%'],
              ].map(([region, cpiPre, maxPre, cpiPost, maxPost], i) => (
                <tr key={i} style={{ borderBottom: `1px solid ${BORDER}` }}>
                  <td style={{ padding: '8px 12px', fontWeight: 600 }}>{region}</td>
                  <td style={{ padding: '8px 12px' }}>{cpiPre}</td>
                  <td style={{ padding: '8px 12px' }}>{maxPre}</td>
                  <td style={{ padding: '8px 12px' }}>{cpiPost}</td>
                  <td style={{ padding: '8px 12px' }}>{maxPost}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <h3 style={{ fontSize: 18, fontWeight: 700, color: N, marginTop: 28, marginBottom: 12 }}>Worked example</h3>
        <p style={{ fontSize: 16, color: INK_MID, marginBottom: 16 }}>
          Suppose you own a covered rental in Los Angeles and the current rent is $2,400/month. You want to raise rent effective September 1, 2026 (post-August, so you use the newer CPI rate of 3.7%).
        </p>
        <div style={{ background: BG, border: `1px solid ${BORDER}`, borderRadius: 10, padding: 20, marginBottom: 24, fontSize: 14, color: INK_MID }}>
          <div style={{ marginBottom: 8 }}><strong>Step 1:</strong> 5% + 3.7% CPI = 8.7%</div>
          <div style={{ marginBottom: 8 }}><strong>Step 2:</strong> Is 8.7% less than 10%? Yes, so 8.7% is your cap.</div>
          <div style={{ marginBottom: 8 }}><strong>Step 3:</strong> $2,400 x 8.7% = $208.80</div>
          <div><strong>Result:</strong> Maximum new rent = <strong>$2,608.80/month</strong></div>
        </div>
        <p style={{ fontSize: 16, color: INK_MID, marginBottom: 16 }}>
          If the CPI had been 6%, the formula would yield 11% &mdash; but the 10% hard cap kicks in, limiting your increase to $240 (10% of $2,400) for a maximum rent of $2,640.
        </p>

        {/* Inline CTA */}
        <div style={{ background: '#E0FAF5', border: '1px solid #00D4AA44', borderRadius: 10, padding: '20px 24px', marginTop: 32, marginBottom: 32 }}>
          <div style={{ fontSize: 16, fontWeight: 700, color: N, marginBottom: 6 }}>Check your max rent increase in 60 seconds</div>
          <div style={{ fontSize: 14, color: INK_MID, marginBottom: 12 }}>Our free AB 1482 calculator uses current BLS data and detects local ordinances automatically.</div>
          <Link href="/tools/ca/ab1482-calculator" style={{ display: 'inline-block', fontSize: 14, fontWeight: 700, color: '#00A886', textDecoration: 'none' }}>
            Use the AB 1482 Calculator &rarr;
          </Link>
        </div>

        {/* Section 4: Notice requirements */}
        <h2 style={{ fontSize: 24, fontWeight: 700, color: N, marginTop: 40, marginBottom: 12 }}>Notice requirements</h2>
        <p style={{ fontSize: 16, color: INK_MID, marginBottom: 16 }}>
          California Civil Code 827 requires landlords to give written notice before any rent increase takes effect. The amount of notice depends on the size of the increase:
        </p>
        <div style={{ background: BG, border: `1px solid ${BORDER}`, borderRadius: 10, padding: 20, marginBottom: 24, fontSize: 14, color: INK_MID }}>
          <div style={{ marginBottom: 8 }}><strong>30-day notice:</strong> Required for increases of 10% or less within a 12-month period.</div>
          <div style={{ marginBottom: 8 }}><strong>90-day notice:</strong> Required for increases exceeding 10% within a 12-month period. (This scenario only arises when combining multiple smaller increases that collectively exceed 10%.)</div>
          <div><strong>Maximum frequency:</strong> Landlords may impose no more than 2 rent increases in any 12-month period, regardless of the individual amounts.</div>
        </div>
        <p style={{ fontSize: 16, color: INK_MID, marginBottom: 16 }}>
          A common trap: if you raise rent by 5% in January and another 6% in July, the combined increase is 11% within 12 months. Even though each individual increase was under 10%, the 90-day notice requirement applies to the second increase because the cumulative amount exceeds 10%. Many landlords miss this.
        </p>
        <p style={{ fontSize: 16, color: INK_MID, marginBottom: 16 }}>
          Notice must be served in writing &mdash; personal delivery, substituted service, or mail (add 5 days for mailing). A text message or email does not constitute valid notice under California law unless the tenant has explicitly agreed to electronic service in writing.
        </p>

        {/* Section 5: Local ordinances */}
        <h2 style={{ fontSize: 24, fontWeight: 700, color: N, marginTop: 40, marginBottom: 12 }}>Local rent control ordinances</h2>
        <p style={{ fontSize: 16, color: INK_MID, marginBottom: 16 }}>
          Several California cities have their own rent stabilization ordinances (RSOs) that are <em>more restrictive</em> than AB 1482. If your property is in one of these jurisdictions, the local cap applies instead of the state cap. Here are the current rates for the most common local ordinances:
        </p>
        <div style={{ overflowX: 'auto', marginBottom: 24 }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 14, color: INK_MID }}>
            <thead>
              <tr style={{ borderBottom: `2px solid ${BORDER}`, textAlign: 'left' }}>
                <th style={{ padding: '10px 12px', fontWeight: 700, color: N }}>City</th>
                <th style={{ padding: '10px 12px', fontWeight: 700, color: N }}>2026 Max Increase</th>
                <th style={{ padding: '10px 12px', fontWeight: 700, color: N }}>Notes</th>
              </tr>
            </thead>
            <tbody>
              {[
                ['Los Angeles (RSO)', '3.0%', 'Applies to buildings built before Oct 1, 1978'],
                ['San Francisco', '1.4%', 'Applies to buildings built before June 13, 1979'],
                ['Oakland', '0.8%', 'Applies to buildings built before Jan 1, 1983'],
                ['Berkeley', '1.0%', 'Applies to most multi-family pre-1980'],
                ['Santa Monica', '2.3%', 'Applies to buildings built before April 10, 1979'],
                ['West Hollywood', '2.25%', 'Applies to buildings built before July 1, 1979'],
                ['San Jose', '2.7%', 'Applies to buildings built before Sept 7, 1979'],
              ].map(([city, rate, notes], i) => (
                <tr key={i} style={{ borderBottom: `1px solid ${BORDER}` }}>
                  <td style={{ padding: '8px 12px', fontWeight: 600 }}>{city}</td>
                  <td style={{ padding: '8px 12px' }}>{rate}</td>
                  <td style={{ padding: '8px 12px' }}>{notes}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p style={{ fontSize: 16, color: INK_MID, marginBottom: 16 }}>
          If your city is not on this list, AB 1482&apos;s statewide cap applies. Note that some cities (like Sacramento and Long Beach) have adopted rent control measures more recently &mdash; check your local jurisdiction for the most current rules.
        </p>

        {/* Section 6: 7 most common mistakes */}
        <h2 style={{ fontSize: 24, fontWeight: 700, color: N, marginTop: 40, marginBottom: 12 }}>7 most common AB 1482 mistakes</h2>
        <p style={{ fontSize: 16, color: INK_MID, marginBottom: 16 }}>
          These are the errors we see landlords make most often. Each one can trigger tenant complaints, lawsuits, or regulatory penalties.
        </p>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 20, marginBottom: 24 }}>
          <div>
            <div style={{ fontSize: 16, fontWeight: 700, color: N }}>1. Assuming a single-family home is automatically exempt</div>
            <p style={{ fontSize: 14, color: INK_MID, marginTop: 4, marginBottom: 0 }}>
              The SFH exemption requires the owner to be a natural person (not an LLC or corporation) <em>and</em> to deliver a specific written notice to the tenant. Without both conditions met, the property is covered. Many landlords discover this after a tenant files a complaint.
            </p>
          </div>
          <div>
            <div style={{ fontSize: 16, fontWeight: 700, color: N }}>2. Using the wrong CPI region</div>
            <p style={{ fontSize: 14, color: INK_MID, marginTop: 4, marginBottom: 0 }}>
              California has multiple BLS metropolitan statistical areas, each with a different CPI. Using the statewide average or the wrong metro area can result in overcharging. A property in Riverside uses the Riverside-San Bernardino-Ontario CPI, not the Los Angeles CPI &mdash; even though they feel close geographically.
            </p>
          </div>
          <div>
            <div style={{ fontSize: 16, fontWeight: 700, color: N }}>3. Forgetting the 10% hard cap</div>
            <p style={{ fontSize: 14, color: INK_MID, marginTop: 4, marginBottom: 0 }}>
              The formula is 5% + CPI, but if CPI is 6% or higher, the result exceeds 10%. The hard cap of 10% always applies. Some landlords calculate 5% + 6% = 11% and raise rent accordingly, which violates the law.
            </p>
          </div>
          <div>
            <div style={{ fontSize: 16, fontWeight: 700, color: N }}>4. Stacking increases to exceed the annual cap</div>
            <p style={{ fontSize: 14, color: INK_MID, marginTop: 4, marginBottom: 0 }}>
              AB 1482 caps the <em>cumulative</em> increase over any 12-month period, not each individual increase. Two 5.5% increases six months apart equal an 11% cumulative increase, which violates the cap. The law allows a maximum of two increases per year, but their combined total cannot exceed the allowable percentage.
            </p>
          </div>
          <div>
            <div style={{ fontSize: 16, fontWeight: 700, color: N }}>5. Giving insufficient notice</div>
            <p style={{ fontSize: 14, color: INK_MID, marginTop: 4, marginBottom: 0 }}>
              The 30-day and 90-day notice requirements are strict. If you mail the notice, you must add 5 calendar days for mailing time. Serving notice on the wrong date can invalidate the rent increase entirely, and the tenant can demand a refund of the overpayment.
            </p>
          </div>
          <div>
            <div style={{ fontSize: 16, fontWeight: 700, color: N }}>6. Not checking for local rent control</div>
            <p style={{ fontSize: 14, color: INK_MID, marginTop: 4, marginBottom: 0 }}>
              A landlord in Los Angeles might calculate an 8.7% increase under AB 1482 and serve notice &mdash; but if the property is covered by the LA RSO (buildings pre-1978), the actual cap is 3%. The stricter local ordinance always controls. Our calculator detects this automatically.
            </p>
          </div>
          <div>
            <div style={{ fontSize: 16, fontWeight: 700, color: N }}>7. Raising rent during a fixed-term lease</div>
            <p style={{ fontSize: 14, color: INK_MID, marginTop: 4, marginBottom: 0 }}>
              AB 1482 does not override lease terms. If a tenant has a fixed-term lease with a specified rent amount, you cannot raise rent until the lease expires (or includes a rent increase provision). The cap only applies to permitted increases &mdash; it does not create a right to increase rent mid-lease.
            </p>
          </div>
        </div>

        {/* Bottom CTA */}
        <div style={{ background: N, borderRadius: 12, padding: '24px 28px', marginTop: 40, marginBottom: 40 }}>
          <div style={{ fontSize: 18, fontWeight: 700, color: '#fff', marginBottom: 6 }}>Calculate your max allowable increase</div>
          <div style={{ fontSize: 14, color: 'rgba(255,255,255,0.75)', marginBottom: 14 }}>Free tool with current 2026 CPI rates, multi-property support, and local ordinance detection.</div>
          <Link href="/tools/ca/ab1482-calculator" style={{ display: 'inline-block', background: TEAL, color: N, padding: '10px 22px', borderRadius: 8, fontSize: 14, fontWeight: 700, textDecoration: 'none' }}>
            Use the AB 1482 Calculator &rarr;
          </Link>
        </div>

        {/* Section 7: What's next */}
        <h2 style={{ fontSize: 24, fontWeight: 700, color: N, marginTop: 40, marginBottom: 12 }}>What&apos;s next</h2>
        <p style={{ fontSize: 16, color: INK_MID, marginBottom: 16 }}>
          AB 1482 is just one piece of California&apos;s landlord compliance puzzle. Here are related topics every California landlord should understand:
        </p>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 16, fontSize: 15 }}>
          <span style={{ color: INK_MID }}><strong>Just-cause eviction:</strong> The other half of AB 1482. Landlords must have one of 12 qualifying reasons to terminate a tenancy after 12 months of occupancy. Penalties for wrongful eviction include relocation assistance and statutory damages.</span>
          <span style={{ color: INK_MID }}><strong>AB 2801 move-out inspections:</strong> Effective 2025, this law expanded requirements for pre-move-out and move-out inspections, including itemized statements and photo documentation. <Link href="/inspections" style={{ color: '#00A886', fontWeight: 600, textDecoration: 'none' }}>Try our free inspection tool &rarr;</Link></span>
          <span style={{ color: INK_MID }}><strong>Security deposit laws:</strong> California now limits security deposits to one month&apos;s rent (AB 12, effective July 2024). <Link href="/blog/security-deposit-laws" style={{ color: '#00A886', fontWeight: 600, textDecoration: 'none' }}>Read our guide &rarr;</Link></span>
        </div>

        <h2 style={{ fontSize: 24, fontWeight: 700, color: N, marginTop: 40, marginBottom: 12 }}>Related articles</h2>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 20 }}>
          <Link href="/blog/security-deposit-laws" style={{ fontSize: 15, color: '#00A886', fontWeight: 600, textDecoration: 'none' }}>&rarr; Security Deposit Laws: What Every Landlord Needs to Know</Link>
          <Link href="/blog/security-deposit-deductions" style={{ fontSize: 15, color: '#00A886', fontWeight: 600, textDecoration: 'none' }}>&rarr; Security Deposit Deductions: What Landlords Can (and Can&apos;t) Charge For</Link>
          <Link href="/blog/free-lease-agreement-template" style={{ fontSize: 15, color: '#00A886', fontWeight: 600, textDecoration: 'none' }}>&rarr; Free Lease Agreement Template for Small Landlords (2026)</Link>
        </div>

        <div style={{ marginTop: 60, padding: 32, background: N, borderRadius: 12, textAlign: 'center' }}>
          <h3 style={{ fontSize: 22, fontWeight: 700, color: '#fff', marginBottom: 8 }}>Stay compliant without the guesswork</h3>
          <p style={{ fontSize: 14, color: 'rgba(255,255,255,0.8)', marginBottom: 20 }}>
            Keywise tracks rent caps, notice deadlines, and local ordinances for every property in your portfolio. Free for up to 2 units.
          </p>
          <Link href="/" style={{ display: 'inline-block', background: TEAL, color: N, padding: '14px 32px', borderRadius: 10, fontSize: 15, fontWeight: 700, textDecoration: 'none' }}>
            Try Keywise free &rarr;
          </Link>
        </div>
      </article>

      {/* FAQ structured data */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify({
            '@context': 'https://schema.org',
            '@type': 'FAQPage',
            mainEntity: [
              { '@type': 'Question', name: 'What is the AB 1482 rent cap for 2026?', acceptedAnswer: { '@type': 'Answer', text: 'The AB 1482 rent cap for 2026 is 5% plus the regional CPI change, with a maximum of 10%. For Los Angeles, the cap is 8.7% (post-August 2026). The exact percentage depends on your property\'s BLS region.' } },
              { '@type': 'Question', name: 'Is my single-family home exempt from AB 1482?', acceptedAnswer: { '@type': 'Answer', text: 'Single-family homes are exempt only if the owner is a natural person (not an LLC or corporation) AND has delivered a specific written notice of exemption to the tenant. Without the notice, the property is covered.' } },
              { '@type': 'Question', name: 'How much notice do I need to give for a rent increase in California?', acceptedAnswer: { '@type': 'Answer', text: '30 days for increases of 10% or less within a 12-month period. 90 days for increases exceeding 10%. Add 5 days if serving by mail.' } },
              { '@type': 'Question', name: 'What happens if I raise rent above the AB 1482 cap?', acceptedAnswer: { '@type': 'Answer', text: 'Tenants can sue for actual damages, punitive damages, and attorney fees. In bad-faith cases, courts have awarded up to a full year\'s rent in damages. The excess amount must be refunded.' } },
              { '@type': 'Question', name: 'Does local rent control override AB 1482?', acceptedAnswer: { '@type': 'Answer', text: 'Yes. If your city has a rent stabilization ordinance with a lower cap than AB 1482, the stricter local rate applies. For example, Los Angeles RSO caps increases at 3%, which is lower than the AB 1482 statewide cap.' } },
              { '@type': 'Question', name: 'When does AB 1482 expire?', acceptedAnswer: { '@type': 'Answer', text: 'AB 1482 is set to expire January 1, 2030. Legislation to extend or make the protections permanent has been proposed but not enacted as of 2026.' } },
              { '@type': 'Question', name: 'Can I raise rent more than once per year under AB 1482?', acceptedAnswer: { '@type': 'Answer', text: 'You can impose up to 2 rent increases in any 12-month period, but their combined total cannot exceed the maximum allowable percentage (5% + CPI, capped at 10%).' } },
            ],
          }),
        }}
      />
    </div>
  );
}
