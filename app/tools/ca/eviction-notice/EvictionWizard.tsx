'use client';

import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../../../lib/supabase';
import {
  NOTICE_TYPES,
  AT_FAULT_TYPES,
  NO_FAULT_TYPES,
  DISCLAIMER_TEXT,
  ATTORNEY_REFERRAL_URL,
  type NoticeType,
} from '../../../../lib/compliance/ca/just-cause-config';
import {
  checkDefects,
  hasCriticalDefects,
  type DefectCheckInputs,
  type DefectCheckResult,
} from '../../../../lib/compliance/ca/just-cause-defect-checker';
import { generateNoticeText, type NoticeInputs } from '../../../../lib/compliance/ca/just-cause-notice-templates';
import {
  calculateExpirationDate,
  calculateEarliestUDFiling,
  addMailServiceDays,
  formatNoticeDate,
} from '../../../../lib/compliance/ca/just-cause-deadline';
import NoticePreview from './NoticePreview';

/* ── Style Constants (matching AB 1482 calculator) ── */
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

const inputStyle: React.CSSProperties = {
  width: '100%',
  boxSizing: 'border-box',
  border: `1.5px solid ${BORDER}`,
  borderRadius: 10,
  padding: '11px 14px',
  fontSize: 15,
  color: INK,
  fontFamily: 'inherit',
  outline: 'none',
  background: '#fff',
};

const labelStyle: React.CSSProperties = {
  display: 'block',
  fontSize: 13,
  fontWeight: 600,
  color: N,
  marginBottom: 6,
};

const selectStyle: React.CSSProperties = {
  ...inputStyle,
  appearance: 'none',
  backgroundImage: `url("data:image/svg+xml,%3Csvg width='10' height='6' viewBox='0 0 10 6' xmlns='http://www.w3.org/2000/svg'%3E%3Cpath d='M1 1l4 4 4-4' stroke='%238892A4' fill='none' stroke-width='1.5'/%3E%3C/svg%3E")`,
  backgroundRepeat: 'no-repeat',
  backgroundPosition: 'right 14px center',
};

const textareaStyle: React.CSSProperties = {
  ...inputStyle,
  minHeight: 80,
  resize: 'vertical' as const,
};

/* ── Types ── */
interface UnitOption {
  id: string;
  address: string;
  unit_number: string;
  tenant_name: string | null;
  lease_start: string | null;
  tenancy_months: number;
}

type Step = 'unit' | 'type' | 'details' | 'defects' | 'review';
const STEPS: Step[] = ['unit', 'type', 'details', 'defects', 'review'];
const STEP_LABELS: Record<Step, string> = {
  unit: 'Select Unit',
  type: 'Notice Type',
  details: 'Enter Details',
  defects: 'Defect Check',
  review: 'Review & Generate',
};

