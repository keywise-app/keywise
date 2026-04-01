'use client';
import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { T, input, label, btn } from '../lib/theme';
import AddressInput from './AddressInput';

type Step = 0 | 1 | 2 | 3 | 4 | 5 | 'done';

const STORAGE_KEY = 'kw_wizard_draft';
const BATH_OPTIONS = ['1', '1.5', '2', '2.5', '3', '3.5', '4'];
const PAYMENT_DAYS = ['1', '5', '10', '15', '20', '25', '28'];
const STEPS_LABELS = ['Property', 'Tenant', 'Lease Terms', 'Payments', 'Invite'];

const DAY_LABELS: Record<string, string> = { '1': '1st', '5': '5th', '10': '10th', '15': '15th', '20': '20th', '25': '25th', '28': '28th' };

const emptyForm = {
  property_id: '', building_id: '',
  address: '', unit_number: '', beds: '1', baths: '1', sqft: '',
  monthly_rent: '', mortgage: '', insurance: '',
  tenant_name: '', email: '', phone: '',
  start_date: '', end_date: '', rent: '', deposit: '',
  payment_day: '1', late_fee_percent: '', late_fee_days: '3',
  late_fee_type: 'percent', lease_terms_raw: '',
};

export default function AddTenantWizard({ onClose, onComplete, preselectedUnit }: {
  onClose: () => void;
  onComplete?: (lease: any) => void;
  preselectedUnit?: { id: string; address?: string; unit_number?: string; building_id?: string; current_rent?: number } | null;
}) {
  const [step, setStep] = useState<Step>(0);
  const [method, setMethod] = useState<'pdf' | 'manual' | null>(null);
  const [buildings, setBuildings] = useState<any[]>([]);
  const [units, setUnits] = useState<any[]>([]);
  const [isMobile, setIsMobile] = useState(false);
  const [pdfExtracting, setPdfExtracting] = useState(false);
  const [pdfError, setPdfError] = useState('');
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [addingNewProperty, setAddingNewProperty] = useState(false);
  const [setupPayments, setSetupPayments] = useState(true);
  const [paymentMethod, setPaymentMethod] = useState('external');
  const [inviteMethod, setInviteMethod] = useState<'email' | 'sms' | 'both' | 'skip'>('both');
  const [completing, setCompleting] = useState(false);
  const [confetti, setConfetti] = useState<{ id: number; x: number; color: string; delay: number; dur: number; size: number }[]>([]);
  const [createdLease, setCreatedLease] = useState<any>(null);
  const [form, setForm] = useState({ ...emptyForm });

  const upd = (patch: Partial<typeof emptyForm>) => setForm(f => ({ ...f, ...patch }));

  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth < 768);
    check();
    window.addEventListener('resize', check);
    return () => window.removeEventListener('resize', check);
  }, []);

  useEffect(() => {
    if (preselectedUnit) {
      // Pre-fill from the unit and skip draft restore
      upd({
        property_id: preselectedUnit.id,
        building_id: preselectedUnit.building_id || '',
        address: preselectedUnit.address || '',
        unit_number: preselectedUnit.unit_number || '',
        monthly_rent: preselectedUnit.current_rent ? preselectedUnit.current_rent + '' : '',
        rent: preselectedUnit.current_rent ? preselectedUnit.current_rent + '' : '',
      });
    } else {
      try {
        const saved = localStorage.getItem(STORAGE_KEY);
        if (saved) {
          const d = JSON.parse(saved);
          // Always start at step 0 (method choice), but restore form data
          if (d.form) setForm({ ...emptyForm, ...d.form });
        }
      } catch {}
    }
    fetchProperties();
  }, []);

  useEffect(() => {
    if (typeof step === 'number' && step > 0) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify({ step, method, form }));
    }
  }, [step, method, form]);

  // Pick sensible invite default when arriving at step 5
  useEffect(() => {
    if (step === 5) {
      if (form.email && form.phone) setInviteMethod('both');
      else if (form.email) setInviteMethod('email');
      else if (form.phone) setInviteMethod('sms');
      else setInviteMethod('skip');
    }
  }, [step]);

  // Pre-fill rent when unit is selected
  useEffect(() => {
    if (form.property_id && form.property_id !== '__new') {
      const unit = units.find(u => u.id === form.property_id);
      if (unit?.current_rent) upd({ rent: unit.current_rent + '', monthly_rent: unit.current_rent + '' });
    }
  }, [form.property_id, units]);

  const fetchProperties = async () => {
    const [bRes, uRes] = await Promise.all([
      supabase.from('buildings').select('id,address,name').order('address'),
      supabase.from('properties').select('id,building_id,unit_number,address,beds,baths,current_rent').eq('is_unit', true).order('unit_number'),
    ]);
    // Fall back to properties table if no buildings table rows exist
    if (bRes.data && bRes.data.length > 0) {
      setBuildings(bRes.data);
    } else {
      const { data: fallback } = await supabase
        .from('properties')
        .select('id,address,name')
        .eq('is_unit', false)
        .order('address');
      if (fallback) setBuildings(fallback);
    }
    if (uRes.data) setUnits(uRes.data);
  };

  const handlePdfUpload = async (file: File) => {
    if (file.size > 20 * 1024 * 1024) {
      setPdfError('large');
      return;
    }
    setPdfExtracting(true); setPdfError('');
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        setPdfError('Not signed in. Please sign in and try again.');
        setPdfExtracting(false);
        return;
      }

      const ext = file.name.split('.').pop() || 'pdf';
      const path = user.id + '/temp-lease-' + Date.now() + '.' + ext;
      const { error: uploadError } = await supabase.storage.from('documents').upload(path, file);
      if (uploadError) {
        setPdfError('Upload failed: ' + uploadError.message);
        setPdfExtracting(false);
        return;
      }

      const { data: signedData } = await supabase.storage.from('documents').createSignedUrl(path, 300);
      const signedUrl = signedData?.signedUrl;
      if (!signedUrl) {
        setPdfError('Could not get file URL. Please try again.');
        setPdfExtracting(false);
        return;
      }

      const res = await fetch('/api/extract-lease', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ fileUrl: signedUrl, fileType: file.type || 'application/pdf' }),
      });

      if (!res.ok) {
        const text = await res.text();
        console.error('[extract-lease] HTTP error:', res.status, text);
        setPdfError('Server error (' + res.status + '). Please try again or enter manually.');
        setPdfExtracting(false);
        return;
      }

      const data = await res.json();
      console.log('[extract-lease] response:', data);

      if (data.error) {
        setPdfError('Could not read lease: ' + data.error);
        setPdfExtracting(false);
        return;
      }

      upd({
        tenant_name: data.tenant_name || '',
        email: data.email || '',
        phone: data.phone || '',
        address: data.property || '',
        rent: data.rent ? data.rent + '' : '',
        monthly_rent: data.rent ? data.rent + '' : '',
        deposit: data.deposit ? data.deposit + '' : '',
        start_date: data.start_date || '',
        end_date: data.end_date || '',
        payment_day: data.payment_day ? data.payment_day + '' : '1',
        late_fee_percent: data.late_fee_percent ? data.late_fee_percent + '' : data.late_fee_fixed ? data.late_fee_fixed + '' : '',
        late_fee_days: data.late_fee_days ? data.late_fee_days + '' : '3',
        late_fee_type: data.late_fee_type || 'percent',
        lease_terms_raw: data.late_fee_clause || '',
        beds: data.beds ? data.beds + '' : '1',
        baths: data.baths ? data.baths + '' : '1',
        sqft: data.sqft ? data.sqft + '' : '',
      });
      setPdfExtracting(false);
      setMethod('pdf');
      setStep(preselectedUnit ? 2 : 1);
    } catch (err: any) {
      console.error('[extract-lease] upload error:', err);
      setPdfError('Upload failed: ' + (err?.message || 'unknown error'));
      setPdfExtracting(false);
    }
  };

  const pickPdf = () => {
    const inp = document.createElement('input');
    inp.type = 'file';
    inp.accept = '.pdf,image/jpeg,image/png,image/webp';
    inp.onchange = (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (file) handlePdfUpload(file);
    };
    inp.click();
  };

  const complete = async () => {
    setCompleting(true);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { setCompleting(false); return; }

    let propertyAddress = form.address;

    if (form.property_id && form.property_id !== '__new') {
      const unit = units.find(u => u.id === form.property_id);
      propertyAddress = unit?.address || (unit?.unit_number ? 'Unit ' + unit.unit_number : form.address);
    } else if (form.building_id && !addingNewProperty) {
      const building = buildings.find(b => b.id === form.building_id);
      propertyAddress = (building?.address || '') + (form.unit_number ? ', Unit ' + form.unit_number : '');
    } else if (form.address) {
      // Create new building record
      const { data: bld } = await supabase.from('properties').insert({
        user_id: user.id,
        address: form.address,
        is_unit: false,
        type: 'Single Family',
        num_units: 1,
        mortgage: +form.mortgage || 0,
        insurance: +form.insurance || 0,
      }).select('id').single();

      if (bld) {
        await supabase.from('properties').insert({
          user_id: user.id,
          building_id: bld.id,
          address: form.address + (form.unit_number ? ', Unit ' + form.unit_number : ''),
          unit_number: form.unit_number || null,
          is_unit: true,
          beds: +form.beds || 1,
          baths: parseFloat(form.baths) || 1,
          sqft: +form.sqft || null,
          current_rent: +form.monthly_rent || 0,
        });
      }
      propertyAddress = form.address + (form.unit_number ? ', Unit ' + form.unit_number : '');
    }

    const { data: lease, error } = await supabase.from('leases').insert({
      user_id: user.id,
      tenant_name: form.tenant_name,
      email: form.email || null,
      phone: form.phone || null,
      property: propertyAddress,
      rent: +form.rent || +form.monthly_rent || 0,
      deposit: +form.deposit || 0,
      start_date: form.start_date || null,
      end_date: form.end_date || null,
      status: 'active',
      payment_day: +form.payment_day || 1,
      late_fee_percent: +form.late_fee_percent || 0,
      late_fee_days: +form.late_fee_days || 3,
      late_fee_type: form.late_fee_type || 'percent',
      lease_terms_raw: form.lease_terms_raw || '',
    }).select().single();

    if (error) { alert('Error saving lease: ' + error.message); setCompleting(false); return; }

    if (inviteMethod !== 'skip' && form.email) {
      await fetch('/api/invite-tenant', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ lease_id: lease.id, tenant_email: form.email, tenant_name: form.tenant_name }),
      });
    }

    localStorage.removeItem(STORAGE_KEY);
    setCreatedLease(lease);
    setCompleting(false);
    setStep('done');
    setConfetti(Array.from({ length: 55 }, (_, i) => ({
      id: i,
      x: Math.random() * 100,
      color: [T.teal, T.navy, '#FFB347', '#FF6B6B', '#2ECC71', '#A78BFA'][i % 6],
      delay: Math.random() * 0.7,
      dur: 1.2 + Math.random() * 0.9,
      size: 6 + Math.random() * 8,
    })));
  };

  const goNext = () => {
    // Skip step 1 if unit is pre-selected
    if (preselectedUnit && step === 0) { setStep(2); return; }
    setStep(s => ((s as number) + 1) as Step);
  };
  const goBack = () => {
    // Skip step 1 going back if unit is pre-selected
    if (preselectedUnit && step === 2) { setStep(0); return; }
    if (step === 1) { setStep(0); setMethod(null); }
    else setStep(s => ((s as number) - 1) as Step);
  };

  const useNewProperty = buildings.length === 0 || addingNewProperty;
  const canNext1 = useNewProperty
    ? !!(form.address && form.monthly_rent)
    : !!form.building_id;
  const canNext2 = !!form.tenant_name;

  const selectedUnit = units.find(u => u.id === form.property_id);
  const propertyLabel = selectedUnit
    ? (selectedUnit.address || (selectedUnit.unit_number ? 'Unit ' + selectedUnit.unit_number : ''))
    : form.address || 'your property';

  // Layout
  const wrapStyle: React.CSSProperties = {
    position: 'fixed', inset: 0,
    background: 'rgba(15,52,96,0.55)',
    zIndex: 1000,
    display: 'flex',
    alignItems: isMobile ? 'flex-end' : 'center',
    justifyContent: 'center',
    padding: isMobile ? 0 : 24,
  };
  const panelStyle: React.CSSProperties = isMobile ? {
    background: T.surface, borderRadius: '20px 20px 0 0',
    width: '100%', maxHeight: '96vh',
    display: 'flex', flexDirection: 'column', overflow: 'hidden',
  } : {
    background: T.surface, borderRadius: 20,
    width: '100%', maxWidth: 580, maxHeight: '90vh',
    display: 'flex', flexDirection: 'column',
    boxShadow: '0 24px 64px rgba(15,52,96,0.28)',
    overflow: 'hidden',
  };

  const stepNum = typeof step === 'number' ? step : 0;

  return (
    <div style={wrapStyle} onClick={step === 0 ? onClose : undefined}>
      <div style={panelStyle} onClick={e => e.stopPropagation()}>
        <style>{`
          @keyframes kw-fall { 0%{transform:translateY(0) rotate(0deg);opacity:1} 100%{transform:translateY(180px) rotate(540deg);opacity:0} }
          @keyframes kw-spin { from{transform:rotate(0deg)} to{transform:rotate(360deg)} }
        `}</style>

        {/* ── Header ── */}
        <div style={{ padding: '17px 20px', borderBottom: `1px solid ${T.border}`, display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexShrink: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            {step !== 0 && step !== 'done' && (
              <button onClick={goBack} style={{ background: 'none', border: 'none', cursor: 'pointer', color: T.inkMuted, fontSize: 18, padding: '0 6px 0 0', lineHeight: 1 }}>←</button>
            )}
            <span style={{ fontWeight: 700, fontSize: 15, color: T.navy }}>
              {step === 'done' ? 'All done!' : 'Add Tenant'}
            </span>
          </div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: T.inkMuted, fontSize: 20, padding: 0, lineHeight: 1, width: 28, height: 28, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>✕</button>
        </div>

        {/* ── Progress ── */}
        {stepNum >= 1 && stepNum <= 5 && (
          <div style={{ padding: '10px 20px', borderBottom: `1px solid ${T.border}`, background: T.bg, flexShrink: 0 }}>
            <div style={{ display: 'flex', gap: 5, marginBottom: 6 }}>
              {STEPS_LABELS.map((_, i) => (
                <div key={i} style={{ flex: 1, height: 3, borderRadius: 2, background: i < stepNum - 1 ? T.teal : i === stepNum - 1 ? T.navy : T.border, transition: 'background 0.3s' }} />
              ))}
            </div>
            <div style={{ fontSize: 11, color: T.inkMuted, fontWeight: 600 }}>
              Step {stepNum} of 5 — {STEPS_LABELS[stepNum - 1]}
            </div>
          </div>
        )}

        {/* ── Pre-selected unit banner ── */}
        {preselectedUnit && step !== 'done' && (
          <div style={{ padding: '10px 20px', background: T.tealLight, borderBottom: `1px solid ${T.teal}44`, fontSize: 12, color: T.tealDark, fontWeight: 600, flexShrink: 0 }}>
            📍 Adding tenant for {preselectedUnit.unit_number ? 'Unit ' + preselectedUnit.unit_number + ' · ' : ''}{preselectedUnit.address || 'selected unit'}
          </div>
        )}

        {/* ── Scrollable body ── */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '24px 20px' }}>

          {/* STEP 0 */}
          {step === 0 && (
            <div>
              <div style={{ textAlign: 'center', marginBottom: 28 }}>
                <div style={{ fontSize: 22, marginBottom: 8 }}>👋</div>
                <div style={{ fontSize: 20, fontWeight: 700, color: T.navy, marginBottom: 6 }}>Add a tenant</div>
                <div style={{ fontSize: 13, color: T.inkMuted }}>How would you like to get started?</div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr', gap: 14, marginBottom: 20 }}>
                <div role="button" onClick={() => !pdfExtracting && pickPdf()}
                  style={{ background: T.surface, border: `2px solid ${T.teal}66`, borderRadius: 14, padding: '26px 18px', cursor: pdfExtracting ? 'default' : 'pointer', transition: 'all 0.15s' }}
                  onMouseEnter={e => { if (!pdfExtracting) (e.currentTarget as HTMLElement).style.background = T.tealLight; }}
                  onMouseLeave={e => (e.currentTarget as HTMLElement).style.background = T.surface}
                >
                  <div style={{ fontSize: 30, marginBottom: 10 }}>📄</div>
                  <div style={{ fontWeight: 700, fontSize: 14, color: T.navy, marginBottom: 5 }}>Upload Lease PDF</div>
                  <div style={{ fontSize: 12, color: T.inkMuted, lineHeight: 1.5, marginBottom: 10 }}>AI reads tenant info, dates, rent and terms automatically</div>
                  <span style={{ fontSize: 10, fontWeight: 700, background: T.teal, color: '#fff', padding: '3px 8px', borderRadius: 20, letterSpacing: '0.3px' }}>RECOMMENDED</span>
                </div>

                <div role="button" onClick={() => { setMethod('manual'); setStep(1); }}
                  style={{ background: T.surface, border: `2px solid ${T.border}`, borderRadius: 14, padding: '26px 18px', cursor: 'pointer', transition: 'all 0.15s' }}
                  onMouseEnter={e => { (e.currentTarget as HTMLElement).style.borderColor = T.navy; (e.currentTarget as HTMLElement).style.background = T.bg; }}
                  onMouseLeave={e => { (e.currentTarget as HTMLElement).style.borderColor = T.border; (e.currentTarget as HTMLElement).style.background = T.surface; }}
                >
                  <div style={{ fontSize: 30, marginBottom: 10 }}>✏️</div>
                  <div style={{ fontWeight: 700, fontSize: 14, color: T.navy, marginBottom: 5 }}>Enter Manually</div>
                  <div style={{ fontSize: 12, color: T.inkMuted, lineHeight: 1.5 }}>Fill in each field step by step — takes about 2 minutes</div>
                </div>
              </div>

              {pdfExtracting && (
                <div style={{ background: T.tealLight, border: `1px solid ${T.teal}44`, borderRadius: 12, padding: '16px 20px', display: 'flex', alignItems: 'center', gap: 14 }}>
                  <span style={{ fontSize: 20, display: 'inline-block', animation: 'kw-spin 1.5s linear infinite' }}>⟳</span>
                  <div>
                    <div style={{ fontWeight: 700, color: T.tealDark, fontSize: 14 }}>Reading your lease...</div>
                    <div style={{ color: T.inkMuted, fontSize: 12, marginTop: 2 }}>Usually takes 10–20 seconds</div>
                  </div>
                </div>
              )}
              {pdfError === 'large' && (
                <div style={{ background: '#FFF0F0', border: `1px solid ${T.coral}44`, borderRadius: 10, padding: '14px 16px' }}>
                  <div style={{ fontSize: 13, color: T.coral, fontWeight: 600, marginBottom: 10 }}>
                    ⚠ Your PDF is larger than 10MB. Please compress it first, or enter your lease details manually.
                  </div>
                  <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' as const }}>
                    <a href="https://smallpdf.com/compress-pdf" target="_blank" rel="noopener noreferrer"
                      style={{ ...btn.teal, fontSize: 12, padding: '6px 14px', textDecoration: 'none', display: 'inline-flex', alignItems: 'center' }}>
                      Open SmallPDF →
                    </a>
                    <button onClick={() => { setMethod('manual'); setStep(1); }}
                      style={{ ...btn.ghost, fontSize: 12, padding: '6px 14px' }}>
                      Enter Manually →
                    </button>
                  </div>
                </div>
              )}
              {pdfError && pdfError !== 'large' && (
                <div style={{ background: '#FFF0F0', border: `1px solid ${T.coral}44`, borderRadius: 10, padding: '12px 16px', fontSize: 13, color: T.coral }}>
                  ⚠ {pdfError}{' '}
                  <button onClick={() => { setMethod('manual'); setStep(1); }}
                    style={{ background: 'none', border: 'none', cursor: 'pointer', color: T.navy, fontWeight: 700, padding: 0, fontSize: 13 }}>
                    Enter manually instead →
                  </button>
                </div>
              )}
            </div>
          )}

          {/* STEP 1 — Property */}
          {step === 1 && (
            <div>
              <div style={{ marginBottom: 20 }}>
                <div style={{ fontWeight: 700, fontSize: 18, color: T.navy, marginBottom: 4 }}>
                  {!useNewProperty ? 'Which property is this for?' : 'Property details'}
                </div>
                <div style={{ fontSize: 13, color: T.inkMuted }}>
                  {method === 'pdf' ? 'Extracted from your lease — confirm or edit.' : !useNewProperty ? 'Select a unit for this tenant.' : "We'll use this to track the lease."}
                </div>
              </div>

              {!useNewProperty ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                  <div>
                    <label style={label}>Building</label>
                    <select style={input} value={form.building_id}
                      onChange={e => upd({ building_id: e.target.value, property_id: '' })}>
                      <option value="">— Select a building —</option>
                      {buildings.map(b => <option key={b.id} value={b.id}>{b.name || b.address}</option>)}
                    </select>
                  </div>
                  {form.building_id && (
                    <div>
                      <label style={label}>Unit</label>
                      <select style={input} value={form.property_id}
                        onChange={e => upd({ property_id: e.target.value })}>
                        <option value="">— Select a unit (optional) —</option>
                        {units.filter(u => u.building_id === form.building_id).map(u => (
                          <option key={u.id} value={u.id}>
                            {u.unit_number ? 'Unit ' + u.unit_number + (u.beds ? ' · ' + u.beds + 'bd' : '') : u.address}
                            {(u.beds || u.baths) ? ` — ${u.beds || '?'}bd/${u.baths || '?'}ba` : ''}
                            {u.current_rent ? ` · $${u.current_rent}/mo` : ''}
                          </option>
                        ))}
                      </select>
                    </div>
                  )}
                  <div style={{ borderTop: `1px solid ${T.border}`, paddingTop: 14 }}>
                    <button onClick={() => setAddingNewProperty(true)}
                      style={{ background: 'none', border: 'none', cursor: 'pointer', color: T.navy, fontSize: 13, fontWeight: 600, padding: 0 }}>
                      + Add a new property instead
                    </button>
                  </div>
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                  {buildings.length > 0 && addingNewProperty && (
                    <button onClick={() => setAddingNewProperty(false)}
                      style={{ background: 'none', border: 'none', cursor: 'pointer', color: T.inkMuted, fontSize: 12, fontWeight: 600, padding: '0 0 4px', textAlign: 'left' }}>
                      ← Use an existing property
                    </button>
                  )}
                  <div>
                    <label style={label}>Property address *</label>
                    <AddressInput value={form.address} onChange={(v: string) => upd({ address: v })} placeholder="42 Maple St, Dana Point, CA 92629" />
                  </div>
                  <div>
                    <label style={label}>Unit number (optional)</label>
                    <input style={input} value={form.unit_number} placeholder="2B" onChange={e => upd({ unit_number: e.target.value })} />
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 10 }}>
                    <div>
                      <label style={label}>Beds</label>
                      <select style={input} value={form.beds} onChange={e => upd({ beds: e.target.value })}>
                        <option value="0">Studio</option>
                        {['1','2','3','4','5'].map(b => <option key={b} value={b}>{b}</option>)}
                      </select>
                    </div>
                    <div>
                      <label style={label}>Baths</label>
                      <select style={input} value={form.baths} onChange={e => upd({ baths: e.target.value })}>
                        {BATH_OPTIONS.map(b => <option key={b} value={b}>{b}</option>)}
                      </select>
                    </div>
                    <div>
                      <label style={label}>Sqft</label>
                      <input style={input} type="number" value={form.sqft} placeholder="950" onChange={e => upd({ sqft: e.target.value })} />
                    </div>
                  </div>
                  <div>
                    <label style={label}>Monthly rent ($) *</label>
                    <input style={input} type="number" value={form.monthly_rent} placeholder="2500"
                      onChange={e => upd({ monthly_rent: e.target.value, rent: e.target.value })} />
                  </div>
                  <button onClick={() => setShowAdvanced(v => !v)}
                    style={{ background: 'none', border: 'none', cursor: 'pointer', color: T.inkMuted, fontSize: 12, fontWeight: 600, padding: '2px 0', textAlign: 'left', display: 'flex', alignItems: 'center', gap: 5 }}>
                    {showAdvanced ? '▾' : '▸'} Building costs (optional)
                  </button>
                  {showAdvanced && (
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, paddingLeft: 12, borderLeft: `3px solid ${T.border}` }}>
                      <div>
                        <label style={label}>Mortgage / mo</label>
                        <input style={input} type="number" value={form.mortgage} placeholder="1800" onChange={e => upd({ mortgage: e.target.value })} />
                      </div>
                      <div>
                        <label style={label}>Insurance / mo</label>
                        <input style={input} type="number" value={form.insurance} placeholder="120" onChange={e => upd({ insurance: e.target.value })} />
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {/* STEP 2 — Tenant info */}
          {step === 2 && (
            <div>
              <div style={{ marginBottom: 22 }}>
                <div style={{ fontWeight: 700, fontSize: 18, color: T.navy, marginBottom: 4 }}>Tenant info</div>
                <div style={{ fontSize: 13, color: T.inkMuted }}>This is all we need to get started.</div>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                <div>
                  <label style={label}>Full name *</label>
                  <input style={input} value={form.tenant_name} placeholder="Jane Smith" autoFocus
                    onChange={e => upd({ tenant_name: e.target.value })} />
                </div>
                <div>
                  <label style={label}>Email address</label>
                  <input style={input} type="email" value={form.email} placeholder="jane@example.com"
                    onChange={e => upd({ email: e.target.value })} />
                </div>
                <div>
                  <label style={label}>Phone number</label>
                  <input style={input} type="tel" value={form.phone} placeholder="(555) 000-0000"
                    onChange={e => upd({ phone: e.target.value })} />
                </div>
              </div>
            </div>
          )}

          {/* STEP 3 — Lease terms */}
          {step === 3 && (
            <div>
              <div style={{ marginBottom: 18 }}>
                <div style={{ fontWeight: 700, fontSize: 18, color: T.navy, marginBottom: 6 }}>Lease terms</div>
                {method === 'pdf' && (
                  <div style={{ display: 'inline-flex', alignItems: 'center', gap: 6, background: T.tealLight, color: T.tealDark, fontSize: 11, fontWeight: 700, padding: '4px 10px', borderRadius: 20 }}>
                    ✦ Pre-filled from your PDF — review and confirm
                  </div>
                )}
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
                <div>
                  <label style={label}>Lease start</label>
                  <input style={input} type="date" value={form.start_date} onChange={e => upd({ start_date: e.target.value })} />
                </div>
                <div>
                  <label style={label}>Lease end</label>
                  <input style={input} type="date" value={form.end_date} onChange={e => upd({ end_date: e.target.value })} />
                </div>
                <div>
                  <label style={label}>Monthly rent ($)</label>
                  <input style={input} type="number" value={form.rent || form.monthly_rent} placeholder="2500"
                    onChange={e => upd({ rent: e.target.value, monthly_rent: e.target.value })} />
                </div>
                <div>
                  <label style={label}>Security deposit ($)</label>
                  <input style={input} type="number" value={form.deposit} placeholder="2500"
                    onChange={e => upd({ deposit: e.target.value })} />
                </div>
                <div>
                  <label style={label}>Rent due day</label>
                  <select style={input} value={form.payment_day} onChange={e => upd({ payment_day: e.target.value })}>
                    {PAYMENT_DAYS.map(d => <option key={d} value={d}>{DAY_LABELS[d]}</option>)}
                  </select>
                </div>
                <div>
                  <label style={label}>Grace period (days)</label>
                  <input style={input} type="number" value={form.late_fee_days} placeholder="3"
                    onChange={e => upd({ late_fee_days: e.target.value })} />
                </div>
                <div style={{ gridColumn: '1 / -1' }}>
                  <label style={label}>Late fee</label>
                  <div style={{ display: 'flex', gap: 8 }}>
                    <input style={{ ...input, flex: 1 }} type="number" value={form.late_fee_percent} placeholder="5"
                      onChange={e => upd({ late_fee_percent: e.target.value })} />
                    <select style={{ ...input, width: 110, flex: 'none' as any }} value={form.late_fee_type}
                      onChange={e => upd({ late_fee_type: e.target.value })}>
                      <option value="percent">% of rent</option>
                      <option value="fixed">$ fixed</option>
                    </select>
                  </div>
                </div>
              </div>
              {form.lease_terms_raw && (
                <div style={{ marginTop: 16, background: T.bg, border: `1px solid ${T.border}`, borderRadius: 10, padding: '12px 14px' }}>
                  <div style={{ fontSize: 10, fontWeight: 700, color: T.inkMuted, textTransform: 'uppercase', letterSpacing: '0.4px', marginBottom: 6 }}>Extracted clause</div>
                  <div style={{ fontSize: 12, color: T.inkMid, lineHeight: 1.6, fontStyle: 'italic' }}>"{form.lease_terms_raw}"</div>
                </div>
              )}
            </div>
          )}

          {/* STEP 4 — Payment setup */}
          {step === 4 && (
            <div>
              <div style={{ marginBottom: 22 }}>
                <div style={{ fontWeight: 700, fontSize: 18, color: T.navy, marginBottom: 4 }}>Payment setup</div>
                <div style={{ fontSize: 13, color: T.inkMuted }}>How will {form.tenant_name || 'your tenant'} pay rent?</div>
              </div>

              <div style={{ marginBottom: 18 }}>
                <div style={{ fontWeight: 600, fontSize: 14, color: T.ink, marginBottom: 10 }}>Track payments for this lease?</div>
                <div style={{ display: 'flex', gap: 10 }}>
                  {[true, false].map(v => (
                    <button key={String(v)} onClick={() => setSetupPayments(v)}
                      style={{ flex: 1, padding: '11px 14px', borderRadius: 10, border: `2px solid ${setupPayments === v ? T.navy : T.border}`, background: setupPayments === v ? T.navy : T.surface, color: setupPayments === v ? '#fff' : T.inkMuted, fontWeight: 600, fontSize: 13, cursor: 'pointer', transition: 'all 0.15s', fontFamily: 'inherit' }}>
                      {v ? 'Yes, track payments' : 'Skip for now'}
                    </button>
                  ))}
                </div>
              </div>

              {setupPayments && (
                <>
                  <div style={{ marginBottom: 14 }}>
                    <div style={{ fontWeight: 600, fontSize: 14, color: T.ink, marginBottom: 10 }}>Payment method</div>
                    {[
                      { id: 'online', label: 'Online via Keywise', desc: 'Tenant pays online — tracked automatically' },
                      { id: 'external', label: 'Zelle / Check / Cash', desc: 'You mark payments as received manually' },
                    ].map(m => (
                      <button key={m.id} onClick={() => setPaymentMethod(m.id)}
                        style={{ display: 'flex', alignItems: 'center', gap: 12, width: '100%', padding: '12px 14px', borderRadius: 10, border: `2px solid ${paymentMethod === m.id ? T.teal : T.border}`, background: paymentMethod === m.id ? T.tealLight : T.surface, cursor: 'pointer', textAlign: 'left', marginBottom: 8, transition: 'all 0.15s', fontFamily: 'inherit' }}>
                        <div style={{ width: 16, height: 16, borderRadius: '50%', border: `2px solid ${paymentMethod === m.id ? T.teal : T.border}`, background: paymentMethod === m.id ? T.teal : 'transparent', flexShrink: 0 }} />
                        <div>
                          <div style={{ fontWeight: 600, fontSize: 13, color: T.ink }}>{m.label}</div>
                          <div style={{ fontSize: 12, color: T.inkMuted, marginTop: 2 }}>{m.desc}</div>
                        </div>
                      </button>
                    ))}
                  </div>

                  {(form.rent || form.monthly_rent) && (
                    <div style={{ background: T.bg, border: `1px solid ${T.border}`, borderRadius: 12, padding: '14px 16px' }}>
                      <div style={{ fontSize: 11, fontWeight: 700, color: T.inkMuted, textTransform: 'uppercase', letterSpacing: '0.4px', marginBottom: 10 }}>First 3 payments</div>
                      {[0, 1, 2].map(i => {
                        const rent = +(form.rent || form.monthly_rent);
                        const day = Math.min(+form.payment_day || 1, 28);
                        const base = form.start_date ? new Date(form.start_date + 'T12:00:00') : new Date();
                        const d = new Date(base.getFullYear(), base.getMonth() + i, day);
                        return (
                          <div key={i} style={{ display: 'flex', justifyContent: 'space-between', padding: '7px 0', borderBottom: i < 2 ? `1px solid ${T.border}` : 'none' }}>
                            <span style={{ fontSize: 13, color: T.ink }}>{d.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}</span>
                            <span style={{ fontSize: 13, fontWeight: 700, color: T.navy }}>${rent.toLocaleString()}</span>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </>
              )}
            </div>
          )}

          {/* STEP 5 — Invite */}
          {step === 5 && (
            <div>
              <div style={{ marginBottom: 22 }}>
                <div style={{ fontWeight: 700, fontSize: 18, color: T.navy, marginBottom: 4 }}>
                  Invite {form.tenant_name || 'your tenant'} to Keywise
                </div>
                <div style={{ fontSize: 13, color: T.inkMuted }}>They'll get a secure link to view their lease, pay rent, and message you.</div>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 18 }}>
                {([
                  { id: 'email', label: 'Send email invitation', icon: '📧', avail: !!form.email, missing: 'email' },
                  { id: 'sms', label: 'Send SMS invitation', icon: '💬', avail: !!form.phone, missing: 'phone' },
                  { id: 'both', label: 'Email + SMS', icon: '✦', avail: !!(form.email && form.phone), missing: '' },
                  { id: 'skip', label: "Skip — I'll invite them later", icon: '→', avail: true, missing: '' },
                ] as const).map(m => (
                  <button key={m.id} onClick={() => m.avail && setInviteMethod(m.id)}
                    style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '12px 14px', borderRadius: 10, border: `2px solid ${inviteMethod === m.id ? T.navy : T.border}`, background: inviteMethod === m.id ? T.navy : T.surface, cursor: m.avail ? 'pointer' : 'not-allowed', textAlign: 'left', opacity: m.avail ? 1 : 0.4, transition: 'all 0.15s', fontFamily: 'inherit', width: '100%' }}>
                    <span style={{ fontSize: 16, width: 22, textAlign: 'center', flexShrink: 0 }}>{m.icon}</span>
                    <span style={{ flex: 1, fontWeight: 600, fontSize: 13, color: inviteMethod === m.id ? '#fff' : T.ink }}>{m.label}</span>
                    {!m.avail && m.missing && <span style={{ fontSize: 10, color: T.inkMuted }}>no {m.missing}</span>}
                  </button>
                ))}
              </div>

              {inviteMethod !== 'skip' && (
                <div style={{ background: T.bg, border: `1px solid ${T.border}`, borderRadius: 12, padding: '14px 16px' }}>
                  <div style={{ fontSize: 10, fontWeight: 700, color: T.inkMuted, textTransform: 'uppercase', letterSpacing: '0.4px', marginBottom: 8 }}>Message preview</div>
                  <div style={{ fontSize: 13, color: T.inkMid, lineHeight: 1.7 }}>
                    Hi <strong>{form.tenant_name || 'there'}</strong>! Your landlord has invited you to <strong>Keywise</strong> to manage your lease at {propertyLabel}. View your lease, pay rent, and message your landlord — all in one place.
                  </div>
                </div>
              )}
            </div>
          )}

          {/* DONE */}
          {step === 'done' && (
            <div style={{ textAlign: 'center', padding: '8px 0 16px' }}>
              <div style={{ position: 'relative', height: 80, overflow: 'hidden', marginBottom: 4 }}>
                {confetti.map(p => (
                  <div key={p.id} style={{ position: 'absolute', left: p.x + '%', top: -12, width: p.size, height: p.size, borderRadius: 2, background: p.color, animation: `kw-fall ${p.dur}s ${p.delay}s ease-in forwards` }} />
                ))}
              </div>
              <div style={{ fontSize: 42, marginBottom: 10 }}>🎉</div>
              <div style={{ fontWeight: 700, fontSize: 22, color: T.navy, marginBottom: 6 }}>
                {form.tenant_name} is all set!
              </div>
              <div style={{ fontSize: 13, color: T.inkMuted, marginBottom: 6 }}>Lease created successfully</div>
              <div style={{ fontSize: 13, color: T.inkMid, background: T.bg, borderRadius: 10, padding: '8px 16px', display: 'inline-block', marginBottom: 28 }}>
                📍 {propertyLabel}
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                <button onClick={() => { onComplete?.(createdLease); onClose(); }}
                  style={{ ...btn.primary, display: 'flex', justifyContent: 'center', padding: '12px 24px', fontSize: 14, background: T.teal, color: T.navy, width: '100%' }}>
                  View tenant →
                </button>
                <button onClick={onClose}
                  style={{ ...btn.ghost, display: 'flex', justifyContent: 'center', padding: '12px 24px', fontSize: 14, width: '100%' }}>
                  Done
                </button>
              </div>
            </div>
          )}
        </div>

        {/* ── Footer nav ── */}
        {stepNum >= 1 && stepNum <= 5 && (
          <div style={{ padding: '14px 20px', borderTop: `1px solid ${T.border}`, display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexShrink: 0 }}>
            <button onClick={goBack} style={{ ...btn.ghost, fontSize: 13 }}>← Back</button>
            {stepNum < 5 ? (
              <button onClick={goNext}
                disabled={(stepNum === 1 && !canNext1) || (stepNum === 2 && !canNext2)}
                style={{ ...btn.primary, opacity: ((stepNum === 1 && !canNext1) || (stepNum === 2 && !canNext2)) ? 0.45 : 1, cursor: ((stepNum === 1 && !canNext1) || (stepNum === 2 && !canNext2)) ? 'not-allowed' : 'pointer' }}>
                Continue →
              </button>
            ) : (
              <button onClick={complete} disabled={completing}
                style={{ ...btn.primary, background: T.teal, color: T.navy, fontWeight: 700, padding: '10px 22px', opacity: completing ? 0.6 : 1, cursor: completing ? 'default' : 'pointer' }}>
                {completing ? 'Setting up...' : 'Complete Setup →'}
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
