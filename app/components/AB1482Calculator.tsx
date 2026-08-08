'use client';
import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';

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

// Property types that are small multi (duplex/triplex/fourplex)
const SMALL_MULTI = ['duplex', 'triplex', 'fourplex'];
// Property types where SFH/condo/townhome exemption may apply
const SFH_CONDO = ['sfh', 'condo', 'townhome'];
// Property types that are ADU/JADU
const ADU_TYPES = ['adu', 'jadu'];
// Ownership types that qualify for SFH/condo exemption
const QUALIFYING_OWNERSHIP = ['individual', 'family-trust', 'llc-individual'];

interface CalcInputs {
  currentRent: string;
  lastIncreaseDate: string;
  yearBuilt: string;
  propertyType: string;
  ownershipType: string;
  ownerOccupied: string;       // 'yes' | 'no' | '' — for duplex/triplex/fourplex
  exemptionNoticeGiven: string; // 'yes' | 'no' | 'unsure'
  hasLocalRentControl: string;  // 'yes' | 'no' | 'unsure'
  isAffordableHousing: string;  // 'yes' | 'no'
  aduOwnerOccupied: string;     // 'yes' | 'no' — for ADU/JADU
  region: string;
  address: string;
  selectedPropertyId: string;
}

interface CalcResult {
  status: 'exempt' | 'subject' | 'local-control' | 'mrl' | 'error';
  exemptionReason?: string;
  exemptionCondition?: string; // Conditional warning (e.g. notice not served)
  cpi: number;
  maxIncreasePercent: number;
  maxIncreaseDollar: number;
  maxNewRent: number;
  noticeRequired: string;
  currentRent: number;
  disclaimer: string;
}

interface Property {
  id: string;
  address: string;
  unit_number?: string;
}

function isNewConstruction(yearBuilt: string): boolean {
  const year = parseInt(yearBuilt);
  if (isNaN(year)) return false;
  return year > (new Date().getFullYear() - 15);
}

