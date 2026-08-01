'use client';
import { useState } from 'react';

const N = '#0F3460';
const TEAL = '#00D4AA';
const TEAL_DARK = '#00A886';
const TEAL_LIGHT = '#E0FAF5';
const BG = '#F0F4FF';
const SURFACE = '#FFFFFF';
const BORDER = '#E0E6F0';
const INK = '#1A1A2E';
const INK_MID = '#4A5068';
const INK_MUTED = '#8892A4';
const CORAL = '#FF6B6B';
const CORAL_LIGHT = '#FFF0F0';

// CPI values by region (2025-2026 approximate)
const CPI_BY_REGION: Record<string, number> = {
  'los-angeles': 4.0,
  'bay-area': 3.7,
  'san-diego': 3.8,
  'other-ca': 3.5,
};

const REGION_LABELS: Record<string, string> = {
  'los-angeles': 'Los Angeles / Southern California',
  'bay-area': 'Bay Area (SF, Oakland, San Jose)',
  'san-diego': 'San Diego Area',
  'other-ca': 'Other California',
};

interface CalcInputs {
  currentRent: string;
  lastIncreaseDate: string;
  yearBuilt: string;
  propertyType: string;
  ownershipType: string;
  exemptionNoticeGiven: string;
  region: string;
}

interface CalcResult {
  isExempt: boolean;
  exemptionReason?: string;
  cpi: number;
  maxIncreasePercent: number;
  maxIncreaseDollar: number;
  maxNewRent: number;
  noticeRequired: string;
  currentRent: number;
}

function isExemptBuilding(yearBuilt: string): boolean {
  const year = parseInt(yearBuilt);
  if (isNaN(year)) return false;
  // 15-year rolling window: 2026 - 15 = 2011
  return year > (new Date().getFullYear() - 15);
}

function calculate(inputs: CalcInputs): CalcResult | null {
  const currentRent = parseFloat(inputs.currentRent);
  if (isNaN(currentRent) || currentRent <= 0) return null;

  const cpi = CPI_BY_REGION[inputs.region] || 3.5;

  // Check exemptions
  if (inputs.yearBuilt && isExemptBuilding(inputs.yearBuilt)) {
    return {
      isExempt: true,
      exemptionReason: `Building built in ${inputs.yearBuilt} is less than 15 years old and exempt from AB 1482 rent caps.`,
      cpi,
      maxIncreasePercent: 0,
      maxIncreaseDollar: 0,
      maxNewRent: 0,
      noticeRequired: 'N/A — exempt from AB 1482 cap (notice still required)',
      currentRent,
    };
  }

  if (
    (inputs.propertyType === 'sfh' || inputs.propertyType === 'condo') &&
    (inputs.ownershipType === 'individual') &&
    inputs.exemptionNoticeGiven === 'yes'
  ) {
    return {
      isExempt: true,
      exemptionReason: 'Single-family home / condo owned by an individual with written exemption notice given to tenant — exempt from AB 1482 rent cap.',
      cpi,
      maxIncreasePercent: 0,
      maxIncreaseDollar: 0,
      maxNewRent: 0,
      noticeRequired: 'N/A — exempt from AB 1482 cap (notice still required)',
      currentRent,
    };
  }

  if (inputs.propertyType === 'owner-occupied-small') {
    return {
      isExempt: true,
      exemptionReason: 'Owner-occupied duplex, triplex, or fourplex — exempt from AB 1482 rent cap.',
      cpi,
      maxIncreasePercent: 0,
      maxIncreaseDollar: 0,
      maxNewRent: 0,
      noticeRequired: 'N/A — exempt from AB 1482 cap (notice still required)',
      currentRent,
    };
  }

  // Covered by AB 1482
  const rawMax = 5 + cpi;
  const maxIncreasePercent = Math.min(rawMax, 10);
  const maxIncreaseDollar = Math.round(currentRent * (maxIncreasePercent / 100) * 100) / 100;
  const maxNewRent = Math.round((currentRent + maxIncreaseDollar) * 100) / 100;
  const noticeRequired = maxIncreasePercent >= 10 ? '90-day written notice required' : '30-day written notice required';

  return {
    isExempt: false,
    cpi,
    maxIncreasePercent,
    maxIncreaseDollar,
    maxNewRent,
    noticeRequired,
    currentRent,
  };
}

