import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Compliance Tools | Keywise',
  robots: { index: false },
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

          {/* Coming soon tools */}
          {[
            { icon: '⚖️', title: 'Just-Cause Eviction Notice Builder', desc: 'Generate the correct eviction notice for any AB 1482 just-cause reason. Checks eligibility, fills in required language.' },
            { icon: '🔍', title: 'AB 2801 Move-Out Inspections', desc: 'Document move-out condition with photo evidence. Generate the required inspection report and 21-day deposit accounting.' },
            { icon: '💰', title: 'Security Deposit 21-Day Rule', desc: 'Track your 21-day deadline to return deposits. Auto-calculates allowable deductions. Generates the itemization letter.' },
          ].map(tool => (
            <div key={tool.title} style={{ background: '#fff', border: '1px solid #E0E6F0', borderRadius: 16, padding: 28, opacity: 0.6, boxShadow: '0 2px 8px rgba(15,52,96,0.06)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 16 }}>
                <div style={{ fontSize: 36 }}>{tool.icon}</div>
                <span style={{ background: '#F0F4FF', color: '#8892A4', fontSize: 11, fontWeight: 700, padding: '3px 10px', borderRadius: 20, textTransform: 'uppercase', letterSpacing: '0.4px' }}>Coming Soon</span>
              </div>
              <div style={{ fontWeight: 700, fontSize: 17, color: '#0F3460', marginBottom: 8 }}>{tool.title}</div>
              <div style={{ fontSize: 14, color: '#4A5068', lineHeight: 1.65 }}>{tool.desc}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