function calculate(inputs: CalcInputs): CalcResult | null {
  const currentRent = parseFloat(inputs.currentRent);
  if (isNaN(currentRent) || currentRent <= 0) return null;

  const cpi = CPI_BY_REGION[inputs.region] || 3.5;

  const disclaimer =
    'This tool provides a general analysis based on the information you entered. Exemption status can be affected by nuances not captured here — including whether prior tenants were displaced, whether the property was previously subject to rent control, and the specific language of any exemption notice. For high-stakes situations, consult a California landlord attorney.';

  // Step 1 — Age check
  if (inputs.yearBuilt && isNewConstruction(inputs.yearBuilt)) {
    return {
      status: 'exempt',
      exemptionReason: `Building with certificate of occupancy issued in ${inputs.yearBuilt} is less than 15 years old — rolling exemption under Civil Code § 1946.2(e)(7).`,
      cpi, maxIncreasePercent: 0, maxIncreaseDollar: 0, maxNewRent: 0,
      noticeRequired: '30-day notice required for increases < 10%; 90-day for ≥ 10% (Civil Code § 827)',
      currentRent, disclaimer,
    };
  }

  // Step 2 — Affordable housing
  if (inputs.isAffordableHousing === 'yes') {
    return {
      status: 'exempt',
      exemptionReason: 'Deed-restricted affordable housing or government-subsidized unit — exempt from AB 1482 under Civil Code § 1946.2(e)(3).',
      cpi, maxIncreasePercent: 0, maxIncreaseDollar: 0, maxNewRent: 0,
      noticeRequired: '30-day notice required for increases < 10%; 90-day for ≥ 10% (Civil Code § 827)',
      currentRent, disclaimer,
    };
  }

  // Step 3 — Local rent control
  if (inputs.hasLocalRentControl === 'yes') {
    return {
      status: 'local-control',
      exemptionReason: 'This property is covered by a local rent control ordinance (such as LA RSO, SF Rent Ordinance, or similar). AB 1482 does not apply — your local ordinance controls and is likely stricter. Consult your city\'s rent control rules.',
      cpi, maxIncreasePercent: 0, maxIncreaseDollar: 0, maxNewRent: 0,
      noticeRequired: 'See your local rent control rules for notice requirements',
      currentRent, disclaimer,
    };
  }

  // Step 4 — Mobile home
  if (inputs.propertyType === 'mobile-home') {
    return {
      status: 'mrl',
      exemptionReason: 'Mobile home and manufactured home space rent is governed by the Mobilehome Residency Law (MRL) and MRL rent stabilization provisions — not AB 1482. Different rules apply.',
      cpi, maxIncreasePercent: 0, maxIncreaseDollar: 0, maxNewRent: 0,
      noticeRequired: 'See MRL for notice requirements',
      currentRent, disclaimer,
    };
  }

  // Step 5 — Property type + ownership matrix

  // Small multi: duplex/triplex/fourplex
  if (SMALL_MULTI.includes(inputs.propertyType)) {
    if (inputs.ownerOccupied === 'yes') {
      return {
        status: 'exempt',
        exemptionReason: `Owner-occupied ${inputs.propertyType} — exempt from AB 1482 under Civil Code § 1946.2(e)(5). The owner lives in one of the units as their primary residence.`,
        cpi, maxIncreasePercent: 0, maxIncreaseDollar: 0, maxNewRent: 0,
        noticeRequired: '30-day notice required for increases < 10%; 90-day for ≥ 10% (Civil Code § 827)',
        currentRent, disclaimer,
      };
    }
    // Not owner-occupied → subject to AB 1482
  }

  // SFH, condo, townhome
  if (SFH_CONDO.includes(inputs.propertyType)) {
    const qualifyingOwner = QUALIFYING_OWNERSHIP.includes(inputs.ownershipType);
    if (qualifyingOwner) {
      if (inputs.exemptionNoticeGiven === 'yes') {
        return {
          status: 'exempt',
          exemptionReason: `${inputs.propertyType === 'sfh' ? 'Single-family home' : inputs.propertyType === 'condo' ? 'Condominium' : 'Townhome'} owned by a qualifying individual/trust/LLC with written exemption notice served — exempt from AB 1482 under Civil Code § 1946.2(e)(8).`,
          cpi, maxIncreasePercent: 0, maxIncreaseDollar: 0, maxNewRent: 0,
          noticeRequired: '30-day notice required for increases < 10%; 90-day for ≥ 10% (Civil Code § 827)',
          currentRent, disclaimer,
        };
      }
      if (inputs.exemptionNoticeGiven === 'no' || inputs.exemptionNoticeGiven === 'unsure') {
        // Subject to AB 1482 but with a warning about potential future exemption
        const rawMax = 5 + cpi;
        const maxIncreasePercent = Math.min(rawMax, 10);
        const maxIncreaseDollar = Math.round(currentRent * (maxIncreasePercent / 100) * 100) / 100;
        const maxNewRent = Math.round((currentRent + maxIncreaseDollar) * 100) / 100;
        return {
          status: 'subject',
          exemptionCondition: `Your property type and ownership likely qualify for the AB 1482 exemption — but without a written exemption notice served to the tenant under Civil Code § 1946.2(e)(8), AB 1482 protections apply by default. Serve the exemption notice for future tenancies to preserve this exemption.`,
          cpi, maxIncreasePercent, maxIncreaseDollar, maxNewRent,
          noticeRequired: maxIncreasePercent < 10 ? '30-day written notice required (Civil Code § 827)' : '90-day written notice required (Civil Code § 827)',
          currentRent, disclaimer,
        };
      }
    }
    // Corporate/REIT/LLC-with-corporate-member ownership → subject
  }

  // ADU / JADU
  if (ADU_TYPES.includes(inputs.propertyType)) {
    if (inputs.aduOwnerOccupied === 'yes') {
      return {
        status: 'exempt',
        exemptionReason: 'ADU or JADU on a property with an owner-occupied single-family home — generally exempt from AB 1482 under Civil Code § 1946.2(e)(8) when the primary dwelling is owner-occupied and qualifying exemption notice was served.',
        cpi, maxIncreasePercent: 0, maxIncreaseDollar: 0, maxNewRent: 0,
        noticeRequired: '30-day notice required for increases < 10%; 90-day for ≥ 10% (Civil Code § 827)',
        currentRent, disclaimer,
      };
    }
  }

  // Default: subject to AB 1482
  const rawMax = 5 + cpi;
  const maxIncreasePercent = Math.min(rawMax, 10);
  const maxIncreaseDollar = Math.round(currentRent * (maxIncreasePercent / 100) * 100) / 100;
  const maxNewRent = Math.round((currentRent + maxIncreaseDollar) * 100) / 100;

  return {
    status: 'subject',
    cpi,
    maxIncreasePercent,
    maxIncreaseDollar,
    maxNewRent,
    noticeRequired: maxIncreasePercent < 10 ? '30-day written notice required (Civil Code § 827)' : '90-day written notice required (Civil Code § 827)',
    currentRent,
    disclaimer,
  };
}

