'use client';

import { useState } from 'react';
import { calculateAB1482, AB1482Input } from '../../../../lib/compliance/ca/ab1482-calculator';
import { RentCapResult } from '../../../../lib/compliance/types';
import ComplianceSaveButton from './ComplianceSaveButton';

const N = '#0F3460';
const TEAL = '#00D4AA';
const TEAL_DARK = '#00A886';
const TEAL_LIGHT = '#E0FAF5';
const BG = '#F0F4FF';
const BORDER = '#E0E6F0';
const INK = '#1A1A2E';
const INK_MID = '#4A5068';
const INK_MUTED = '#8892A4';
const CORAL = '#FF6B6B';
const GREEN_LIGHT = '#E8F8F0';
const GREEN_DARK = '#00875A';

const inputStyle = {
  width: '100%',
  boxSizing: 'border-box' as const,
  border: `1.5px solid ${BORDER}`,
  borderRadius: 10,
  padding: '11px 14px',
  fontSize: 15,
  color: INK,
  fontFamily: 'inherit',
  outline: 'none',
  background: '#fff',
};

const labelStyle = {
  display: 'block' as const,
  fontSize: 13,
  fontWeight: 600 as const,
  color: N,
  marginBottom: 6,
};

const selectStyle = { ...inputStyle, appearance: 'none' as const, backgroundImage: `url("data:image/svg+xml,%3Csvg width='10' height='6' viewBox='0 0 10 6' xmlns='http://www.w3.org/2000/svg'%3E%3Cpath d='M1 1l4 4 4-4' stroke='%238892A4' fill='none' stroke-width='1.5'/%3E%3C/svg%3E")`, backgroundRepeat: 'no-repeat', backgroundPosition: 'right 14px center' };