export default function AB1482Calculator() {
  const [inputs, setInputs] = useState<CalcInputs>({
    currentRent: '',
    lastIncreaseDate: '',
    yearBuilt: '',
    propertyType: '',
    ownershipType: 'individual',
    exemptionNoticeGiven: 'no',
    region: 'los-angeles',
  });
  const [result, setResult] = useState<CalcResult | null>(null);
  const [email, setEmail] = useState('');
  const [emailLoading, setEmailLoading] = useState(false);
  const [emailSent, setEmailSent] = useState(false);
  const [emailError, setEmailError] = useState('');
  const [calculated, setCalculated] = useState(false);

  const set = (k: keyof CalcInputs, v: string) => setInputs(prev => ({ ...prev, [k]: v }));

  const handleCalculate = () => {
    const r = calculate(inputs);
    setResult(r);
    setCalculated(true);
    setEmailSent(false);
    setEmailError('');
  };

  const handleSendNotice = async () => {
    if (!email) { setEmailError('Please enter your email address.'); return; }
    setEmailLoading(true);
    setEmailError('');
    try {
      const res = await fetch('/api/ab1482-notice', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email,
          address: '',
          currentRent: result?.currentRent,
          newRent: result?.maxNewRent,
          increasePercent: result?.maxIncreasePercent,
          effectiveDate: new Date(Date.now() + 60 * 24 * 60 * 60 * 1000).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' }),
          noticeDate: new Date().toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' }),
          region: REGION_LABELS[inputs.region],
          inputs,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to send');
      setEmailSent(true);
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : 'Failed to send. Please try again.';
      setEmailError(msg);
    } finally {
      setEmailLoading(false);
    }
  };

  const inputStyle = {
    width: '100%',
    background: BG,
    border: `1px solid ${BORDER}`,
    borderRadius: 10,
    padding: '11px 14px',
    fontSize: 14,
    fontFamily: 'inherit',
    color: INK,
    outline: 'none',
    boxSizing: 'border-box' as const,
  };

  const labelStyle = {
    fontSize: 11,
    color: INK_MUTED,
    fontWeight: 700,
    textTransform: 'uppercase' as const,
    letterSpacing: '0.4px',
    display: 'block',
    marginBottom: 6,
  };

  return (
    <div>
      {/* Calculator Card */}
      <div style={{ background: SURFACE, borderRadius: 20, border: `1px solid ${BORDER}`, padding: 32, boxShadow: '0 4px 24px rgba(15,52,96,0.10)', marginBottom: 24 }}>
        <div style={{ fontWeight: 700, fontSize: 18, color: N, marginBottom: 24 }}>Calculate Your Maximum Rent Increase</div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 16 }}>
          <div>
            <label style={labelStyle}>Current Monthly Rent ($)</label>
            <input type="number" min="0" placeholder="e.g. 2200" value={inputs.currentRent}
              onChange={e => set('currentRent', e.target.value)} style={inputStyle} />
          </div>
          <div>
            <label style={labelStyle}>Year Property Was Built</label>
            <input type="number" min="1900" max="2026" placeholder="e.g. 1998" value={inputs.yearBuilt}
              onChange={e => set('yearBuilt', e.target.value)} style={inputStyle} />
          </div>
          <div>
            <label style={labelStyle}>Date of Last Rent Increase</label>
            <input type="date" value={inputs.lastIncreaseDate}
              onChange={e => set('lastIncreaseDate', e.target.value)} style={inputStyle} />
          </div>
          <div>
            <label style={labelStyle}>Region</label>
            <select value={inputs.region} onChange={e => set('region', e.target.value)} style={inputStyle}>
              {Object.entries(REGION_LABELS).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
            </select>
          </div>
          <div>
            <label style={labelStyle}>Property Type</label>
            <select value={inputs.propertyType} onChange={e => set('propertyType', e.target.value)} style={inputStyle}>
              <option value="">Select type...</option>
              <option value="multi-family">Multi-family building (5+ units)</option>
              <option value="sfh">Single-family home</option>
              <option value="condo">Condo / Townhouse</option>
              <option value="owner-occupied-small">Owner-occupied duplex / triplex / fourplex</option>
              <option value="mobile-home">Mobile home park</option>
            </select>
          </div>
          <div>
            <label style={labelStyle}>Ownership Type</label>
            <select value={inputs.ownershipType} onChange={e => set('ownershipType', e.target.value)} style={inputStyle}>
              <option value="individual">Individual / natural person</option>
              <option value="llc">LLC</option>
              <option value="corporation">Corporation</option>
              <option value="reit">REIT</option>
              <option value="trust">Trust</option>
            </select>
          </div>
        </div>

        {(inputs.propertyType === 'sfh' || inputs.propertyType === 'condo') && inputs.ownershipType === 'individual' && (
          <div style={{ marginTop: 16 }}>
            <label style={labelStyle}>Did you give the tenant a written AB 1482 exemption notice?</label>
            <div style={{ display: 'flex', gap: 12 }}>
              {(['yes', 'no'] as const).map(v => (
                <label key={v} style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 14, color: INK, cursor: 'pointer' }}>
                  <input type="radio" name="exemption" value={v} checked={inputs.exemptionNoticeGiven === v}
                    onChange={() => set('exemptionNoticeGiven', v)} />
                  {v === 'yes' ? 'Yes, I gave written notice' : 'No, I did not'}
                </label>
              ))}
            </div>
          </div>
        )}

        <button onClick={handleCalculate} disabled={!inputs.currentRent || !inputs.propertyType}
          style={{
            marginTop: 24, background: !inputs.currentRent || !inputs.propertyType ? '#ccc' : N,
            color: '#fff', border: 'none', borderRadius: 12, padding: '14px 32px',
            fontSize: 15, fontWeight: 700, cursor: !inputs.currentRent || !inputs.propertyType ? 'default' : 'pointer',
            fontFamily: 'inherit', width: '100%',
          }}>
          Calculate Maximum Rent Increase →
        </button>
      </div>

      {/* Results */}
      {calculated && result && (
        <div style={{ background: SURFACE, borderRadius: 20, border: `1px solid ${BORDER}`, padding: 32, boxShadow: '0 4px 24px rgba(15,52,96,0.10)' }}>
          {result.isExempt ? (
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16 }}>
                <div style={{ fontSize: 36 }}>🏠</div>
                <div>
                  <div style={{ fontWeight: 700, fontSize: 20, color: N }}>This property appears to be exempt</div>
                  <div style={{ fontSize: 14, color: INK_MID, marginTop: 4 }}>AB 1482 rent caps do not apply</div>
                </div>
              </div>
              <div style={{ background: '#FFF8E0', border: '1px solid #F0C000', borderRadius: 12, padding: '16px 20px', fontSize: 14, color: '#7A5500', lineHeight: 1.65, marginBottom: 16 }}>
                ⚠️ <strong>Exemption:</strong> {result.exemptionReason}
              </div>
              <div style={{ fontSize: 14, color: INK_MID, lineHeight: 1.65 }}>
                Note: Even if your property is exempt from the AB 1482 rent cap, California Civil Code 827 still requires you to serve proper written notice of any rent increase (30 days for increases under 10%, 90 days for 10% or more). Local rent control ordinances may also still apply in your city.
              </div>
            </div>
          ) : (
            <div>
              <div style={{ fontWeight: 700, fontSize: 20, color: N, marginBottom: 24 }}>Results for Your Property</div>

              {/* Big number */}
              <div style={{ background: `linear-gradient(135deg, ${TEAL_LIGHT}, #F0F4FF)`, border: `1px solid ${TEAL}33`, borderRadius: 16, padding: '24px 28px', marginBottom: 24, textAlign: 'center' }}>
                <div style={{ fontSize: 13, color: TEAL_DARK, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.6px', marginBottom: 8 }}>Maximum Legal New Rent</div>
                <div style={{ fontSize: 52, fontWeight: 800, color: N, letterSpacing: '-2px' }}>${result.maxNewRent.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</div>
                <div style={{ fontSize: 14, color: INK_MID, marginTop: 8 }}>per month</div>
              </div>

              {/* Math breakdown table */}
              <table style={{ width: '100%', borderCollapse: 'collapse', marginBottom: 24 }}>
                <tbody>
                  {[
                    ['Current rent', `$${result.currentRent.toLocaleString('en-US', { minimumFractionDigits: 2 })}`],
                    ['Local CPI', `${result.cpi}%`],
                    ['Maximum increase (5% + CPI, capped at 10%)', `${result.maxIncreasePercent}%`],
                    ['Maximum increase amount', `$${result.maxIncreaseDollar.toLocaleString('en-US', { minimumFractionDigits: 2 })}`],
                    ['Maximum legal new rent', `$${result.maxNewRent.toLocaleString('en-US', { minimumFractionDigits: 2 })}`],
                  ].map(([label, value], i) => (
                    <tr key={label} style={{ borderBottom: `1px solid ${BORDER}`, background: i === 4 ? '#F0FDF4' : 'transparent' }}>
                      <td style={{ padding: '12px 16px', fontSize: 14, color: i === 4 ? '#0F7040' : INK_MID, fontWeight: i === 4 ? 700 : 400 }}>{label}</td>
                      <td style={{ padding: '12px 16px', fontSize: 14, color: i === 4 ? '#0F7040' : N, fontWeight: 700, textAlign: 'right' }}>{value}</td>
                    </tr>
                  ))}
                </tbody>
              </table>

              {/* Notice requirement */}
              <div style={{ background: '#F0F4FF', border: `1px solid ${N}22`, borderRadius: 12, padding: '16px 20px', marginBottom: 24 }}>
                <div style={{ fontSize: 13, fontWeight: 700, color: N, marginBottom: 4 }}>⚖️ Notice Requirement</div>
                <div style={{ fontSize: 14, color: INK_MID, lineHeight: 1.6 }}>{result.noticeRequired}. California Civil Code Section 827.</div>
              </div>

              {/* Email capture */}
              <div style={{ borderTop: `1px solid ${BORDER}`, paddingTop: 24 }}>
                <div style={{ fontWeight: 700, fontSize: 16, color: N, marginBottom: 8 }}>Get the official rent increase notice</div>
                <div style={{ fontSize: 14, color: INK_MID, marginBottom: 16, lineHeight: 1.6 }}>
                  We&apos;ll generate a professionally formatted notice ready to serve to your tenant, and send it to your inbox. Free.
                </div>
                {emailSent ? (
                  <div style={{ background: '#F0FDF4', border: '1px solid #86EFAC', borderRadius: 10, padding: '14px 16px', fontSize: 14, color: '#166534' }}>
                    ✓ Sent to {email}. Check your inbox — the notice is attached as a PDF.
                  </div>
                ) : (
                  <div>
                    <div style={{ display: 'flex', gap: 8 }}>
                      <input type="email" placeholder="you@email.com" value={email} onChange={e => setEmail(e.target.value)}
                        onKeyDown={e => e.key === 'Enter' && handleSendNotice()}
                        style={{ flex: 1, background: BG, border: `1px solid ${BORDER}`, borderRadius: 10, padding: '11px 14px', fontSize: 14, fontFamily: 'inherit', color: INK, outline: 'none' }} />
                      <button onClick={handleSendNotice} disabled={emailLoading}
                        style={{ background: TEAL, color: N, border: 'none', borderRadius: 10, padding: '11px 20px', fontSize: 14, fontWeight: 700, cursor: emailLoading ? 'default' : 'pointer', fontFamily: 'inherit', whiteSpace: 'nowrap', opacity: emailLoading ? 0.7 : 1 }}>
                        {emailLoading ? 'Sending…' : 'Send Me the Notice →'}
                      </button>
                    </div>
                    {emailError && (
                      <div style={{ background: CORAL_LIGHT, border: `1px solid ${CORAL}33`, borderRadius: 8, padding: '8px 12px', fontSize: 13, color: CORAL, marginTop: 8 }}>
                        {emailError}
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      )}

      {calculated && !result && (
        <div style={{ background: CORAL_LIGHT, border: `1px solid ${CORAL}33`, borderRadius: 12, padding: '16px 20px', fontSize: 14, color: CORAL }}>
          Please enter a valid current rent amount to calculate.
        </div>
      )}
    </div>
  );
}