/* ── Component ── */
export default function EvictionWizard() {
  const [step, setStep] = useState<Step>('unit');
  const [units, setUnits] = useState<UnitOption[]>([]);
  const [loadingUnits, setLoadingUnits] = useState(true);
  const [selectedUnit, setSelectedUnit] = useState<UnitOption | null>(null);
  const [selectedType, setSelectedType] = useState<NoticeType | null>(null);

  // Detail form state
  const [rentAmount, setRentAmount] = useState('');
  const [rentPeriod, setRentPeriod] = useState('');
  const [recipientName, setRecipientName] = useState('');
  const [recipientPhone, setRecipientPhone] = useState('');
  const [recipientAddress, setRecipientAddress] = useState('');
  const [recipientHours, setRecipientHours] = useState('');
  const [paymentMethod, setPaymentMethod] = useState('');
  const [includesNonRentCharges, setIncludesNonRentCharges] = useState(false);
  const [violationDescription, setViolationDescription] = useState('');
  const [leaseClause, setLeaseClause] = useState('');
  const [nuisanceDescription, setNuisanceDescription] = useState('');
  const [criminalActivityDescription, setCriminalActivityDescription] = useState('');
  const [sublettingDescription, setSublettingDescription] = useState('');
  const [unlawfulUseDescription, setUnlawfulUseDescription] = useState('');
  const [noFaultReason, setNoFaultReason] = useState('');
  const [relocationAmount, setRelocationAmount] = useState('');
  const [occupantName, setOccupantName] = useState('');
  const [occupantRelationship, setOccupantRelationship] = useState('');
  const [ownershipPercentage, setOwnershipPercentage] = useState('');
  const [confirmMoveIn90Days, setConfirmMoveIn90Days] = useState(false);
  const [confirm12MonthOccupancy, setConfirm12MonthOccupancy] = useState(false);
  const [confirmAllUnitsWithdrawn, setConfirmAllUnitsWithdrawn] = useState(false);
  const [remodelDescription, setRemodelDescription] = useState('');
  const [remodelTimeline, setRemodelTimeline] = useState('');
  const [hasPermits, setHasPermits] = useState(false);
  const [confirmReoccupancyRight, setConfirmReoccupancyRight] = useState(false);
  const [orderDescription, setOrderDescription] = useState('');
  const [issuingAuthority, setIssuingAuthority] = useState('');
  const [tenantCausedCondition, setTenantCausedCondition] = useState(false);
  const [ownerName, setOwnerName] = useState('');
  const [serviceMethod, setServiceMethod] = useState('');
  const [retaliation, setRetaliation] = useState<boolean | null>(null);

  // Defect results
  const [defectResults, setDefectResults] = useState<DefectCheckResult[]>([]);

  // Save state
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  /* ── Fetch units ── */
  useEffect(() => {
    async function fetchUnits() {
      setLoadingUnits(true);
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { setLoadingUnits(false); return; }

      const { data: props } = await supabase
        .from('properties')
        .select('id, address, unit_number')
        .eq('user_id', user.id)
        .eq('is_unit', true);

      if (!props || props.length === 0) { setUnits([]); setLoadingUnits(false); return; }

      const unitOptions: UnitOption[] = [];
      for (const p of props) {
        // Fetch latest lease for tenant name and start date
        const { data: lease } = await supabase
          .from('leases')
          .select('tenant_name, start_date')
          .eq('unit_id', p.id)
          .order('start_date', { ascending: false })
          .limit(1)
          .maybeSingle();

        let tenancyMonths = 0;
        if (lease?.start_date) {
          const start = new Date(lease.start_date);
          const now = new Date();
          tenancyMonths = (now.getFullYear() - start.getFullYear()) * 12 + (now.getMonth() - start.getMonth());
        }

        unitOptions.push({
          id: p.id,
          address: p.address,
          unit_number: p.unit_number || '',
          tenant_name: lease?.tenant_name || null,
          lease_start: lease?.start_date || null,
          tenancy_months: tenancyMonths,
        });
      }
      setUnits(unitOptions);
      setLoadingUnits(false);
    }
    fetchUnits();
  }, []);

  /* ── Build notice inputs ── */
  const buildNoticeInputs = useCallback((): NoticeInputs => {
    const today = new Date();
    const servedDate = today.toISOString().slice(0, 10);
    const nt = selectedType!;

    let effectiveDays = nt.days;
    if (serviceMethod === 'substituted' || serviceMethod === 'posting') {
      effectiveDays = addMailServiceDays(nt.days, 'within_ca');
    }

    const expDate = calculateExpirationDate(servedDate, effectiveDays, nt.excludeWeekendsHolidays);

    return {
      tenantName: selectedUnit?.tenant_name || '___________',
      propertyAddress: selectedUnit?.address || '___________',
      unitNumber: selectedUnit?.unit_number || undefined,
      ownerName: ownerName || '___________',
      noticeDate: formatNoticeDate(today),
      rentAmount: rentAmount ? parseFloat(rentAmount) : undefined,
      rentPeriod: rentPeriod || undefined,
      recipientName: recipientName || undefined,
      recipientPhone: recipientPhone || undefined,
      recipientAddress: recipientAddress || undefined,
      recipientHours: recipientHours || undefined,
      paymentMethod: paymentMethod || undefined,
      violationDescription: violationDescription || undefined,
      leaseClause: leaseClause || undefined,
      nuisanceDescription: nuisanceDescription || undefined,
      criminalActivityDescription: criminalActivityDescription || undefined,
      sublettingDescription: sublettingDescription || undefined,
      unlawfulUseDescription: unlawfulUseDescription || undefined,
      noFaultReason: noFaultReason || undefined,
      relocationAmount: relocationAmount ? parseFloat(relocationAmount) : undefined,
      occupantName: occupantName || undefined,
      occupantRelationship: occupantRelationship || undefined,
      ownershipPercentage: ownershipPercentage ? parseFloat(ownershipPercentage) : undefined,
      remodelDescription: remodelDescription || undefined,
      remodelTimeline: remodelTimeline || undefined,
      orderDescription: orderDescription || undefined,
      issuingAuthority: issuingAuthority || undefined,
      noticeDays: effectiveDays,
      expirationDate: formatNoticeDate(expDate),
    };
  }, [
    selectedType, selectedUnit, ownerName, rentAmount, rentPeriod,
    recipientName, recipientPhone, recipientAddress, recipientHours,
    paymentMethod, violationDescription, leaseClause, nuisanceDescription,
    criminalActivityDescription, sublettingDescription, unlawfulUseDescription,
    noFaultReason, relocationAmount, occupantName, occupantRelationship,
    ownershipPercentage, remodelDescription, remodelTimeline, orderDescription,
    issuingAuthority, serviceMethod,
  ]);

  /* ── Run defect checks ── */
  const runDefectChecks = useCallback(() => {
    if (!selectedType || !selectedUnit) return;
    const inputs: DefectCheckInputs = {
      noticeType: selectedType.id,
      atFault: selectedType.atFault,
      canCure: selectedType.canCure,
      rentAmount: rentAmount ? parseFloat(rentAmount) : undefined,
      includesNonRentCharges,
      recipientName: recipientName || undefined,
      recipientPhone: recipientPhone || undefined,
      recipientAddress: recipientAddress || undefined,
      recipientHours: recipientHours || undefined,
      paymentMethod: paymentMethod || undefined,
      justCauseStated: true, // Template always includes just cause
      serviceMethodSelected: !!serviceMethod,
      serviceMethod: serviceMethod || undefined,
      tenantRightsIncluded: true, // Template always includes
      requiresRelocation: selectedType.requiresRelocation,
      relocationAmount: relocationAmount ? parseFloat(relocationAmount) : undefined,
      recentComplaintWithin180Days: retaliation,
      noticeDays: selectedType.days,
      correctNoticePeriod: true, // We use the correct period from config
      confirmMoveIn90Days,
      confirm12MonthOccupancy,
      ownershipPercentage: ownershipPercentage ? parseFloat(ownershipPercentage) : undefined,
      hasPermits,
      confirmReoccupancyRight,
      remodelDescription: remodelDescription || undefined,
      remodelTimeline: remodelTimeline || undefined,
    };
    const results = checkDefects(selectedType.id, inputs, selectedUnit.tenancy_months);
    setDefectResults(results);
  }, [
    selectedType, selectedUnit, rentAmount, includesNonRentCharges,
    recipientName, recipientPhone, recipientAddress, recipientHours,
    paymentMethod, serviceMethod, relocationAmount, retaliation,
    confirmMoveIn90Days, confirm12MonthOccupancy, ownershipPercentage,
    hasPermits, confirmReoccupancyRight, remodelDescription, remodelTimeline,
  ]);

  /* ── Save notice ── */
  const handleSave = async () => {
    if (!selectedType || !selectedUnit) return;
    setSaving(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) { alert('Please sign in to save notices.'); setSaving(false); return; }

      const noticeInputs = buildNoticeInputs();
      const text = generateNoticeText(selectedType.id, noticeInputs);
      const today = new Date().toISOString().slice(0, 10);
      let effectiveDays = selectedType.days;
      if (serviceMethod === 'substituted' || serviceMethod === 'posting') {
        effectiveDays = addMailServiceDays(selectedType.days, 'within_ca');
      }
      const expDate = calculateExpirationDate(today, effectiveDays, selectedType.excludeWeekendsHolidays);

      const res = await fetch('/api/eviction-notice/save', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({
          unit_id: selectedUnit.id,
          notice_type: selectedType.id,
          at_fault: selectedType.atFault,
          situation_inputs: noticeInputs,
          notice_days: effectiveDays,
          can_cure: selectedType.canCure,
          cure_terms: selectedType.cureDescription || null,
          relocation_amount: relocationAmount ? parseFloat(relocationAmount) : null,
          notice_text: text,
          defect_checks: defectResults,
          retaliation_flag: retaliation === true,
          served_method: serviceMethod || null,
          expires_at: expDate.toISOString().slice(0, 10),
          status: 'draft',
        }),
      });

      if (res.ok) {
        setSaved(true);
      } else {
        const err = await res.json();
        alert(err.error || 'Failed to save. Please try again.');
      }
    } catch {
      alert('Failed to save. Please try again.');
    }
    setSaving(false);
  };

  /* ── Step navigation ── */
  const currentIdx = STEPS.indexOf(step);
  const canGoNext = () => {
    switch (step) {
      case 'unit': return !!selectedUnit;
      case 'type': return !!selectedType;
      case 'details': return !!serviceMethod && !!ownerName;
      case 'defects': return !hasCriticalDefects(defectResults);
      default: return false;
    }
  };

  const goNext = () => {
    if (step === 'details') {
      runDefectChecks();
    }
    const next = STEPS[currentIdx + 1];
    if (next) setStep(next);
  };

  const goBack = () => {
    const prev = STEPS[currentIdx - 1];
    if (prev) setStep(prev);
  };

  /* ── Disclaimer banner ── */
  const disclaimerBanner = (
    <div style={{ background: '#FFF0F0', border: `1px solid ${CORAL}33`, borderRadius: 10, padding: '10px 14px', marginBottom: 20 }}>
      <p style={{ fontSize: 12, color: CORAL, margin: 0, fontWeight: 600 }}>
        {DISCLAIMER_TEXT}{' '}
        <a href={ATTORNEY_REFERRAL_URL} target="_blank" rel="noopener noreferrer" style={{ color: TEAL_DARK, textDecoration: 'underline' }}>
          Find a California Attorney
        </a>
      </p>
    </div>
  );

  /* ── Progress bar ── */
  const progressBar = (
    <div style={{ display: 'flex', gap: 4, marginBottom: 24 }}>
      {STEPS.map((s, i) => (
        <div key={s} style={{ flex: 1 }}>
          <div style={{
            height: 4,
            borderRadius: 2,
            background: i <= currentIdx ? TEAL : BORDER,
            transition: 'background 0.2s',
          }} />
          <div style={{
            fontSize: 11,
            color: i <= currentIdx ? TEAL_DARK : INK_MUTED,
            fontWeight: i === currentIdx ? 700 : 500,
            marginTop: 4,
            textAlign: 'center',
          }}>
            {STEP_LABELS[s]}
          </div>
        </div>
      ))}
    </div>
  );

  /* ── Render each step ── */
  const renderUnit = () => (
    <div>
      <h2 style={{ fontSize: 20, fontWeight: 700, color: N, margin: '0 0 4px' }}>Step 1: Select Unit</h2>
      <p style={{ fontSize: 14, color: INK_MID, margin: '0 0 20px' }}>Choose the rental unit for this eviction notice.</p>

      {loadingUnits ? (
        <p style={{ fontSize: 14, color: INK_MUTED }}>Loading units...</p>
      ) : units.length === 0 ? (
        <div style={{ background: BG, border: `1px solid ${BORDER}`, borderRadius: 10, padding: 20, textAlign: 'center' }}>
          <p style={{ fontSize: 14, color: INK_MID, margin: '0 0 8px' }}>No units found. Add a property first.</p>
          <a href="/properties" style={{ fontSize: 14, color: TEAL_DARK, fontWeight: 600, textDecoration: 'none' }}>Go to Properties</a>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {units.map((u) => (
            <button
              key={u.id}
              onClick={() => setSelectedUnit(u)}
              style={{
                background: selectedUnit?.id === u.id ? TEAL_LIGHT : '#fff',
                border: `1.5px solid ${selectedUnit?.id === u.id ? TEAL : BORDER}`,
                borderRadius: 10,
                padding: 16,
                textAlign: 'left',
                cursor: 'pointer',
                transition: 'all 0.15s',
              }}
            >
              <div style={{ fontSize: 15, fontWeight: 600, color: N }}>
                {u.address}{u.unit_number ? `, Unit ${u.unit_number}` : ''}
              </div>
              <div style={{ fontSize: 13, color: INK_MID, marginTop: 4 }}>
                {u.tenant_name ? `Tenant: ${u.tenant_name}` : 'No tenant on file'}{' '}
                {u.lease_start ? `| Tenancy: ${u.tenancy_months} months` : ''}
              </div>
              {u.tenancy_months > 0 && u.tenancy_months < 12 && (
                <div style={{ fontSize: 12, color: '#FFB347', fontWeight: 600, marginTop: 6 }}>
                  Note: Tenancy is under 12 months. Verify whether CC 1946.2 just-cause requirements apply.
                </div>
              )}
            </button>
          ))}
        </div>
      )}
    </div>
  );

  const renderType = () => (
    <div>
      <h2 style={{ fontSize: 20, fontWeight: 700, color: N, margin: '0 0 4px' }}>Step 2: Select Notice Type</h2>
      <p style={{ fontSize: 14, color: INK_MID, margin: '0 0 6px' }}>
        You must select the appropriate notice type. This tool does NOT recommend which notice to use.
      </p>
      <p style={{ fontSize: 13, color: CORAL, fontWeight: 600, margin: '0 0 20px' }}>
        Not sure which notice type applies?{' '}
        <a href={ATTORNEY_REFERRAL_URL} target="_blank" rel="noopener noreferrer" style={{ color: TEAL_DARK, textDecoration: 'underline' }}>
          Consult an attorney
        </a>
      </p>

      <div style={{ marginBottom: 20 }}>
        <h3 style={{ fontSize: 14, fontWeight: 700, color: N, marginBottom: 10, textTransform: 'uppercase', letterSpacing: '0.5px' }}>
          At-Fault Notices
        </h3>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {AT_FAULT_TYPES.map((t) => (
            <button
              key={t.id}
              onClick={() => setSelectedType(t)}
              style={{
                background: selectedType?.id === t.id ? TEAL_LIGHT : '#fff',
                border: `1.5px solid ${selectedType?.id === t.id ? TEAL : BORDER}`,
                borderRadius: 10,
                padding: 14,
                textAlign: 'left',
                cursor: 'pointer',
                transition: 'all 0.15s',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <div style={{
                  width: 18, height: 18, borderRadius: '50%',
                  border: `2px solid ${selectedType?.id === t.id ? TEAL : BORDER}`,
                  display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
                }}>
                  {selectedType?.id === t.id && <div style={{ width: 10, height: 10, borderRadius: '50%', background: TEAL }} />}
                </div>
                <div>
                  <div style={{ fontSize: 14, fontWeight: 600, color: N }}>{t.label}</div>
                  <div style={{ fontSize: 12, color: INK_MID, marginTop: 2 }}>{t.description}</div>
                  <div style={{ fontSize: 11, color: INK_MUTED, marginTop: 3 }}>
                    {t.days}-day notice {t.excludeWeekendsHolidays ? '(excl. weekends/holidays)' : ''} | {t.canCure ? 'Curable' : 'No cure'} | {t.statutoryBasis}
                  </div>
                </div>
              </div>
            </button>
          ))}
        </div>
      </div>

      <div>
        <h3 style={{ fontSize: 14, fontWeight: 700, color: N, marginBottom: 10, textTransform: 'uppercase', letterSpacing: '0.5px' }}>
          No-Fault Notices
        </h3>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {NO_FAULT_TYPES.map((t) => (
            <button
              key={t.id}
              onClick={() => setSelectedType(t)}
              style={{
                background: selectedType?.id === t.id ? TEAL_LIGHT : '#fff',
                border: `1.5px solid ${selectedType?.id === t.id ? TEAL : BORDER}`,
                borderRadius: 10,
                padding: 14,
                textAlign: 'left',
                cursor: 'pointer',
                transition: 'all 0.15s',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <div style={{
                  width: 18, height: 18, borderRadius: '50%',
                  border: `2px solid ${selectedType?.id === t.id ? TEAL : BORDER}`,
                  display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
                }}>
                  {selectedType?.id === t.id && <div style={{ width: 10, height: 10, borderRadius: '50%', background: TEAL }} />}
                </div>
                <div>
                  <div style={{ fontSize: 14, fontWeight: 600, color: N }}>{t.label}</div>
                  <div style={{ fontSize: 12, color: INK_MID, marginTop: 2 }}>{t.description}</div>
                  <div style={{ fontSize: 11, color: INK_MUTED, marginTop: 3 }}>
                    {t.days}-day notice | Relocation required | {t.statutoryBasis}
                  </div>
                </div>
              </div>
            </button>
          ))}
        </div>
      </div>
    </div>
  );

  const renderDetails = () => {
    if (!selectedType) return null;
    const tid = selectedType.id;

    return (
      <div>
        <h2 style={{ fontSize: 20, fontWeight: 700, color: N, margin: '0 0 4px' }}>Step 3: Enter Details</h2>
        <p style={{ fontSize: 14, color: INK_MID, margin: '0 0 20px' }}>
          {selectedType.label} — {selectedType.statutoryBasis}
        </p>

        {/* Owner name (always required) */}
        <div style={{ marginBottom: 16 }}>
          <label style={labelStyle}>Owner / Agent Name *</label>
          <input style={inputStyle} value={ownerName} onChange={(e) => setOwnerName(e.target.value)} placeholder="Your name (as property owner or authorized agent)" />
        </div>

        {/* Pay or Quit fields */}
        {tid === 'pay_or_quit' && (
          <>
            <div style={{ marginBottom: 16 }}>
              <label style={labelStyle}>Rent Amount Due *</label>
              <input style={inputStyle} type="number" value={rentAmount} onChange={(e) => setRentAmount(e.target.value)} placeholder="0.00" step="0.01" />
              <div style={{ marginTop: 8 }}>
                <label style={{ fontSize: 13, color: INK_MID, display: 'flex', alignItems: 'center', gap: 6, cursor: 'pointer' }}>
                  <input type="checkbox" checked={includesNonRentCharges} onChange={(e) => setIncludesNonRentCharges(e.target.checked)} />
                  This amount includes late fees, utilities, or other non-rent charges
                </label>
                {includesNonRentCharges && (
                  <p style={{ fontSize: 12, color: CORAL, margin: '6px 0 0', fontWeight: 600 }}>
                    Warning: CCP 1161(2) requires the notice to state only the rent due. Including non-rent charges can invalidate the notice.
                  </p>
                )}
              </div>
            </div>
            <div style={{ marginBottom: 16 }}>
              <label style={labelStyle}>Rent Period</label>
              <input style={inputStyle} value={rentPeriod} onChange={(e) => setRentPeriod(e.target.value)} placeholder="e.g., May 1-31, 2026" />
            </div>
            <div style={{ marginBottom: 16 }}>
              <label style={labelStyle}>Payment Recipient Name *</label>
              <input style={inputStyle} value={recipientName} onChange={(e) => setRecipientName(e.target.value)} placeholder="Name of person to receive payment" />
            </div>
            <div style={{ marginBottom: 16 }}>
              <label style={labelStyle}>Payment Recipient Phone *</label>
              <input style={inputStyle} value={recipientPhone} onChange={(e) => setRecipientPhone(e.target.value)} placeholder="(555) 555-5555" />
            </div>
            <div style={{ marginBottom: 16 }}>
              <label style={labelStyle}>Payment Recipient Address *</label>
              <input style={inputStyle} value={recipientAddress} onChange={(e) => setRecipientAddress(e.target.value)} placeholder="Address where payment can be made" />
            </div>
            <div style={{ marginBottom: 16 }}>
              <label style={labelStyle}>Available Hours *</label>
              <input style={inputStyle} value={recipientHours} onChange={(e) => setRecipientHours(e.target.value)} placeholder="e.g., Monday-Friday, 9:00 AM - 5:00 PM" />
            </div>
            <div style={{ marginBottom: 16 }}>
              <label style={labelStyle}>Payment Method *</label>
              <input style={inputStyle} value={paymentMethod} onChange={(e) => setPaymentMethod(e.target.value)} placeholder="e.g., Check, money order, or electronic transfer via..." />
            </div>
          </>
        )}

        {/* Cure or Quit fields */}
        {tid === 'cure_or_quit' && (
          <>
            <div style={{ marginBottom: 16 }}>
              <label style={labelStyle}>Describe the Lease Violation *</label>
              <textarea style={textareaStyle} value={violationDescription} onChange={(e) => setViolationDescription(e.target.value)} placeholder="Describe the specific lease violation..." />
            </div>
            <div style={{ marginBottom: 16 }}>
              <label style={labelStyle}>Lease Clause Violated *</label>
              <input style={inputStyle} value={leaseClause} onChange={(e) => setLeaseClause(e.target.value)} placeholder="e.g., Section 5(a) - No pets" />
            </div>
          </>
        )}

        {/* Nuisance */}
        {tid === 'unconditional_quit_nuisance' && (
          <div style={{ marginBottom: 16 }}>
            <label style={labelStyle}>Describe the Nuisance or Waste *</label>
            <textarea style={textareaStyle} value={nuisanceDescription} onChange={(e) => setNuisanceDescription(e.target.value)} placeholder="Describe the nuisance or waste conduct..." />
          </div>
        )}

        {/* Criminal */}
        {tid === 'unconditional_quit_criminal' && (
          <div style={{ marginBottom: 16 }}>
            <label style={labelStyle}>Describe the Criminal Activity *</label>
            <textarea style={textareaStyle} value={criminalActivityDescription} onChange={(e) => setCriminalActivityDescription(e.target.value)} placeholder="Describe the criminal activity or threats..." />
          </div>
        )}

        {/* Subletting */}
        {tid === 'unconditional_quit_subletting' && (
          <div style={{ marginBottom: 16 }}>
            <label style={labelStyle}>Describe the Unauthorized Subletting *</label>
            <textarea style={textareaStyle} value={sublettingDescription} onChange={(e) => setSublettingDescription(e.target.value)} placeholder="Describe the unauthorized assignment or subletting..." />
          </div>
        )}

        {/* Unlawful use */}
        {tid === 'unconditional_quit_unlawful' && (
          <div style={{ marginBottom: 16 }}>
            <label style={labelStyle}>Describe the Unlawful Use *</label>
            <textarea style={textareaStyle} value={unlawfulUseDescription} onChange={(e) => setUnlawfulUseDescription(e.target.value)} placeholder="Describe the unlawful use of the premises..." />
          </div>
        )}

        {/* No-fault general (30/60 day) */}
        {(tid === 'termination_30day' || tid === 'termination_60day') && (
          <>
            <div style={{ marginBottom: 16 }}>
              <label style={labelStyle}>No-Fault Just Cause Reason *</label>
              <textarea style={textareaStyle} value={noFaultReason} onChange={(e) => setNoFaultReason(e.target.value)} placeholder="State the specific no-fault just cause reason..." />
            </div>
            <div style={{ marginBottom: 16 }}>
              <label style={labelStyle}>Relocation Amount (one month&apos;s rent) *</label>
              <input style={inputStyle} type="number" value={relocationAmount} onChange={(e) => setRelocationAmount(e.target.value)} placeholder="0.00" step="0.01" />
              <p style={{ fontSize: 12, color: INK_MUTED, margin: '4px 0 0' }}>CC 1946.2(d): Must equal one month&apos;s rent. Local ordinances may require more.</p>
            </div>
          </>
        )}

        {/* Owner move-in */}
        {tid === 'owner_move_in' && (
          <>
            <div style={{ marginBottom: 16 }}>
              <label style={labelStyle}>Intended Occupant Name *</label>
              <input style={inputStyle} value={occupantName} onChange={(e) => setOccupantName(e.target.value)} placeholder="Name of person who will move in" />
            </div>
            <div style={{ marginBottom: 16 }}>
              <label style={labelStyle}>Relationship to Owner *</label>
              <input style={inputStyle} value={occupantRelationship} onChange={(e) => setOccupantRelationship(e.target.value)} placeholder="e.g., Owner, Spouse, Parent, Child" />
            </div>
            <div style={{ marginBottom: 16 }}>
              <label style={labelStyle}>Ownership Percentage *</label>
              <input style={inputStyle} type="number" value={ownershipPercentage} onChange={(e) => setOwnershipPercentage(e.target.value)} placeholder="25" min="0" max="100" />
              <p style={{ fontSize: 12, color: INK_MUTED, margin: '4px 0 0' }}>SB 567 requires at least 25% recorded ownership interest.</p>
            </div>
            <div style={{ marginBottom: 16 }}>
              <label style={labelStyle}>Relocation Amount (one month&apos;s rent) *</label>
              <input style={inputStyle} type="number" value={relocationAmount} onChange={(e) => setRelocationAmount(e.target.value)} placeholder="0.00" step="0.01" />
            </div>
            <div style={{ marginBottom: 10 }}>
              <label style={{ fontSize: 13, color: INK_MID, display: 'flex', alignItems: 'center', gap: 6, cursor: 'pointer' }}>
                <input type="checkbox" checked={confirmMoveIn90Days} onChange={(e) => setConfirmMoveIn90Days(e.target.checked)} />
                I confirm the intended occupant will move in within 90 days of the tenant vacating (SB 567)
              </label>
            </div>
            <div style={{ marginBottom: 16 }}>
              <label style={{ fontSize: 13, color: INK_MID, display: 'flex', alignItems: 'center', gap: 6, cursor: 'pointer' }}>
                <input type="checkbox" checked={confirm12MonthOccupancy} onChange={(e) => setConfirm12MonthOccupancy(e.target.checked)} />
                I confirm the intended occupant will occupy the unit for a minimum of 12 continuous months as primary residence (SB 567)
              </label>
            </div>
          </>
        )}

        {/* Withdrawal */}
        {tid === 'withdrawal_from_market' && (
          <>
            <div style={{ marginBottom: 16 }}>
              <label style={labelStyle}>Relocation Amount (one month&apos;s rent) *</label>
              <input style={inputStyle} type="number" value={relocationAmount} onChange={(e) => setRelocationAmount(e.target.value)} placeholder="0.00" step="0.01" />
            </div>
            <div style={{ marginBottom: 16 }}>
              <label style={{ fontSize: 13, color: INK_MID, display: 'flex', alignItems: 'center', gap: 6, cursor: 'pointer' }}>
                <input type="checkbox" checked={confirmAllUnitsWithdrawn} onChange={(e) => setConfirmAllUnitsWithdrawn(e.target.checked)} />
                I confirm all rental units at the property are being withdrawn from the rental market
              </label>
            </div>
          </>
        )}

        {/* Substantial remodel */}
        {tid === 'substantial_remodel' && (
          <>
            <div style={{ marginBottom: 16 }}>
              <label style={labelStyle}>Description of Remodel Work *</label>
              <textarea style={textareaStyle} value={remodelDescription} onChange={(e) => setRemodelDescription(e.target.value)} placeholder="Describe the structural, electrical, plumbing, or mechanical work..." />
            </div>
            <div style={{ marginBottom: 16 }}>
              <label style={labelStyle}>Expected Timeline *</label>
              <input style={inputStyle} value={remodelTimeline} onChange={(e) => setRemodelTimeline(e.target.value)} placeholder="e.g., Approximately 4 months (July 2026 - October 2026)" />
            </div>
            <div style={{ marginBottom: 16 }}>
              <label style={labelStyle}>Relocation Amount (one month&apos;s rent) *</label>
              <input style={inputStyle} type="number" value={relocationAmount} onChange={(e) => setRelocationAmount(e.target.value)} placeholder="0.00" step="0.01" />
            </div>
            <div style={{ marginBottom: 10 }}>
              <label style={{ fontSize: 13, color: INK_MID, display: 'flex', alignItems: 'center', gap: 6, cursor: 'pointer' }}>
                <input type="checkbox" checked={hasPermits} onChange={(e) => setHasPermits(e.target.checked)} />
                Permits or signed contractor agreements are available (required by SB 567)
              </label>
            </div>
            <div style={{ marginBottom: 16 }}>
              <label style={{ fontSize: 13, color: INK_MID, display: 'flex', alignItems: 'center', gap: 6, cursor: 'pointer' }}>
                <input type="checkbox" checked={confirmReoccupancyRight} onChange={(e) => setConfirmReoccupancyRight(e.target.checked)} />
                I confirm the notice will include tenant&apos;s right to reoccupy at same terms (SB 567)
              </label>
            </div>
          </>
        )}

        {/* Government order */}
        {tid === 'government_order' && (
          <>
            <div style={{ marginBottom: 16 }}>
              <label style={labelStyle}>Description of Government/Court Order *</label>
              <textarea style={textareaStyle} value={orderDescription} onChange={(e) => setOrderDescription(e.target.value)} placeholder="Describe the order and its requirements..." />
            </div>
            <div style={{ marginBottom: 16 }}>
              <label style={labelStyle}>Issuing Authority *</label>
              <input style={inputStyle} value={issuingAuthority} onChange={(e) => setIssuingAuthority(e.target.value)} placeholder="e.g., City Building Department, County Health Department" />
            </div>
            <div style={{ marginBottom: 10 }}>
              <label style={{ fontSize: 13, color: INK_MID, display: 'flex', alignItems: 'center', gap: 6, cursor: 'pointer' }}>
                <input type="checkbox" checked={tenantCausedCondition} onChange={(e) => setTenantCausedCondition(e.target.checked)} />
                The condition requiring the order was caused by the tenant (relocation assistance not required per CC 1946.2(b)(2)(C))
              </label>
            </div>
            {!tenantCausedCondition && (
              <div style={{ marginBottom: 16 }}>
                <label style={labelStyle}>Relocation Amount (one month&apos;s rent) *</label>
                <input style={inputStyle} type="number" value={relocationAmount} onChange={(e) => setRelocationAmount(e.target.value)} placeholder="0.00" step="0.01" />
              </div>
            )}
          </>
        )}

        {/* Service method (always shown) */}
        <div style={{ marginTop: 20, padding: '16px 0', borderTop: `1px solid ${BORDER}` }}>
          <label style={labelStyle}>Service Method *</label>
          <select style={selectStyle} value={serviceMethod} onChange={(e) => setServiceMethod(e.target.value)}>
            <option value="">Select service method...</option>
            <option value="personal">Personal service (deliver to tenant)</option>
            <option value="substituted">Substituted service (leave with person + mail copy)</option>
            <option value="posting">Posting + mailing (post on property + mail copy)</option>
          </select>
          {(serviceMethod === 'substituted' || serviceMethod === 'posting') && (
            <p style={{ fontSize: 12, color: '#FFB347', fontWeight: 600, marginTop: 6 }}>
              Note: Mail service within California adds 5 calendar days to the notice period (CCP 1013(a)).
            </p>
          )}
        </div>
      </div>
    );
  };

  const renderDefects = () => (
    <div>
      <h2 style={{ fontSize: 20, fontWeight: 700, color: N, margin: '0 0 4px' }}>Step 4: Defect Check</h2>
      <p style={{ fontSize: 14, color: INK_MID, margin: '0 0 20px' }}>
        This check identifies potential procedural issues based on the information you provided. These are factual observations, not legal conclusions.
      </p>

      {/* Retaliation question */}
      <div style={{ background: BG, border: `1px solid ${BORDER}`, borderRadius: 10, padding: 16, marginBottom: 20 }}>
        <div style={{ fontSize: 13, fontWeight: 700, color: N, marginBottom: 8 }}>Retaliation Check (CC 1942.5)</div>
        <p style={{ fontSize: 13, color: INK_MID, margin: '0 0 10px' }}>
          Has the tenant filed a complaint about habitability, contacted a government agency, or had a government inspection within the past 180 days?
        </p>
        <div style={{ display: 'flex', gap: 10 }}>
          {(['yes', 'no', 'unsure'] as const).map((opt) => (
            <button
              key={opt}
              onClick={() => {
                const val = opt === 'yes' ? true : opt === 'no' ? false : null;
                setRetaliation(val);
                // Re-run defects with new retaliation value
                if (selectedType && selectedUnit) {
                  const inputs: DefectCheckInputs = {
                    noticeType: selectedType.id,
                    atFault: selectedType.atFault,
                    canCure: selectedType.canCure,
                    rentAmount: rentAmount ? parseFloat(rentAmount) : undefined,
                    includesNonRentCharges,
                    recipientName: recipientName || undefined,
                    recipientPhone: recipientPhone || undefined,
                    recipientAddress: recipientAddress || undefined,
                    recipientHours: recipientHours || undefined,
                    paymentMethod: paymentMethod || undefined,
                    justCauseStated: true,
                    serviceMethodSelected: !!serviceMethod,
                    tenantRightsIncluded: true,
                    requiresRelocation: selectedType.requiresRelocation,
                    relocationAmount: relocationAmount ? parseFloat(relocationAmount) : undefined,
                    recentComplaintWithin180Days: val,
                    noticeDays: selectedType.days,
                    correctNoticePeriod: true,
                    confirmMoveIn90Days,
                    confirm12MonthOccupancy,
                    ownershipPercentage: ownershipPercentage ? parseFloat(ownershipPercentage) : undefined,
                    hasPermits,
                    confirmReoccupancyRight,
                    remodelDescription: remodelDescription || undefined,
                    remodelTimeline: remodelTimeline || undefined,
                  };
                  setDefectResults(checkDefects(selectedType.id, inputs, selectedUnit.tenancy_months));
                }
              }}
              style={{
                padding: '8px 18px',
                borderRadius: 8,
                border: `1.5px solid ${
                  (opt === 'yes' && retaliation === true) ||
                  (opt === 'no' && retaliation === false) ||
                  (opt === 'unsure' && retaliation === null)
                    ? TEAL : BORDER
                }`,
                background:
                  (opt === 'yes' && retaliation === true) ||
                  (opt === 'no' && retaliation === false) ||
                  (opt === 'unsure' && retaliation === null)
                    ? TEAL_LIGHT : '#fff',
                fontSize: 13,
                fontWeight: 600,
                color: N,
                cursor: 'pointer',
                textTransform: 'capitalize',
              }}
            >
              {opt}
            </button>
          ))}
        </div>
        {retaliation === true && (
          <div style={{ marginTop: 10, background: '#FFF0F0', border: `1px solid ${CORAL}33`, borderRadius: 8, padding: 10 }}>
            <p style={{ fontSize: 12, color: CORAL, margin: 0, fontWeight: 600 }}>
              CC 1942.5 creates a rebuttable presumption of retaliation if eviction occurs within 180 days of a tenant complaint or protected activity. This is a factual observation. Consult an attorney before proceeding.
            </p>
          </div>
        )}
      </div>

      {/* Defect results */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        {defectResults.map((d) => (
          <div
            key={d.id}
            style={{
              background: d.passed ? GREEN_LIGHT : '#FFF0F0',
              border: `1px solid ${d.passed ? '#2ECC7133' : '#FF6B6B33'}`,
              borderRadius: 10,
              padding: 14,
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
              <span style={{ fontSize: 16 }}>{d.passed ? '\u2713' : '\u2717'}</span>
              <span style={{ fontSize: 14, fontWeight: 600, color: d.passed ? GREEN_DARK : CORAL }}>{d.label}</span>
            </div>
            <p style={{ fontSize: 12, color: INK_MID, margin: 0, lineHeight: 1.5 }}>{d.detail}</p>
          </div>
        ))}
      </div>

      {hasCriticalDefects(defectResults) && (
        <div style={{ marginTop: 20, background: '#FFF0F0', border: `1px solid ${CORAL}33`, borderRadius: 10, padding: 14 }}>
          <p style={{ fontSize: 13, color: CORAL, margin: 0, fontWeight: 600 }}>
            Critical issues detected. Address the items marked above before proceeding. Consider consulting an attorney.
          </p>
        </div>
      )}
    </div>
  );

  const renderReview = () => {
    if (!selectedType || !selectedUnit) return null;
    const noticeInputs = buildNoticeInputs();
    const text = generateNoticeText(selectedType.id, noticeInputs);
    const today = new Date().toISOString().slice(0, 10);
    let effectiveDays = selectedType.days;
    if (serviceMethod === 'substituted' || serviceMethod === 'posting') {
      effectiveDays = addMailServiceDays(selectedType.days, 'within_ca');
    }
    const expDate = calculateExpirationDate(today, effectiveDays, selectedType.excludeWeekendsHolidays);
    const udDate = calculateEarliestUDFiling(expDate);

    const serviceLabels: Record<string, string> = {
      personal: 'Personal service',
      substituted: 'Substituted service (+ mail)',
      posting: 'Posting + mailing',
    };

    return (
      <div>
        <h2 style={{ fontSize: 20, fontWeight: 700, color: N, margin: '0 0 4px' }}>Step 5: Review & Generate</h2>
        <p style={{ fontSize: 14, color: INK_MID, margin: '0 0 20px' }}>
          Review the notice below. Print, save, or email as needed.
        </p>

        <NoticePreview
          noticeText={text}
          tenantName={selectedUnit.tenant_name || 'Tenant'}
          propertyAddress={selectedUnit.address}
          noticeTypeLabel={selectedType.label}
          expirationDate={formatNoticeDate(expDate)}
          earliestUDFiling={formatNoticeDate(udDate)}
          noticeDays={effectiveDays}
          excludeWeekendsHolidays={selectedType.excludeWeekendsHolidays}
          serviceMethod={serviceLabels[serviceMethod] || serviceMethod}
          requiresRelocation={selectedType.requiresRelocation && !tenantCausedCondition}
          relocationAmount={relocationAmount ? parseFloat(relocationAmount) : undefined}
          onSave={handleSave}
          saving={saving}
          saved={saved}
        />
      </div>
    );
  };

  /* ── Main render ── */
  return (
    <div style={{ maxWidth: 640, margin: '0 auto' }}>
      {disclaimerBanner}
      {progressBar}

      <div style={{
        background: '#fff',
        border: `1px solid ${BORDER}`,
        borderRadius: 14,
        padding: 24,
        boxShadow: '0 1px 3px rgba(15,52,96,0.08), 0 4px 12px rgba(15,52,96,0.05)',
      }}>
        {step === 'unit' && renderUnit()}
        {step === 'type' && renderType()}
        {step === 'details' && renderDetails()}
        {step === 'defects' && renderDefects()}
        {step === 'review' && renderReview()}

        {/* Navigation */}
        <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 24, paddingTop: 16, borderTop: `1px solid ${BORDER}` }}>
          <button
            onClick={goBack}
            disabled={currentIdx === 0}
            style={{
              background: 'transparent',
              color: currentIdx === 0 ? INK_MUTED : INK_MID,
              border: `1px solid ${BORDER}`,
              borderRadius: 10,
              padding: '9px 20px',
              fontSize: 13,
              fontWeight: 600,
              cursor: currentIdx === 0 ? 'default' : 'pointer',
              opacity: currentIdx === 0 ? 0.5 : 1,
            }}
          >
            Back
          </button>

          {step !== 'review' && (
            <button
              onClick={goNext}
              disabled={!canGoNext()}
              style={{
                background: canGoNext() ? N : BORDER,
                color: canGoNext() ? '#fff' : INK_MUTED,
                border: 'none',
                borderRadius: 10,
                padding: '9px 20px',
                fontSize: 13,
                fontWeight: 600,
                cursor: canGoNext() ? 'pointer' : 'default',
              }}
            >
              Continue
            </button>
          )}
        </div>
      </div>

      {/* Bottom disclaimer */}
      <div style={{ marginTop: 20, textAlign: 'center' }}>
        <p style={{ fontSize: 12, color: INK_MUTED, margin: '0 0 4px' }}>{DISCLAIMER_TEXT}</p>
        <a
          href={ATTORNEY_REFERRAL_URL}
          target="_blank"
          rel="noopener noreferrer"
          style={{ fontSize: 12, color: TEAL_DARK, fontWeight: 600, textDecoration: 'none' }}
        >
          Find a California Attorney (CA State Bar)
        </a>
      </div>
    </div>
  );
}