export default function CalculatorForm() {
  const [step, setStep] = useState<'eligibility' | 'calculate' | 'result'>('eligibility');
  const [result, setResult] = useState<RentCapResult | null>(null);

  // Form state
  const [zipCode, setZipCode] = useState('');
  const [yearBuilt, setYearBuilt] = useState('');
  const [propertyType, setPropertyType] = useState<AB1482Input['propertyType']>('multifamily');
  const [ownerType, setOwnerType] = useState<AB1482Input['ownerType']>('individual');
  const [exemptionNotice, setExemptionNotice] = useState<boolean | undefined>(undefined);
  const [currentRent, setCurrentRent] = useState('');
  const [effectiveDate, setEffectiveDate] = useState('');
  const [lastIncreaseDate, setLastIncreaseDate] = useState('');
  const [lastIncreaseAmount, setLastIncreaseAmount] = useState('');
  const [isFirstIncrease, setIsFirstIncrease] = useState(false);

  const showExemptionNotice = propertyType === 'single-family' || propertyType === 'condo';

  function handleCheckEligibility() {
    const input: AB1482Input = {
      zipCode,
      yearBuilt: parseInt(yearBuilt, 10) || 0,
      propertyType,
      ownerType,
      exemptionNoticeGiven: showExemptionNotice ? exemptionNotice : undefined,
      currentRent: 0,
      effectiveDate: new Date().toISOString().split('T')[0],
    };
    const r = calculateAB1482(input);
    if (!r.eligible) {
      setResult(r);
      setStep('result');
    } else {
      setStep('calculate');
    }
  }

  function handleCalculate() {
    const input: AB1482Input = {
      zipCode,
      yearBuilt: parseInt(yearBuilt, 10) || 0,
      propertyType,
      ownerType,
      exemptionNoticeGiven: showExemptionNotice ? exemptionNotice : undefined,
      currentRent: parseFloat(currentRent.replace(/[^0-9.]/g, '')) || 0,
      effectiveDate: effectiveDate || new Date().toISOString().split('T')[0],
      lastIncreaseDate: isFirstIncrease ? null : (lastIncreaseDate || null),
      lastIncreaseAmount: isFirstIncrease ? null : (parseFloat(lastIncreaseAmount) || null),
    };
    const r = calculateAB1482(input);
    setResult(r);
    setStep('result');
  }

  function handleReset() {
    setStep('eligibility');
    setResult(null);
  }

  return (
    <div style={{ maxWidth: 620, margin: '0 auto' }}>

      {/* STEP 1: ELIGIBILITY */}
      {step === 'eligibility' && (
        <div style={{ background: '#fff', border: `1px solid ${BORDER}`, borderRadius: 14, padding: 28 }}>
          <div style={{ fontSize: 18, fontWeight: 700, color: N, marginBottom: 4 }}>Step 1: Check eligibility</div>
          <p style={{ fontSize: 13, color: INK_MUTED, marginBottom: 24 }}>
            Not all California rental properties are covered by AB 1482. Let&apos;s check yours.
          </p>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
            <div>
              <label style={labelStyle}>Property zip code *</label>
              <input style={inputStyle} type="text" inputMode="numeric" maxLength={5} placeholder="e.g. 92629" value={zipCode} onChange={e => setZipCode(e.target.value.replace(/\D/g, ''))} />
            </div>

            <div>
              <label style={labelStyle}>Year built *</label>
              <input style={inputStyle} type="text" inputMode="numeric" maxLength={4} placeholder="e.g. 1995" value={yearBuilt} onChange={e => setYearBuilt(e.target.value.replace(/\D/g, ''))} />
            </div>

            <div>
              <label style={labelStyle}>Property type *</label>
              <select style={selectStyle} value={propertyType} onChange={e => setPropertyType(e.target.value as AB1482Input['propertyType'])}>
                <option value="multifamily">Multifamily (3+ units)</option>
                <option value="duplex">Duplex (not owner-occupied)</option>
                <option value="duplex-owner-occupied">Duplex (I live in one unit)</option>
                <option value="single-family">Single-family home</option>
                <option value="condo">Condo / Townhouse</option>
                <option value="mobile-home">Mobile home</option>
              </select>
            </div>

            <div>
              <label style={labelStyle}>Owner type *</label>
              <select style={selectStyle} value={ownerType} onChange={e => setOwnerType(e.target.value as AB1482Input['ownerType'])}>
                <option value="individual">Individual / Trust</option>
                <option value="llc-no-corp">LLC (no corporate members)</option>
                <option value="corporation">Corporation / REIT / LLC with corporate member</option>
              </select>
            </div>

            {showExemptionNotice && ownerType !== 'corporation' && (
              <div>
                <label style={labelStyle}>Have you given the tenant written AB 1482 exemption notice? *</label>
                <div style={{ display: 'flex', gap: 12 }}>
                  <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 14, color: INK_MID, cursor: 'pointer' }}>
                    <input type="radio" name="notice" checked={exemptionNotice === true} onChange={() => setExemptionNotice(true)} /> Yes
                  </label>
                  <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 14, color: INK_MID, cursor: 'pointer' }}>
                    <input type="radio" name="notice" checked={exemptionNotice === false} onChange={() => setExemptionNotice(false)} /> No
                  </label>
                </div>
                <p style={{ fontSize: 11, color: INK_MUTED, marginTop: 4 }}>
                  Per Civil Code 1946.2(e), single-family/condo owners must provide written notice to claim the exemption.
                </p>
              </div>
            )}

            <button
              onClick={handleCheckEligibility}
              disabled={!zipCode || !yearBuilt}
              style={{
                width: '100%', background: (!zipCode || !yearBuilt) ? '#C8CDD8' : N, color: '#fff',
                border: 'none', borderRadius: 10, padding: '13px', fontSize: 15, fontWeight: 700,
                cursor: (!zipCode || !yearBuilt) ? 'default' : 'pointer', fontFamily: 'inherit',
              }}
            >
              Check Eligibility →
            </button>
          </div>
        </div>
      )}

      {/* STEP 2: CALCULATE */}
      {step === 'calculate' && (
        <div style={{ background: '#fff', border: `1px solid ${BORDER}`, borderRadius: 14, padding: 28 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
            <div style={{ fontSize: 18, fontWeight: 700, color: N }}>Step 2: Calculate maximum rent</div>
            <button onClick={() => setStep('eligibility')} style={{ background: 'none', border: 'none', color: INK_MUTED, fontSize: 12, cursor: 'pointer', fontFamily: 'inherit' }}>← Back</button>
          </div>

          <div style={{ background: GREEN_LIGHT, borderRadius: 10, padding: '10px 14px', marginBottom: 20, fontSize: 13, color: GREEN_DARK }}>
            ✓ Your property is subject to AB 1482 rent caps.
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
            <div>
              <label style={labelStyle}>Current monthly rent *</label>
              <div style={{ position: 'relative' }}>
                <span style={{ position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)', fontSize: 15, fontWeight: 600, color: INK_MID, pointerEvents: 'none' }}>$</span>
                <input style={{ ...inputStyle, paddingLeft: 28 }} type="text" inputMode="decimal" placeholder="e.g. 2500" value={currentRent} onChange={e => setCurrentRent(e.target.value.replace(/[^0-9.]/g, ''))} />
              </div>
            </div>

            <div>
              <label style={labelStyle}>Proposed effective date of increase *</label>
              <input style={inputStyle} type="date" value={effectiveDate} onChange={e => setEffectiveDate(e.target.value)} />
            </div>

            <div>
              <label style={{ ...labelStyle, display: 'flex', alignItems: 'center', gap: 8 }}>
                <input type="checkbox" checked={isFirstIncrease} onChange={e => setIsFirstIncrease(e.target.checked)} />
                This is the first increase (never raised rent before)
              </label>
            </div>

            {!isFirstIncrease && (
              <>
                <div>
                  <label style={labelStyle}>Date of last rent increase</label>
                  <input style={inputStyle} type="date" value={lastIncreaseDate} onChange={e => setLastIncreaseDate(e.target.value)} />
                </div>
                <div>
                  <label style={labelStyle}>Dollar amount of last increase</label>
                  <div style={{ position: 'relative' }}>
                    <span style={{ position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)', fontSize: 15, fontWeight: 600, color: INK_MID, pointerEvents: 'none' }}>$</span>
                    <input style={{ ...inputStyle, paddingLeft: 28 }} type="text" inputMode="decimal" placeholder="e.g. 150" value={lastIncreaseAmount} onChange={e => setLastIncreaseAmount(e.target.value.replace(/[^0-9.]/g, ''))} />
                  </div>
                </div>
              </>
            )}

            <button
              onClick={handleCalculate}
              disabled={!currentRent || !effectiveDate}
              style={{
                width: '100%', background: (!currentRent || !effectiveDate) ? '#C8CDD8' : N, color: '#fff',
                border: 'none', borderRadius: 10, padding: '13px', fontSize: 15, fontWeight: 700,
                cursor: (!currentRent || !effectiveDate) ? 'default' : 'pointer', fontFamily: 'inherit',
              }}
            >
              Calculate Maximum Rent →
            </button>
          </div>
        </div>
      )}

      {/* RESULT */}
      {step === 'result' && result && (
        <div>
          {/* Eligibility result */}
          {!result.eligible ? (
            <div style={{ background: '#fff', border: `1px solid ${BORDER}`, borderRadius: 14, padding: 28 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16 }}>
                <div style={{ width: 40, height: 40, borderRadius: '50%', background: BG, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 20 }}>✗</div>
                <div style={{ fontSize: 20, fontWeight: 700, color: N }}>Exempt from AB 1482</div>
              </div>
              <p style={{ fontSize: 14, color: INK_MID, lineHeight: 1.6, marginBottom: 16 }}>{result.exemptionReason}</p>
              <p style={{ fontSize: 13, color: INK_MUTED, lineHeight: 1.6 }}>{result.plainEnglish}</p>

              {result.localOrdinance && (
                <div style={{ background: '#FFF9E6', border: '1px solid #F5D67A', borderRadius: 10, padding: 14, marginTop: 16 }}>
                  <div style={{ fontSize: 13, fontWeight: 700, color: '#7A5C00', marginBottom: 4 }}>Local rent control may still apply</div>
                  <p style={{ fontSize: 13, color: INK_MID, margin: 0 }}>
                    Your property is in <strong>{result.localOrdinance.city}</strong>, which has its own rent control ordinance ({result.localOrdinance.note}). Contact your city&apos;s rent board for details.
                  </p>
                </div>
              )}

              <button onClick={handleReset} style={{ marginTop: 20, background: BG, border: `1px solid ${BORDER}`, borderRadius: 10, padding: '10px 20px', fontSize: 13, fontWeight: 600, color: N, cursor: 'pointer', fontFamily: 'inherit' }}>
                ← Start over
              </button>
            </div>
          ) : (
            /* Calculation result */
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>

              {/* Main result card */}
              <div style={{ background: TEAL_LIGHT, border: `1.5px solid ${TEAL}`, borderRadius: 14, padding: '24px 28px' }}>
                <div style={{ fontSize: 12, fontWeight: 700, color: TEAL_DARK, textTransform: 'uppercase', letterSpacing: '0.8px', marginBottom: 12 }}>
                  {result.localOverrides ? `${result.localOrdinance?.city} Rent Control` : 'AB 1482 Maximum'}
                </div>
                <div style={{ display: 'flex', alignItems: 'baseline', gap: 8, marginBottom: 8 }}>
                  <span style={{ fontSize: 42, fontWeight: 800, color: N, letterSpacing: '-1px' }}>
                    ${result.maxNewRent?.toLocaleString()}
                  </span>
                  <span style={{ fontSize: 15, color: INK_MID }}>/mo</span>
                </div>
                <div style={{ fontSize: 15, color: INK_MID }}>
                  Increase: <strong>${result.maxIncreaseDollars?.toLocaleString()}</strong> ({result.applicableCap}%)
                </div>
              </div>

              {/* Formula breakdown */}
              <div style={{ background: '#fff', border: `1px solid ${BORDER}`, borderRadius: 14, padding: '20px 24px' }}>
                <div style={{ fontSize: 13, fontWeight: 700, color: N, marginBottom: 10 }}>How we calculated this</div>
                <pre style={{ fontSize: 13, color: INK_MID, lineHeight: 1.8, margin: 0, fontFamily: 'inherit', whiteSpace: 'pre-wrap' }}>
                  {result.formulaBreakdown}
                </pre>
                <div style={{ fontSize: 12, color: INK_MUTED, marginTop: 8 }}>
                  CPI region: {result.cpiRegion}
                </div>
              </div>

              {/* CPI pending notice */}
              {result.cpiPending && (
                <div style={{ background: '#FFF9E6', border: '1px solid #F5D67A', borderRadius: 10, padding: 14 }}>
                  <div style={{ fontSize: 13, fontWeight: 700, color: '#7A5C00', marginBottom: 4 }}>CPI data pending</div>
                  <p style={{ fontSize: 13, color: INK_MID, margin: 0 }}>
                    The April 2026 CPI for your region hasn&apos;t been published by BLS yet. This calculation uses the pre-August 2026 rate as a conservative estimate. Check back after mid-July 2026.
                  </p>
                </div>
              )}

              {/* Local ordinance override banner */}
              {result.localOverrides && result.localOrdinance && (
                <div style={{ background: '#FFF9E6', border: '1px solid #F5D67A', borderRadius: 10, padding: 14 }}>
                  <div style={{ fontSize: 13, fontWeight: 700, color: '#7A5C00', marginBottom: 4 }}>Local ordinance applies</div>
                  <p style={{ fontSize: 13, color: INK_MID, margin: 0 }}>
                    {result.localOrdinance.city} limits rent increases to {result.localOrdinance.rate}% ({result.localOrdinance.note}), which is stricter than AB 1482&apos;s {result.cpiValue! + 5}% cap. The local rate applies.
                  </p>
                </div>
              )}

              {/* Double increase warning */}
              {result.doubleIncreaseWarning && (
                <div style={{ background: '#FFEDED', border: `1px solid ${CORAL}44`, borderRadius: 10, padding: 14 }}>
                  <div style={{ fontSize: 13, fontWeight: 700, color: CORAL, marginBottom: 4 }}>Combined increase limit</div>
                  <p style={{ fontSize: 13, color: INK_MID, margin: 0 }}>
                    You increased rent by ${result.doubleIncreaseWarning.priorAmount} on {result.doubleIncreaseWarning.priorDate}. Combined increases within 12 months cannot exceed {result.doubleIncreaseWarning.combinedCapPercent}%. Remaining room: <strong>${result.doubleIncreaseWarning.remainingDollars.toLocaleString()}</strong> ({result.doubleIncreaseWarning.remainingPercent}%).
                  </p>
                </div>
              )}

              {/* Notice + effective date */}
              <div style={{ background: '#fff', border: `1px solid ${BORDER}`, borderRadius: 14, padding: '20px 24px' }}>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
                  <div>
                    <div style={{ fontSize: 11, color: INK_MUTED, textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: 4 }}>Notice Required</div>
                    <div style={{ fontSize: 20, fontWeight: 700, color: N }}>{result.noticeRequired} days</div>
                  </div>
                  <div>
                    <div style={{ fontSize: 11, color: INK_MUTED, textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: 4 }}>Earliest Effective Date</div>
                    <div style={{ fontSize: 20, fontWeight: 700, color: N }}>{result.earliestEffectiveDate ? new Date(result.earliestEffectiveDate + 'T00:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : '—'}</div>
                  </div>
                </div>
              </div>

              {/* Plain English */}
              <div style={{ background: BG, border: `1px solid ${BORDER}`, borderRadius: 14, padding: '20px 24px' }}>
                <div style={{ fontSize: 13, fontWeight: 700, color: N, marginBottom: 8 }}>In plain English</div>
                <p style={{ fontSize: 14, color: INK_MID, lineHeight: 1.7, margin: 0 }}>{result.plainEnglish}</p>
              </div>

              {/* Legal disclaimer */}
              <div style={{ background: '#fff', border: `1px solid ${BORDER}`, borderRadius: 10, padding: '16px 20px' }}>
                <div style={{ fontSize: 11, fontWeight: 700, color: INK_MUTED, textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: 6 }}>Legal Disclaimer</div>
                <p style={{ fontSize: 12, color: INK_MUTED, lineHeight: 1.6, margin: 0 }}>
                  This calculator provides estimates for informational purposes only. It is not legal advice. Rent cap rules are complex and depend on factors this tool may not capture, including local amendments, individual lease terms, and recent legislative changes. Consult a California real estate attorney before making rent increase decisions.
                </p>
              </div>

              {/* CTA */}
              <div style={{ background: N, borderRadius: 14, padding: '24px 28px', textAlign: 'center' }}>
                <div style={{ fontSize: 18, fontWeight: 700, color: '#fff', marginBottom: 8 }}>Stay compliant automatically</div>
                <p style={{ fontSize: 13, color: 'rgba(255,255,255,0.7)', marginBottom: 16 }}>
                  Keywise tracks rent caps, notice periods, and CPI updates for your California rentals.
                </p>
                <a href="/?signup=true" style={{ display: 'inline-block', background: TEAL, color: N, padding: '12px 28px', borderRadius: 10, fontSize: 14, fontWeight: 700, textDecoration: 'none' }}>
                  Start free →
                </a>
                <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.5)', marginTop: 8 }}>Free for 1-2 units. No credit card.</div>
              </div>

              <button onClick={handleReset} style={{ background: BG, border: `1px solid ${BORDER}`, borderRadius: 10, padding: '10px 20px', fontSize: 13, fontWeight: 600, color: N, cursor: 'pointer', fontFamily: 'inherit', alignSelf: 'flex-start' }}>
                ← Calculate again
              </button>

              {/* Save calculation */}
              <ComplianceSaveButton
                calculations={[{
                  input: {
                    zipCode,
                    yearBuilt: parseInt(yearBuilt, 10) || 0,
                    propertyType,
                    ownerType,
                    exemptionNoticeGiven: (propertyType === 'single-family' || propertyType === 'condo') ? exemptionNotice : undefined,
                    currentRent: parseFloat(currentRent.replace(/[^0-9.]/g, '')) || 0,
                    effectiveDate: effectiveDate || new Date().toISOString().split('T')[0],
                    lastIncreaseDate: isFirstIncrease ? null : (lastIncreaseDate || null),
                    lastIncreaseAmount: isFirstIncrease ? null : (parseFloat(lastIncreaseAmount) || null),
                  },
                  result,
                }]}
              />
            </div>
          )}
        </div>
      )}
    </div>
  );
}
