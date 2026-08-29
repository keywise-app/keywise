import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'California Landlord Compliance Tools | Keywise',
  description:
    'Free tools to keep your California landlord practice legally sound. AB 1482 rent cap calculator, just-cause eviction notice builder, AB 2801 move-out inspections, and more — with statutory citations built in.',
  alternates: { canonical: 'https://keywise.app/compliance' },
  openGraph: {
    title: 'California Landlord Compliance Tools | Keywise',
    description:
      'Free tools to keep your California landlord practice legally sound. AB 1482, just-cause evictions, AB 2801 inspections — with statutory citations built in.',
    url: 'https://keywise.app/compliance',
    siteName: 'Keywise',
    type: 'website',
    images: [{ url: '/og-image.png', width: 1200, height: 628 }],
  },
  robots: { index: true, follow: true },
};

export default function CompliancePage() {
  return (
    <div style={{ fontFamily: "'Inter', system-ui, sans-serif", background: '#F0F4FF', minHeight: '100vh' }}>
      <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap" rel="stylesheet" />
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
        <a href="/" style={{ color: '#fff', fontSize: 13, textDecoration: 'none', opacity: 0.7 }}>← Dashboard</a>
      </nav>

      <div style={{ maxWidth: 860, margin: '0 auto', padding: '48px 24px 80px' }}>
        <h1 style={{ fontSize: 36, fontWeight: 800, color: '#0F3460', margin: '0 0 8px', letterSpacing: '-0.8px' }}>Compliance Tools</h1>
        <p style={{ fontSize: 16, color: '#4A5068', margin: '0 0 40px', lineHeight: 1.65 }}>
          California-specific tools to keep your landlord practice legally sound.
        </p>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 20 }}>
          {/* Active: AB 1482 */}
          <a href="/tools/ca/ab1482-calculator" style={{ textDecoration: 'none' }}>
            <div style={{ background: '#fff', border: '1px solid #E0E6F0', borderRadius: 16, padding: 28, cursor: 'pointer', transition: 'all 0.15s', boxShadow: '0 2px 8px rgba(15,52,96,0.06)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 16 }}>
                <div style={{ fontSize: 36 }}>📊</div>
                <span style={{ background: '#E0FAF5', color: '#00A886', fontSize: 11, fontWeight: 700, padding: '3px 10px', borderRadius: 20, textTransform: 'uppercase', letterSpacing: '0.4px' }}>Active</span>
              </div>
              <div style={{ fontWeight: 700, fontSize: 17, color: '#0F3460', marginBottom: 8 }}>AB 1482 Rent Cap Calculator</div>
              <div style={{ fontSize: 14, color: '#4A5068', lineHeight: 1.65, marginBottom: 16 }}>
                Calculate the maximum legal rent increase for any California property. Auto-applies CPI by region. Checks exemptions.
              </div>
              <div style={{ fontSize: 13, color: '#00A886', fontWeight: 600 }}>Run calculator →</div>
            </div>
          </a>

          <a href="/compliance/rent-calculations" style={{ textDecoration: 'none' }}>
            <div style={{ background: '#fff', border: '1px solid #E0E6F0', borderRadius: 16, padding: 28, cursor: 'pointer', transition: 'all 0.15s', boxShadow: '0 2px 8px rgba(15,52,96,0.06)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 16 }}>
                <div style={{ fontSize: 36 }}>📋</div>
                <span style={{ background: '#E0FAF5', color: '#00A886', fontSize: 11, fontWeight: 700, padding: '3px 10px', borderRadius: 20, textTransform: 'uppercase', letterSpacing: '0.4px' }}>Active</span>
              </div>
              <div style={{ fontWeight: 700, fontSize: 17, color: '#0F3460', marginBottom: 8 }}>Rent Calculation History</div>
              <div style={{ fontSize: 14, color: '#4A5068', lineHeight: 1.65, marginBottom: 16 }}>
                All your saved AB 1482 calculations in one place. Per-property compliance record.
              </div>
              <div style={{ fontSize: 13, color: '#00A886', fontWeight: 600 }}>View history →</div>
            </div>
          </a>

          {/* Active: Just-Cause Eviction Notice Builder */}
          <a href="/tools/ca/eviction-notice" style={{ textDecoration: 'none' }}>
            <div style={{ background: '#fff', border: '1px solid #E0E6F0', borderRadius: 16, padding: 28, cursor: 'pointer', transition: 'all 0.15s', boxShadow: '0 2px 8px rgba(15,52,96,0.06)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 16 }}>
                <div style={{ fontSize: 36 }}>⚖️</div>
                <span style={{ background: '#E0FAF5', color: '#00A886', fontSize: 11, fontWeight: 700, padding: '3px 10px', borderRadius: 20, textTransform: 'uppercase', letterSpacing: '0.4px' }}>Active</span>
              </div>
              <div style={{ fontWeight: 700, fontSize: 17, color: '#0F3460', marginBottom: 8 }}>Just-Cause Eviction Notice Builder</div>
              <div style={{ fontSize: 14, color: '#4A5068', lineHeight: 1.65, marginBottom: 16 }}>
                Generate any California 3-day, 30-day, or 60-day eviction notice with built-in defect checking, statutory citations, and just-cause eligibility rules.
              </div>
              <div style={{ fontSize: 13, color: '#00A886', fontWeight: 600 }}>Open notice builder →</div>
            </div>
          </a>

          {/* Active: AB 2801 Move-Out Inspections */}
          <a href="/inspections" style={{ textDecoration: 'none' }}>
            <div style={{ background: '#fff', border: '1px solid #E0E6F0', borderRadius: 16, padding: 28, cursor: 'pointer', transition: 'all 0.15s', boxShadow: '0 2px 8px rgba(15,52,96,0.06)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 16 }}>
                <div style={{ fontSize: 36 }}>🔍</div>
                <span style={{ background: '#E0FAF5', color: '#00A886', fontSize: 11, fontWeight: 700, padding: '3px 10px', borderRadius: 20, textTransform: 'uppercase', letterSpacing: '0.4px' }}>Active</span>
              </div>
              <div style={{ fontWeight: 700, fontSize: 17, color: '#0F3460', marginBottom: 8 }}>AB 2801 Move-Out Inspections</div>
              <div style={{ fontSize: 14, color: '#4A5068', lineHeight: 1.65, marginBottom: 16 }}>
                Document move-out condition with photo evidence. Generates the required inspection report and 21-day itemized deposit accounting.
              </div>
              <div style={{ fontSize: 13, color: '#00A886', fontWeight: 600 }}>Start inspection →</div>
            </div>
          </a>

          {/* Guide (tool coming soon): Security Deposit 21-Day Rule */}
          <a href="/tools/ca/security-deposit-21-day" style={{ textDecoration: 'none' }}>
            <div style={{ background: '#fff', border: '1px solid #E0E6F0', borderRadius: 16, padding: 28, cursor: 'pointer', transition: 'all 0.15s', boxShadow: '0 2px 8px rgba(15,52,96,0.06)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 16 }}>
                <div style={{ fontSize: 36 }}>💰</div>
                <span style={{ background: '#FFF8E0', color: '#9A6500', fontSize: 11, fontWeight: 700, padding: '3px 10px', borderRadius: 20, textTransform: 'uppercase', letterSpacing: '0.4px' }}>Guide · tool soon</span>
              </div>
              <div style={{ fontWeight: 700, fontSize: 17, color: '#0F3460', marginBottom: 8 }}>Security Deposit 21-Day Rule</div>
              <div style={{ fontSize: 14, color: '#4A5068', lineHeight: 1.65, marginBottom: 16 }}>
                Plain-English guide to Civil Code § 1950.5, AB 2801 photo requirements, allowable deductions, and the 2x-deposit penalty for missing the 21-day deadline.
              </div>
              <div style={{ fontSize: 13, color: '#9A6500', fontWeight: 600 }}>Read the guide →</div>
            </div>
          </a>
        </div>
      </div>
    </div>
  );
}