// ── Conditional field visibility helpers ──────────────────────────────────────

function showOwnerOccupied(pt: string) { return SMALL_MULTI.includes(pt); }
function showExemptionNotice(pt: string, ot: string) {
  return SFH_CONDO.includes(pt) && QUALIFYING_OWNERSHIP.includes(ot);
}
function showAduOwnerOccupied(pt: string) { return ADU_TYPES.includes(pt); }

// ── Component ─────────────────────────────────────────────────────────────────

export default function AB1482Calculator() {
  const [inputs, setInputs] = useState<CalcInputs>({
    currentRent: '', lastIncreaseDate: '', yearBuilt: '', propertyType: '',
    ownershipType: 'individual', ownerOccupied: '', exemptionNoticeGiven: '',
    hasLocalRentControl: '', isAffordableHousing: 'no', aduOwnerOccupied: '',
    region: 'los-angeles', address: '', selectedPropertyId: '',
  });
  const [result, setResult] = useState<CalcResult | null>(null);
  const [email, setEmail] = useState('');
  const [emailLoading, setEmailLoading] = useState(false);
  const [emailSent, setEmailSent] = useState(false);
  const [emailError, setEmailError] = useState('');
  const [calculated, setCalculated] = useState(false);

  const [userId, setUserId] = useState<string | null>(null);
  const [properties, setProperties] = useState<Property[]>([]);
  const [savedId, setSavedId] = useState<string | null>(null);
  const [saveToast, setSaveToast] = useState(false);

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (user) {
        setUserId(user.id);
        setEmail(user.email ?? '');
        supabase.from('properties').select('id, address, unit_number')
          .eq('is_unit', true).order('address').then(({ data }) => {
            if (data) setProperties(data);
          });
      }
    });
  }, []);

  const set = (k: keyof CalcInputs, v: string) => {
    setInputs(prev => {
      const next = { ...prev, [k]: v };
      // Reset dependent fields when property type changes
      if (k === 'propertyType') {
        next.ownerOccupied = '';
        next.exemptionNoticeGiven = '';
        next.aduOwnerOccupied = '';
      }
      if (k === 'ownershipType') {
        next.exemptionNoticeGiven = '';
      }
      return next;
    });
  };

  const canCalculate = () => {
    if (!inputs.currentRent || !inputs.propertyType) return false;
    if (showOwnerOccupied(inputs.propertyType) && !inputs.ownerOccupied) return false;
    if (showExemptionNotice(inputs.propertyType, inputs.ownershipType) && !inputs.exemptionNoticeGiven) return false;
    if (showAduOwnerOccupied(inputs.propertyType) && !inputs.aduOwnerOccupied) return false;
    if (!inputs.hasLocalRentControl) return false;
    return true;
  };

  const saveCalculation = async (r: CalcResult) => {
    if (!userId) return;
    try {
      const { data } = await supabase.from('rent_calculations').insert({
        user_id: userId,
        property_id: inputs.selectedPropertyId || null,
        address: inputs.address || null,
        current_rent: r.currentRent,
        max_legal_rent: r.status === 'subject' ? r.maxNewRent : null,
        max_increase_percent: r.status === 'subject' ? r.maxIncreasePercent : null,
        max_increase_amount: r.status === 'subject' ? r.maxIncreaseDollar : null,
        cpi_used: r.cpi,
        region: inputs.region,
        is_exempt: r.status !== 'subject',
        exemption_reason: r.exemptionReason ?? null,
        property_type: inputs.propertyType,
        ownership_type: inputs.ownershipType,
        year_built: inputs.yearBuilt ? parseInt(inputs.yearBuilt) : null,
        last_increase_date: inputs.lastIncreaseDate || null,
        notice_type: r.noticeRequired,
      }).select('id').single();
      if (data) setSavedId(data.id);
      setSaveToast(true);
      setTimeout(() => setSaveToast(false), 4000);
    } catch (err) {
      console.error('[ab1482] save error:', err);
    }
  };

  const handleCalculate = () => {
    const r = calculate(inputs);
    setResult(r);
    setCalculated(true);
    setEmailSent(false);
    setEmailError('');
    setSavedId(null);
    if (r && userId) saveCalculation(r);
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
          address: inputs.address || '',
          currentRent: result?.currentRent,
          newRent: result?.maxNewRent,
          increasePercent: result?.maxIncreasePercent,
          effectiveDate: new Date(Date.now() + 60 * 24 * 60 * 60 * 1000).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' }),
          noticeDate: new Date().toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' }),
          region: REGION_LABELS[inputs.region],
          isExempt: result?.status !== 'subject',
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
    width: '100%', background: BG, border: `1px solid ${BORDER}`, borderRadius: 10,
    padding: '11px 14px', fontSize: 14, fontFamily: 'inherit', color: INK,
    outline: 'none', boxSizing: 'border-box' as const,
  };

  const labelStyle = {
    fontSize: 11, color: INK_MUTED, fontWeight: 700,
    textTransform: 'uppercase' as const, letterSpacing: '0.4px',
    display: 'block', marginBottom: 6,
  };

  const radioGroupStyle = { display: 'flex', flexDirection: 'column' as const, gap: 8, marginTop: 4 };
  const radioLabel = { display: 'flex', alignItems: 'center', gap: 8, fontSize: 14, color: INK, cursor: 'pointer' };

  return (
    <div>
      {userId && (
        <div style={{ background: TEAL_LIGHT, border: `1px solid ${TEAL}44`, borderRadius: 10, padding: '10px 16px', marginBottom: 16, fontSize: 13, color: TEAL_DARK, fontWeight: 600, display: 'flex', alignItems: 'center', gap: 8 }}>
          <span>✓</span>
          <span>Signed in — this calculation will be saved to your account</span>
        </div>
      )}

      {saveToast && (
        <div style={{
          position: 'fixed', top: 20, right: 20, zIndex: 9999,
          background: '#0F7040', color: '#fff', borderRadius: 10, padding: '12px 20px',
          fontSize: 14, fontWeight: 600, boxShadow: '0 4px 20px rgba(0,0,0,0.2)',
          display: 'flex', alignItems: 'center', gap: 10,
        }}>
          <span>✓ Saved to your compliance history</span>
          <a href="/compliance/rent-calculations" style={{ color: '#86EFAC', fontSize: 13, fontWeight: 700 }}>View history →</a>
        </div>
      )}

      {/* Calculator Card */}
      <div style={{ background: SURFACE, borderRadius: 20, border: `1px solid ${BORDER}`, padding: 32, boxShadow: '0 4px 24px rgba(15,52,96,0.10)', marginBottom: 24 }}>
        <div style={{ fontWeight: 700, fontSize: 18, color: N, marginBottom: 24 }}>Calculate Your Maximum Rent Increase</div>

        {/* Row 1 — rent, region, date */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 16, marginBottom: 16 }}>
          <div>
            <label style={labelStyle}>Current Monthly Rent ($)</label>
            <input type="number" min="0" placeholder="e.g. 2200" value={inputs.currentRent}
              onChange={e => set('currentRent', e.target.value)} style={inputStyle} />
          </div>
          <div>
            <label style={labelStyle}>Region</label>
            <select value={inputs.region} onChange={e => set('region', e.target.value)} style={inputStyle}>
              {Object.entries(REGION_LABELS).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
            </select>
          </div>
          <div>
            <label style={labelStyle}>Date of Last Rent Increase (optional)</label>
            <input type="date" value={inputs.lastIncreaseDate}
              onChange={e => set('lastIncreaseDate', e.target.value)} style={inputStyle} />
          </div>
        </div>

        {/* Row 2 — property type, year built, ownership */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 16, marginBottom: 16 }}>
          <div>
            <label style={labelStyle}>Property Type</label>
            <select value={inputs.propertyType} onChange={e => set('propertyType', e.target.value)} style={inputStyle}>
              <option value="">Select type…</option>
              <option value="sfh">Single-family home (detached)</option>
              <option value="condo">Condominium</option>
              <option value="townhome">Townhome</option>
              <option value="duplex">Duplex (2 units)</option>
              <option value="triplex">Triplex (3 units)</option>
              <option value="fourplex">Fourplex (4 units)</option>
              <option value="small-multi">Small multi-family (5–15 units)</option>
              <option value="large-multi">Larger multi-family (16+ units)</option>
              <option value="adu">Accessory Dwelling Unit (ADU)</option>
              <option value="jadu">Junior ADU (JADU)</option>
              <option value="mobile-home">Mobile home / manufactured home in park</option>
              <option value="sro">Rooming house / SRO</option>
              <option value="live-work">Live/work loft</option>
            </select>
          </div>
          <div>
            <label style={labelStyle}>Year built (or CO year if known)</label>
            <input type="number" min="1850" max="2030" placeholder="e.g. 1998" value={inputs.yearBuilt}
              onChange={e => set('yearBuilt', e.target.value)} style={inputStyle} />
          </div>
          <div>
            <label style={labelStyle}>Ownership Type</label>
            <select value={inputs.ownershipType} onChange={e => set('ownershipType', e.target.value)} style={inputStyle}>
              <option value="individual">Individual person(s)</option>
              <option value="family-trust">Family trust (individual beneficiaries only)</option>
              <option value="llc-individual">LLC — all members are individuals</option>
              <option value="llc-corporate">LLC — one or more members is a corporation</option>
              <option value="corporation">Corporation</option>
              <option value="reit">REIT</option>
              <option value="government">Government entity</option>
            </select>
          </div>
        </div>

        {/* Conditional: owner-occupied for duplex/triplex/fourplex */}
        {showOwnerOccupied(inputs.propertyType) && (
          <div style={{ marginBottom: 16, background: BG, borderRadius: 12, padding: '16px 20px' }}>
            <label style={labelStyle}>Is the owner living on the property as their primary residence?</label>
            <div style={radioGroupStyle}>
              {[
                { v: 'yes', label: 'Yes — owner lives in one of the units' },
                { v: 'no', label: 'No — owner does not live on the property' },
              ].map(({ v, label }) => (
                <label key={v} style={radioLabel}>
                  <input type="radio" name="ownerOccupied" value={v}
                    checked={inputs.ownerOccupied === v}
                    onChange={() => set('ownerOccupied', v)} />
                  {label}
                </label>
              ))}
            </div>
          </div>
        )}

        {/* Conditional: exemption notice for SFH/condo/townhome with qualifying ownership */}
        {showExemptionNotice(inputs.propertyType, inputs.ownershipType) && (
          <div style={{ marginBottom: 16, background: BG, borderRadius: 12, padding: '16px 20px' }}>
            <label style={labelStyle}>Did you serve the tenant a written AB 1482 exemption notice at lease start?</label>
            <div style={radioGroupStyle}>
              {[
                { v: 'yes', label: 'Yes — I served a written AB 1482 exemption notice' },
                { v: 'no', label: 'No — I did not serve one' },
                { v: 'unsure', label: 'Not sure' },
              ].map(({ v, label }) => (
                <label key={v} style={radioLabel}>
                  <input type="radio" name="exemptionNotice" value={v}
                    checked={inputs.exemptionNoticeGiven === v}
                    onChange={() => set('exemptionNoticeGiven', v)} />
                  {label}
                </label>
              ))}
            </div>
          </div>
        )}

        {/* Conditional: ADU owner-occupied question */}
        {showAduOwnerOccupied(inputs.propertyType) && (
          <div style={{ marginBottom: 16, background: BG, borderRadius: 12, padding: '16px 20px' }}>
            <label style={labelStyle}>Is the ADU on a property with an owner-occupied single-family home?</label>
            <div style={radioGroupStyle}>
              {[
                { v: 'yes', label: 'Yes — the main house is owner-occupied' },
                { v: 'no', label: 'No' },
              ].map(({ v, label }) => (
                <label key={v} style={radioLabel}>
                  <input type="radio" name="aduOwnerOccupied" value={v}
                    checked={inputs.aduOwnerOccupied === v}
                    onChange={() => set('aduOwnerOccupied', v)} />
                  {label}
                </label>
              ))}
            </div>
          </div>
        )}

        {/* Local rent control */}
        <div style={{ marginBottom: 16, background: BG, borderRadius: 12, padding: '16px 20px' }}>
          <label style={labelStyle}>Is this property subject to a local rent control ordinance? (LA RSO, SF Rent Ordinance, Berkeley, Santa Monica, Oakland, San Jose, etc.)</label>
          <div style={radioGroupStyle}>
            {[
              { v: 'yes', label: 'Yes — covered by local rent control' },
              { v: 'no', label: 'No' },
              { v: 'unsure', label: 'Not sure' },
            ].map(({ v, label }) => (
              <label key={v} style={radioLabel}>
                <input type="radio" name="localRentControl" value={v}
                  checked={inputs.hasLocalRentControl === v}
                  onChange={() => set('hasLocalRentControl', v)} />
                {label}
              </label>
            ))}
          </div>
        </div>

        {/* Affordable housing */}
        <div style={{ marginBottom: 16, background: BG, borderRadius: 12, padding: '16px 20px' }}>
          <label style={labelStyle}>Is this deed-restricted affordable housing or subject to a government housing subsidy?</label>
          <div style={{ display: 'flex', gap: 20, marginTop: 4 }}>
            {[{ v: 'yes', label: 'Yes' }, { v: 'no', label: 'No' }].map(({ v, label }) => (
              <label key={v} style={radioLabel}>
                <input type="radio" name="affordableHousing" value={v}
                  checked={inputs.isAffordableHousing === v}
                  onChange={() => set('isAffordableHousing', v)} />
                {label}
              </label>
            ))}
          </div>
        </div>

        {/* Optional fields */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 16, marginBottom: 24 }}>
          <div>
            <label style={labelStyle}>Property Address (optional)</label>
            <input type="text" placeholder="e.g. 123 Main St, Unit 4" value={inputs.address}
              onChange={e => set('address', e.target.value)} style={inputStyle} />
          </div>
          {userId && properties.length > 0 && (
            <div>
              <label style={labelStyle}>Link to property in Keywise (optional)</label>
              <select value={inputs.selectedPropertyId} onChange={e => set('selectedPropertyId', e.target.value)} style={inputStyle}>
                <option value="">— don&apos;t link —</option>
                {properties.map(p => (
                  <option key={p.id} value={p.id}>
                    {p.address}{p.unit_number ? ` #${p.unit_number}` : ''}
                  </option>
                ))}
              </select>
            </div>
          )}
        </div>

        <button onClick={handleCalculate} disabled={!canCalculate()}
          style={{
            background: !canCalculate() ? '#ccc' : N,
            color: '#fff', border: 'none', borderRadius: 12, padding: '14px 32px',
            fontSize: 15, fontWeight: 700,
            cursor: !canCalculate() ? 'default' : 'pointer',
            fontFamily: 'inherit', width: '100%',
          }}>
          Analyze This Property →
        </button>

        {!canCalculate() && inputs.propertyType && (
          <div style={{ fontSize: 12, color: INK_MUTED, textAlign: 'center', marginTop: 10 }}>
            Answer all questions above to run the analysis.
          </div>
        )}
      </div>

      {/* Results */}
      {calculated && result && (
        <div style={{ background: SURFACE, borderRadius: 20, border: `1px solid ${BORDER}`, padding: 32, boxShadow: '0 4px 24px rgba(15,52,96,0.10)' }}>

          {/* LOCAL RENT CONTROL */}
          {result.status === 'local-control' && (
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16 }}>
                <div style={{ fontSize: 36 }}>🏛️</div>
                <div>
                  <div style={{ fontWeight: 700, fontSize: 20, color: N }}>Covered by local rent control</div>
                  <div style={{ fontSize: 14, color: INK_MID, marginTop: 4 }}>AB 1482 does not apply here</div>
                </div>
              </div>
              <div style={{ background: '#F0F4FF', border: `1px solid ${N}22`, borderRadius: 12, padding: '16px 20px', fontSize: 14, color: INK_MID, lineHeight: 1.65 }}>
                {result.exemptionReason}
              </div>
            </div>
          )}

          {/* MRL / MOBILE HOME */}
          {result.status === 'mrl' && (
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16 }}>
                <div style={{ fontSize: 36 }}>🏠</div>
                <div>
                  <div style={{ fontWeight: 700, fontSize: 20, color: N }}>Governed by the Mobilehome Residency Law</div>
                  <div style={{ fontSize: 14, color: INK_MID, marginTop: 4 }}>Not AB 1482</div>
                </div>
              </div>
              <div style={{ background: '#FFF8E0', border: '1px solid #F0C000', borderRadius: 12, padding: '16px 20px', fontSize: 14, color: '#7A5500', lineHeight: 1.65 }}>
                {result.exemptionReason}
              </div>
            </div>
          )}

          {/* EXEMPT */}
          {result.status === 'exempt' && (
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16 }}>
                <div style={{ fontSize: 36 }}>✅</div>
                <div>
                  <div style={{ fontWeight: 700, fontSize: 20, color: N }}>Exempt from AB 1482 rent caps</div>
                  <div style={{ fontSize: 14, color: '#0F7040', marginTop: 4 }}>No rent cap applies to this property</div>
                </div>
              </div>
              <div style={{ background: TEAL_LIGHT, border: `1px solid ${TEAL}44`, borderRadius: 12, padding: '16px 20px', fontSize: 14, color: TEAL_DARK, lineHeight: 1.65, marginBottom: 16 }}>
                <strong>Reason:</strong> {result.exemptionReason}
              </div>
              <div style={{ background: '#FFF8E0', border: '1px solid #F0C000', borderRadius: 12, padding: '14px 18px', fontSize: 13, color: '#7A5500', lineHeight: 1.65, marginBottom: 16 }}>
                ⚠️ Even though no rent cap applies, California Civil Code § 827 still requires written notice before any rent increase: <strong>30-day notice</strong> for increases under 10%, <strong>90-day notice</strong> for increases of 10% or more.
              </div>
              {/* Email capture for exempt — offers non-AB 1482 notice */}
              <div style={{ borderTop: `1px solid ${BORDER}`, paddingTop: 20 }}>
                <div style={{ fontWeight: 700, fontSize: 15, color: N, marginBottom: 6 }}>Get a rent increase notice for this property</div>
                <div style={{ fontSize: 13, color: INK_MID, marginBottom: 14, lineHeight: 1.6 }}>
                  We&apos;ll send you a Civil Code § 827 rent increase notice (not AB 1482 — since your property is exempt) formatted for California delivery requirements.
                </div>
                {!userId && <div style={{ marginBottom: 12, fontSize: 13, color: INK_MUTED }}><a href="/?login=true" style={{ color: TEAL, fontWeight: 600 }}>Sign in to save this calculation</a></div>}
                {userId && savedId && <div style={{ marginBottom: 12, fontSize: 13, color: '#0F7040' }}>✓ Saved · <a href="/compliance/rent-calculations" style={{ color: TEAL, fontWeight: 600 }}>View history →</a></div>}
                {emailSent ? (
                  <div style={{ background: '#F0FDF4', border: '1px solid #86EFAC', borderRadius: 10, padding: '12px 16px', fontSize: 14, color: '#166534' }}>
                    ✓ Sent to {email}. Check your inbox.
                  </div>
                ) : (
                  <div>
                    <div style={{ display: 'flex', gap: 8 }}>
                      <input type="email" placeholder="you@email.com" value={email} onChange={e => setEmail(e.target.value)}
                        onKeyDown={e => e.key === 'Enter' && handleSendNotice()}
                        style={{ flex: 1, background: BG, border: `1px solid ${BORDER}`, borderRadius: 10, padding: '10px 14px', fontSize: 14, fontFamily: 'inherit', color: INK, outline: 'none' }} />
                      <button onClick={handleSendNotice} disabled={emailLoading}
                        style={{ background: TEAL, color: N, border: 'none', borderRadius: 10, padding: '10px 18px', fontSize: 13, fontWeight: 700, cursor: emailLoading ? 'default' : 'pointer', fontFamily: 'inherit', whiteSpace: 'nowrap', opacity: emailLoading ? 0.7 : 1 }}>
                        {emailLoading ? 'Sending…' : 'Send Notice →'}
                      </button>
                    </div>
                    {emailError && <div style={{ background: CORAL_LIGHT, border: `1px solid ${CORAL}33`, borderRadius: 8, padding: '8px 12px', fontSize: 13, color: CORAL, marginTop: 8 }}>{emailError}</div>}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* SUBJECT TO AB 1482 */}
          {result.status === 'subject' && (
            <div>
              <div style={{ fontWeight: 700, fontSize: 20, color: N, marginBottom: 6 }}>Subject to AB 1482 Rent Cap</div>
              <div style={{ fontSize: 14, color: INK_MID, marginBottom: 24 }}>This property is covered by California's Tenant Protection Act.</div>

              {result.exemptionCondition && (
                <div style={{ background: '#FFF8E0', border: '1px solid #F0C000', borderRadius: 12, padding: '14px 18px', fontSize: 13, color: '#7A5500', lineHeight: 1.65, marginBottom: 20 }}>
                  ⚠️ {result.exemptionCondition}
                </div>
              )}

              {/* Big number */}
              <div style={{ background: `linear-gradient(135deg, ${TEAL_LIGHT}, #F0F4FF)`, border: `1px solid ${TEAL}33`, borderRadius: 16, padding: '24px 28px', marginBottom: 24, textAlign: 'center' }}>
                <div style={{ fontSize: 13, color: TEAL_DARK, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.6px', marginBottom: 8 }}>Maximum Legal New Rent</div>
                <div style={{ fontSize: 52, fontWeight: 800, color: N, letterSpacing: '-2px' }}>
                  ${result.maxNewRent.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </div>
                <div style={{ fontSize: 14, color: INK_MID, marginTop: 8 }}>per month</div>
              </div>

              {/* Math breakdown */}
              <table style={{ width: '100%', borderCollapse: 'collapse', marginBottom: 24 }}>
                <tbody>
                  {[
                    ['Current rent', `$${result.currentRent.toLocaleString('en-US', { minimumFractionDigits: 2 })}`],
                    [`Local CPI (${REGION_LABELS[inputs.region]})`, `${result.cpi}%`],
                    ['Formula: 5% + CPI (capped at 10%)', `${result.maxIncreasePercent}%`],
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

              <div style={{ background: '#F0F4FF', border: `1px solid ${N}22`, borderRadius: 12, padding: '16px 20px', marginBottom: 24 }}>
                <div style={{ fontSize: 13, fontWeight: 700, color: N, marginBottom: 4 }}>⚖️ Notice Requirement</div>
                <div style={{ fontSize: 14, color: INK_MID, lineHeight: 1.6 }}>{result.noticeRequired}</div>
              </div>

              {!userId && <div style={{ marginBottom: 16, fontSize: 13, color: INK_MUTED }}><a href="/?login=true" style={{ color: TEAL, fontWeight: 600 }}>Sign in to save this calculation</a> and track all your rent increases in one place.</div>}
              {userId && savedId && <div style={{ marginBottom: 16, fontSize: 13, color: '#0F7040' }}>✓ Saved · <a href="/compliance/rent-calculations" style={{ color: TEAL, fontWeight: 600 }}>View history →</a></div>}

              {/* Email capture */}
              <div style={{ borderTop: `1px solid ${BORDER}`, paddingTop: 24 }}>
                <div style={{ fontWeight: 700, fontSize: 16, color: N, marginBottom: 8 }}>Get the official rent increase notice</div>
                <div style={{ fontSize: 14, color: INK_MID, marginBottom: 16, lineHeight: 1.6 }}>
                  We&apos;ll send you a professionally formatted notice meeting AB 1482 and Civil Code § 827 requirements, ready to serve to your tenant. Free.
                </div>
                {emailSent ? (
                  <div style={{ background: '#F0FDF4', border: '1px solid #86EFAC', borderRadius: 10, padding: '14px 16px', fontSize: 14, color: '#166534' }}>
                    ✓ Sent to {email}. Check your inbox — the notice is attached.
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
                    {emailError && <div style={{ background: CORAL_LIGHT, border: `1px solid ${CORAL}33`, borderRadius: 8, padding: '8px 12px', fontSize: 13, color: CORAL, marginTop: 8 }}>{emailError}</div>}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Disclaimer — always shown */}
          <div style={{ marginTop: 24, paddingTop: 20, borderTop: `1px solid ${BORDER}`, fontSize: 12, color: INK_MUTED, lineHeight: 1.65 }}>
            <strong>Disclaimer:</strong> {result.disclaimer}
          </div>
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
