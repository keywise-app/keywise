'use client';
import { useState, useEffect, useRef } from 'react';
import { supabase } from '../lib/supabase';
import { T, input, label, btn } from '../lib/theme';

type Lease = {
  id: string;
  tenant_name: string;
  property: string;
  rent: number;
  deposit: number;
  start_date: string;
  end_date: string;
  status: string;
  email: string;
  phone: string;
  payment_day: number;
  payment_frequency: string;
  late_fee_percent: number;
  late_fee_days: number;
  late_fee_type: string;
  lease_terms_raw: string;
};

type RenewalOptions = {
  increaseType: 'fixed' | 'percent' | 'market';
  increaseValue: string;
  newTerm: '12' | '6' | 'month-to-month';
  notes: string;
};

function getDaysLeft(endDate: string) {
  return Math.ceil((new Date(endDate).getTime() - new Date().getTime()) / 86400000);
}

function formatDaysLeft(days: number) {
  if (days < 0) return 'Expired ' + Math.abs(days) + ' days ago';
  if (days === 0) return 'Expires today';
  if (days === 1) return 'Expires tomorrow';
  if (days <= 90) return days + ' days left';
  const months = Math.floor(days / 30);
  return months + ' month' + (months !== 1 ? 's' : '') + ' left';
}

function getLeaseStatus(endDate: string) {
  const days = getDaysLeft(endDate);
  if (days < 0) return { label: 'EXPIRED', color: T.coral, bg: T.coralLight };
  if (days <= 60) return { label: 'EXPIRES SOON', color: T.amber, bg: T.amberLight };
  if (days <= 90) return { label: 'RENEW SOON', color: T.amberDark, bg: T.amberLight };
  return { label: 'ACTIVE', color: T.greenDark, bg: T.greenLight };
}

const LEASE_FIELDS = [
  { label: 'Tenant Full Name', key: 'tenant_name', type: 'text' },
  { label: 'Property Address', key: 'property', type: 'text' },
  { label: 'Monthly Rent ($)', key: 'rent', type: 'number' },
  { label: 'Security Deposit ($)', key: 'deposit', type: 'number' },
  { label: 'Lease Start Date', key: 'start_date', type: 'date' },
  { label: 'Lease End Date', key: 'end_date', type: 'date' },
  { label: 'Tenant Email', key: 'email', type: 'email' },
  { label: 'Tenant Phone', key: 'phone', type: 'text' },
];

export default function Leases() {
  const [tab, setTab] = useState<'tracker' | 'generator'>('tracker');
  const [leases, setLeases] = useState<Lease[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAdd, setShowAdd] = useState(false);
  const [saving, setSaving] = useState(false);
  const [extracting, setExtracting] = useState(false);
  const [extractError, setExtractError] = useState('');
  const [dragOver, setDragOver] = useState(false);
  const [renewalDrafts, setRenewalDrafts] = useState<{ [key: string]: string }>({});
  const [draftingId, setDraftingId] = useState<string | null>(null);
  const [renewalWizard, setRenewalWizard] = useState<Lease | null>(null);
  const [renewalOptions, setRenewalOptions] = useState<RenewalOptions>({
    increaseType: 'percent', increaseValue: '3', newTerm: '12', notes: '',
  });
  const [editingLease, setEditingLease] = useState<Lease | null>(null);
  const [editForm, setEditForm] = useState<any>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [newLease, setNewLease] = useState({
    tenant_name: '', property: '', rent: '', deposit: '',
    start_date: '', end_date: '', email: '', phone: '',
    payment_day: '1', payment_frequency: 'monthly',
    late_fee_percent: '5', late_fee_days: '3',
    late_fee_type: 'percent', lease_terms_raw: '',
  });

  const [form, setForm] = useState({
    tenant: '', property: '', rent: '', deposit: '',
    start: '', end: '', state: 'California',
    pets: 'no pets', parking: 'included', laundry: 'in-unit',
  });
  const [generatedLease, setGeneratedLease] = useState('');
  const [generating, setGenerating] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth < 768);
    check();
    window.addEventListener('resize', check);
    return () => window.removeEventListener('resize', check);
  }, []);

  useEffect(() => { fetchLeases(); }, []);

  const fetchLeases = async () => {
    setLoading(true);
    const { data, error } = await supabase.from('leases').select('*').order('end_date', { ascending: true });
    if (!error && data) setLeases(data);
    setLoading(false);
  };

  const extractLeaseData = async (file: File) => {
    setExtracting(true);
    setExtractError('');
    try {
      const base64 = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve((reader.result as string).split(',')[1]);
        reader.onerror = reject;
        reader.readAsDataURL(file);
      });
      const res = await fetch('/api/extract-lease', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ base64, fileType: file.type }),
      });
      const data = await res.json();
      if (data.error) {
        setExtractError(data.error);
      } else {
        setNewLease({
          tenant_name: data.tenant_name || '',
          property: data.property || '',
          rent: data.rent || '',
          deposit: data.deposit || '',
          start_date: data.start_date || '',
          end_date: data.end_date || '',
          email: data.email || '',
          phone: data.phone || '',
          payment_day: data.payment_day || '1',
          payment_frequency: data.payment_frequency || 'monthly',
          late_fee_percent: data.late_fee_percent || data.late_fee_fixed || '5',
          late_fee_days: data.late_fee_days || '3',
          late_fee_type: data.late_fee_type || 'percent',
          lease_terms_raw: data.late_fee_clause || '',
        });
        if (data.property) {
          const { data: { user } } = await supabase.auth.getUser();
          if (user) {
            const { data: existing } = await supabase.from('properties').select('id').eq('user_id', user.id).ilike('address', data.property.trim()).single();
            if (!existing) {
              await supabase.from('properties').insert({
                user_id: user.id, address: data.property,
                type: data.property_type || 'apartment',
                beds: +data.beds || null, baths: +data.baths || null,
                sqft: +data.sqft || null, pets: data.pets || 'no pets',
                parking: data.parking || 'street', laundry: data.laundry || 'shared',
                utilities_included: data.utilities_included || 'none',
              });
              setExtractError('✓ Property automatically added to your Properties page.');
            }
          }
        }
      }
    } catch (err) {
      setExtractError('Could not read file. Please try again.');
    }
    setExtracting(false);
  };

  const addLease = async () => {
    if (!newLease.tenant_name || !newLease.property || !newLease.rent || !newLease.start_date || !newLease.end_date) {
      alert('Please fill in tenant name, property, rent, and both dates.');
      return;
    }
    setSaving(true);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { setSaving(false); return; }
    const { error } = await supabase.from('leases').insert({
      user_id: user.id,
      tenant_name: newLease.tenant_name,
      property: newLease.property,
      rent: +newLease.rent,
      deposit: +newLease.deposit || 0,
      start_date: newLease.start_date,
      end_date: newLease.end_date,
      email: newLease.email,
      phone: newLease.phone,
      status: 'active',
      payment_day: +newLease.payment_day || 1,
      payment_frequency: newLease.payment_frequency || 'monthly',
      late_fee_percent: +newLease.late_fee_percent || 5,
      late_fee_days: +newLease.late_fee_days || 3,
      late_fee_type: newLease.late_fee_type || 'percent',
      lease_terms_raw: newLease.lease_terms_raw || '',
    });
    if (error) {
      alert('Error saving: ' + error.message);
    } else {
      await fetchLeases();
      setShowAdd(false);
      setNewLease({ tenant_name: '', property: '', rent: '', deposit: '', start_date: '', end_date: '', email: '', phone: '', payment_day: '1', payment_frequency: 'monthly', late_fee_percent: '5', late_fee_days: '3', late_fee_type: 'percent', lease_terms_raw: '' });
      setExtractError('');
    }
    setSaving(false);
  };

  const openEdit = (lease: Lease) => {
    setEditingLease(lease);
    setEditForm({
      tenant_name: lease.tenant_name || '', property: lease.property || '',
      rent: lease.rent || '', deposit: lease.deposit || '',
      start_date: lease.start_date || '', end_date: lease.end_date || '',
      email: lease.email || '', phone: lease.phone || '',
      status: lease.status || 'active',
      payment_day: lease.payment_day || 1,
      payment_frequency: lease.payment_frequency || 'monthly',
      late_fee_percent: lease.late_fee_percent || 5,
      late_fee_days: lease.late_fee_days || 3,
      late_fee_type: lease.late_fee_type || 'percent',
      lease_terms_raw: lease.lease_terms_raw || '',
    });
  };

  const saveLease = async () => {
    if (!editingLease) return;
    setSaving(true);
    const { error } = await supabase.from('leases').update({
      tenant_name: editForm.tenant_name,
      property: editForm.property,
      rent: +editForm.rent,
      deposit: +editForm.deposit || 0,
      start_date: editForm.start_date,
      end_date: editForm.end_date,
      email: editForm.email,
      phone: editForm.phone,
      status: editForm.status,
      payment_day: +editForm.payment_day || 1,
      payment_frequency: editForm.payment_frequency || 'monthly',
      late_fee_percent: +editForm.late_fee_percent || 5,
      late_fee_days: +editForm.late_fee_days || 3,
      late_fee_type: editForm.late_fee_type || 'percent',
      lease_terms_raw: editForm.lease_terms_raw || '',
    }).eq('id', editingLease.id);
    if (error) { alert('Error updating: ' + error.message); }
    else { await fetchLeases(); setEditingLease(null); setEditForm(null); }
    setSaving(false);
  };

  const removeLease = async (id: string) => {
    if (!confirm('Remove this lease?')) return;
    await supabase.from('leases').delete().eq('id', id);
    setLeases(leases.filter(l => l.id !== id));
  };

  const openRenewalWizard = (lease: Lease) => {
    setRenewalWizard(lease);
    setRenewalOptions({ increaseType: 'percent', increaseValue: '3', newTerm: '12', notes: '' });
  };

  const draftRenewal = async () => {
    if (!renewalWizard) return;
    setDraftingId(renewalWizard.id);
    setRenewalWizard(null);

    const { data: { user } } = await supabase.auth.getUser();
    let profile = { full_name: '', email: '', phone: '', company: '', address: '' };
    if (user) {
      const { data } = await supabase.from('profiles').select('*').eq('id', user.id).single();
      if (data) profile = data;
    }

    const today = new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
    const signature = [profile.full_name || 'Your Landlord', profile.company || '', profile.phone || '', profile.email || '', profile.address || ''].filter(Boolean).join('\n');
    const currentRent = renewalWizard.rent;
    let newRent = currentRent;
    let rentDescription = '';

    if (renewalOptions.increaseType === 'percent') {
      newRent = Math.round(currentRent * (1 + +renewalOptions.increaseValue / 100));
      rentDescription = renewalOptions.increaseValue + '% increase — new rent $' + newRent + '/mo';
    } else if (renewalOptions.increaseType === 'fixed') {
      newRent = currentRent + +renewalOptions.increaseValue;
      rentDescription = '$' + renewalOptions.increaseValue + ' increase — new rent $' + newRent + '/mo';
    } else {
      rentDescription = 'market rate research requested — propose a competitive rate based on similar units in the area';
    }

    const termDescription = renewalOptions.newTerm === 'month-to-month' ? 'month-to-month' : renewalOptions.newTerm + '-month lease';

    const res = await fetch('/api/claude', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        prompt: 'Draft a professional lease renewal offer letter with today\'s date at the top.\n\nDate: ' + today + '\n\nTo: ' + renewalWizard.tenant_name + '\nProperty: ' + renewalWizard.property + '\n\nFrom:\n' + signature + '\n\nLease details:\n- Current rent: $' + currentRent + '/mo\n- Lease expires: ' + renewalWizard.end_date + '\n- Proposed new term: ' + termDescription + '\n- Rent change: ' + rentDescription + '\n' + (renewalOptions.notes ? '- Additional notes: ' + renewalOptions.notes : '') + '\n\n' + (renewalOptions.increaseType === 'market' ? 'Research typical rents for similar units in this area and justify the proposed rent increase with market data. ' : '') + 'Write a warm professional letter. Include the date at the top. Request a response within 30 days. End with a proper signature block.',
      }),
    });
    const data = await res.json();
    setRenewalDrafts(prev => ({ ...prev, [renewalWizard.id]: data.result }));
    setDraftingId(null);
  };

  const generateLease = async () => {
    setGenerating(true);
    setGeneratedLease('');
    const res = await fetch('/api/claude', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        prompt: 'Generate a complete professional residential lease agreement for ' + form.state + '. Tenant: ' + form.tenant + '. Property: ' + form.property + '. Monthly Rent: $' + form.rent + '. Security Deposit: $' + form.deposit + '. Lease Start: ' + form.start + '. Lease End: ' + form.end + '. Pets: ' + form.pets + '. Parking: ' + form.parking + '. Laundry: ' + form.laundry + '. Include all standard clauses: payment due 1st of month, 5% late fee after 3-day grace, utilities, maintenance responsibilities, 24-hour entry notice, no subletting, termination, and state-specific disclosures. Use numbered sections.',
      }),
    });
    const data = await res.json();
    setGeneratedLease(data.result);
    setGenerating(false);
  };

  const renewalAlerts = leases.filter(l => getDaysLeft(l.end_date) <= 90);

  const tabBtn = (id: string, label: string) => (
    <button onClick={() => setTab(id as any)}
      style={{
        padding: '9px 20px', borderRadius: T.radiusSm, fontSize: 13, fontWeight: 600, cursor: 'pointer',
        background: tab === id ? T.navy : T.surface,
        color: tab === id ? 'white' : T.inkMid,
        border: `1px solid ${tab === id ? T.navy : T.border}`,
      }}>
      {label}
    </button>
  );

  const renderLeaseFormFields = (f: any, set: (v: any) => void) => (
    <div>
      {LEASE_FIELDS.map(field => (
        <div key={field.key} style={{ marginBottom: 14 }}>
          <label style={label}>{field.label}</label>
          <input type={field.type} value={f[field.key] || ''}
            onChange={e => set({ ...f, [field.key]: e.target.value })} style={input} />
        </div>
      ))}

      <div style={{ marginBottom: 14 }}>
        <label style={label}>Status</label>
        <select value={f.status || 'active'} onChange={e => set({ ...f, status: e.target.value })} style={input}>
          {['active', 'expired', 'terminated', 'pending'].map(s => <option key={s}>{s}</option>)}
        </select>
      </div>

      {/* Payment & Late Fee Terms */}
      <div style={{ borderTop: `1px solid ${T.border}`, paddingTop: 16, marginTop: 4 }}>
        <div style={{ fontSize: 12, fontWeight: 700, color: T.inkMuted, textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: 14 }}>
          Payment & Late Fee Terms
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 14 }}>
          <div>
            <label style={label}>Payment Frequency</label>
            <select value={f.payment_frequency || 'monthly'} onChange={e => set({ ...f, payment_frequency: e.target.value })} style={input}>
              <option value="monthly">Monthly</option>
              <option value="bi-weekly">Bi-weekly</option>
              <option value="weekly">Weekly</option>
            </select>
          </div>
          <div>
            <label style={label}>Payment Due Day</label>
            <select value={f.payment_day || 1} onChange={e => set({ ...f, payment_day: +e.target.value })} style={input}>
              {Array.from({ length: 28 }, (_, i) => i + 1).map(d => (
                <option key={d} value={d}>{d === 1 ? '1st' : d === 2 ? '2nd' : d === 3 ? '3rd' : d + 'th'}</option>
              ))}
            </select>
          </div>
          <div>
            <label style={label}>Late Fee Type</label>
            <select value={f.late_fee_type || 'percent'} onChange={e => set({ ...f, late_fee_type: e.target.value })} style={input}>
              <option value="percent">Percentage (%)</option>
              <option value="fixed">Fixed Amount ($)</option>
            </select>
          </div>
          <div>
            <label style={label}>{f.late_fee_type === 'fixed' ? 'Late Fee Amount ($)' : 'Late Fee (%)'}</label>
            <input type="number" value={f.late_fee_percent || ''} onChange={e => set({ ...f, late_fee_percent: e.target.value })} style={input} placeholder={f.late_fee_type === 'fixed' ? '50' : '5'} />
          </div>
          <div>
            <label style={label}>Grace Period (days)</label>
            <input type="number" value={f.late_fee_days || ''} onChange={e => set({ ...f, late_fee_days: e.target.value })} style={input} placeholder="3" />
          </div>
        </div>

        <div style={{ marginBottom: 14 }}>
          <label style={label}>Late Fee Clause (from contract)</label>
          <textarea value={f.lease_terms_raw || ''} onChange={e => set({ ...f, lease_terms_raw: e.target.value })}
            placeholder="Paste the exact late fee language from your lease here…"
            style={{ ...input, minHeight: 70, resize: 'vertical' as const, fontFamily: 'inherit' }} />
          {f.lease_terms_raw && (
            <div style={{ fontSize: 11, color: T.tealDark, marginTop: 4 }}>✓ Contract language saved — will appear in payment schedule wizard</div>
          )}
        </div>
      </div>
    </div>
  );

  return (
    <div>
      <div style={{ display: 'flex', gap: 8, marginBottom: 24 }}>
        {tabBtn('tracker', '📋 Lease Tracker (' + leases.length + ')')}
        {tabBtn('generator', '✦ Generate New Lease')}
      </div>

      {tab === 'tracker' && (
        <div>
          {renewalAlerts.length > 0 && (
            <div style={{ background: T.amberLight, border: `1px solid ${T.amber}44`, borderRadius: T.radiusSm, padding: '14px 18px', marginBottom: 20, display: 'flex', gap: 12, alignItems: 'center' }}>
              <span style={{ fontSize: 20 }}>⚠️</span>
              <div>
                <div style={{ fontWeight: 700, fontSize: 13, color: T.amberDark }}>Renewal Action Required</div>
                <div style={{ fontSize: 13, color: T.inkMid, marginTop: 2 }}>
                  {renewalAlerts.map(l => l.tenant_name + ' — ' + formatDaysLeft(getDaysLeft(l.end_date))).join(' · ')}
                </div>
              </div>
            </div>
          )}

          {/* Drop zone */}
          <div
            onDrop={e => { e.preventDefault(); setDragOver(false); const file = e.dataTransfer.files?.[0]; if (file) { setShowAdd(true); extractLeaseData(file); } }}
            onDragOver={e => { e.preventDefault(); setDragOver(true); }}
            onDragLeave={() => setDragOver(false)}
            onClick={() => setShowAdd(true)}
            style={{
              border: '2px dashed ' + (dragOver ? T.navy : T.border),
              borderRadius: T.radius, padding: '20px', textAlign: 'center',
              cursor: 'pointer', marginBottom: 20,
              background: dragOver ? T.tealLight : T.surface,
              transition: 'all 0.15s',
            }}>
            <div style={{ fontSize: 24, marginBottom: 6 }}>📄</div>
            <div style={{ fontWeight: 600, fontSize: 14, color: T.navy }}>Drop a lease PDF here to add it</div>
            <div style={{ fontSize: 12, color: T.inkMuted, marginTop: 4 }}>Or click to add manually · AI auto-fills details including late fee terms</div>
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 16 }}>
            <button onClick={() => setShowAdd(true)} style={{ ...btn.primary }}>+ Add Lease</button>
          </div>

          {loading && <div style={{ textAlign: 'center', padding: 40, color: T.inkMuted }}>Loading leases…</div>}

          {!loading && leases.length === 0 && (
            <div style={{ background: T.surface, border: `1px solid ${T.border}`, borderRadius: T.radius, padding: 40, textAlign: 'center', boxShadow: T.shadow }}>
              <div style={{ fontSize: 32, marginBottom: 12 }}>📄</div>
              <div style={{ fontWeight: 700, fontSize: 15, color: T.navy, marginBottom: 6 }}>No leases yet</div>
              <div style={{ color: T.inkMuted, fontSize: 13, marginBottom: 20 }}>Drop a lease PDF above or click Add Lease to get started.</div>
              <button onClick={() => setShowAdd(true)} style={{ ...btn.primary }}>+ Add Your First Lease</button>
            </div>
          )}

          {leases.map(lease => {
            const status = getLeaseStatus(lease.end_date);
            const days = getDaysLeft(lease.end_date);
            return (
              <div key={lease.id} style={{ background: T.surface, border: `1px solid ${T.border}`, borderRadius: T.radius, padding: 22, marginBottom: 14, boxShadow: T.shadow }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                  <div style={{ flex: 1 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 6 }}>
                      <div style={{ fontWeight: 700, fontSize: 16, color: T.ink }}>{lease.tenant_name}</div>
                      <span style={{ background: status.bg, color: status.color, padding: '3px 10px', borderRadius: 20, fontSize: 11, fontWeight: 600 }}>{status.label}</span>
                    </div>
                    <div style={{ fontSize: 13, color: T.inkMuted, marginBottom: 14 }}>{lease.property}</div>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 16, marginBottom: 10 }}>
                      {[
                        { label: 'Monthly Rent', value: '$' + lease.rent.toLocaleString() },
                        { label: 'Deposit', value: '$' + (lease.deposit || 0).toLocaleString() },
                        { label: 'Start Date', value: lease.start_date },
                        { label: 'End Date', value: lease.end_date + ' · ' + formatDaysLeft(days) },
                      ].map(item => (
                        <div key={item.label}>
                          <div style={{ fontSize: 11, color: T.inkMuted, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.4px' }}>{item.label}</div>
                          <div style={{ fontSize: 13, fontWeight: 600, marginTop: 3, color: T.ink }}>{item.value}</div>
                        </div>
                      ))}
                    </div>

                    {/* Late fee terms */}
                    <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap', marginBottom: 8 }}>
                      {(lease.payment_day || lease.payment_frequency) && (
                        <span style={{ fontSize: 12, color: T.inkMuted }}>
                          💳 Due {lease.payment_day || 1}{[1,2,3].includes(lease.payment_day) ? ['st','nd','rd'][lease.payment_day-1] : 'th'} · {lease.payment_frequency || 'monthly'}
                        </span>
                      )}
                      {lease.late_fee_percent > 0 && (
                        <span style={{ fontSize: 12, color: T.inkMuted }}>
                          ⚠ Late fee: {lease.late_fee_type === 'fixed' ? '$' + lease.late_fee_percent : lease.late_fee_percent + '%'} after {lease.late_fee_days || 3} days
                          {lease.lease_terms_raw && <span style={{ color: T.tealDark, marginLeft: 4 }}>✓ from contract</span>}
                        </span>
                      )}
                    </div>

                    {(lease.email || lease.phone) && (
                      <div style={{ fontSize: 12, color: T.inkMuted }}>
                        {lease.email && <span>📧 {lease.email}</span>}
                        {lease.email && lease.phone && <span> · </span>}
                        {lease.phone && <span>📞 {lease.phone}</span>}
                      </div>
                    )}
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginLeft: 20 }}>
                    <button onClick={() => openRenewalWizard(lease)} disabled={draftingId === lease.id}
                      style={{ ...btn.primary, fontSize: 12, padding: '7px 14px', whiteSpace: 'nowrap' as const }}>
                      {draftingId === lease.id ? 'Drafting…' : '✦ Renewal Wizard'}
                    </button>
                    <button onClick={() => openEdit(lease)}
                      style={{ ...btn.ghost, fontSize: 12, padding: '7px 14px' }}>
                      ✏️ Edit
                    </button>
                    <button onClick={() => removeLease(lease.id)}
                      style={{ ...btn.danger, fontSize: 12, padding: '7px 14px' }}>
                      Remove
                    </button>
                  </div>
                </div>

                {renewalDrafts[lease.id] && (
                  <div style={{ marginTop: 16 }}>
                    <div style={{ fontSize: 12, fontWeight: 700, color: T.navy, marginBottom: 8 }}>✦ Renewal Letter Draft</div>
                    <div style={{ background: T.tealLight, border: `1px solid ${T.teal}33`, borderRadius: T.radiusSm, padding: 16, fontSize: 13, lineHeight: 1.75, whiteSpace: 'pre-wrap', color: T.ink }}>
                      {renewalDrafts[lease.id]}
                    </div>
                    <div style={{ display: 'flex', gap: 8, marginTop: 8 }}>
                      <button onClick={() => navigator.clipboard.writeText(renewalDrafts[lease.id])}
                        style={{ ...btn.ghost, fontSize: 12, padding: '6px 14px' }}>📋 Copy</button>
                      <button onClick={() => {
                        const subject = encodeURIComponent('Lease Renewal Offer — ' + lease.property);
                        const body = encodeURIComponent(renewalDrafts[lease.id]);
                        window.open('mailto:' + (lease.email || '') + '?subject=' + subject + '&body=' + body);
                      }}
                        style={{ ...btn.teal, fontSize: 12, padding: '6px 14px' }}>✉️ Open in Email</button>
                      <button onClick={() => setRenewalDrafts(prev => { const n = { ...prev }; delete n[lease.id]; return n; })}
                        style={{ ...btn.danger, fontSize: 12, padding: '6px 14px' }}>Dismiss</button>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {tab === 'generator' && (
        <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr', gap: 20 }}>
          <div style={{ background: T.surface, border: `1px solid ${T.border}`, borderRadius: T.radius, padding: 24, boxShadow: T.shadow }}>
            <div style={{ fontWeight: 700, fontSize: 15, color: T.navy, marginBottom: 20 }}>Lease Details</div>
            {[
              { label: 'Tenant Full Name', key: 'tenant', type: 'text', placeholder: 'John Smith' },
              { label: 'Property Address', key: 'property', type: 'text', placeholder: '42 Maple St, Unit 1' },
              { label: 'Monthly Rent ($)', key: 'rent', type: 'number', placeholder: '1800' },
              { label: 'Security Deposit ($)', key: 'deposit', type: 'number', placeholder: '3600' },
              { label: 'Lease Start', key: 'start', type: 'date', placeholder: '' },
              { label: 'Lease End', key: 'end', type: 'date', placeholder: '' },
            ].map(f => (
              <div key={f.key} style={{ marginBottom: 14 }}>
                <label style={label}>{f.label}</label>
                <input type={f.type} placeholder={f.placeholder} value={form[f.key as keyof typeof form]}
                  onChange={e => setForm({ ...form, [f.key]: e.target.value })} style={input} />
              </div>
            ))}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 20 }}>
              {[
                { label: 'State', key: 'state', options: ['California', 'New York', 'Texas', 'Florida', 'Illinois', 'Washington', 'Arizona', 'Colorado', 'Other'] },
                { label: 'Pets', key: 'pets', options: ['no pets', 'cats only', 'small dogs', 'all pets'] },
                { label: 'Parking', key: 'parking', options: ['included', 'not included', 'additional fee'] },
                { label: 'Laundry', key: 'laundry', options: ['in-unit', 'shared', 'none'] },
              ].map(s => (
                <div key={s.key}>
                  <label style={label}>{s.label}</label>
                  <select value={form[s.key as keyof typeof form]} onChange={e => setForm({ ...form, [s.key]: e.target.value })}
                    style={input}>
                    {s.options.map(o => <option key={o}>{o}</option>)}
                  </select>
                </div>
              ))}
            </div>
            <button onClick={generateLease} disabled={generating}
              style={{ ...btn.primary, width: '100%', justifyContent: 'center' }}>
              {generating ? 'Generating…' : '✦ Generate Lease Agreement'}
            </button>
          </div>
          <div style={{ background: T.surface, border: `1px solid ${T.border}`, borderRadius: T.radius, padding: 24, boxShadow: T.shadow }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
              <div style={{ fontWeight: 700, fontSize: 15, color: T.navy }}>Generated Agreement</div>
              {generatedLease && (
                <button onClick={() => navigator.clipboard.writeText(generatedLease)}
                  style={{ ...btn.ghost, fontSize: 12, padding: '6px 14px' }}>📋 Copy</button>
              )}
            </div>
            {generatedLease
              ? <div style={{ background: T.bg, borderRadius: T.radiusSm, padding: 16, fontSize: 12.5, lineHeight: 1.8, whiteSpace: 'pre-wrap', maxHeight: 600, overflowY: 'auto', color: T.ink }}>{generatedLease}</div>
              : <div style={{ color: T.inkMuted, fontSize: 13, lineHeight: 1.7 }}>Fill in the details and click Generate to create a complete, state-specific lease agreement.</div>
            }
          </div>
        </div>
      )}

      {/* Add Lease Modal */}
      {showAdd && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100 }}
          onClick={() => { setShowAdd(false); setExtractError(''); }}>
          <div style={{ background: T.surface, borderRadius: T.radiusLg, padding: 32, width: 560, maxHeight: '88vh', overflowY: 'auto', boxShadow: T.shadowMd }}
            onClick={e => e.stopPropagation()}>
            <div style={{ fontWeight: 700, fontSize: 18, color: T.navy, marginBottom: 4 }}>Add Lease</div>
            <div style={{ fontSize: 13, color: T.inkMuted, marginBottom: 20 }}>Upload your lease — AI will auto-fill everything including payment terms and late fees.</div>

            <div onClick={() => fileInputRef.current?.click()}
              onDrop={e => { e.preventDefault(); const file = e.dataTransfer.files?.[0]; if (file) extractLeaseData(file); }}
              onDragOver={e => e.preventDefault()}
              style={{ border: '2px dashed ' + T.border, borderRadius: T.radius, padding: '16px', textAlign: 'center', cursor: 'pointer', marginBottom: 20, background: extracting ? T.tealLight : T.bg }}>
              <input ref={fileInputRef} type="file" accept=".pdf,image/*" style={{ display: 'none' }}
                onChange={e => { const file = e.target.files?.[0]; if (file) extractLeaseData(file); }} />
              {extracting
                ? <div style={{ color: T.navy, fontSize: 13, fontWeight: 600 }}>✦ Reading lease including payment terms… just a moment</div>
                : <>
                    <div style={{ fontSize: 28, marginBottom: 8 }}>📄</div>
                    <div style={{ fontWeight: 600, fontSize: 14, color: T.navy }}>Upload Lease PDF or Photo</div>
                    <div style={{ fontSize: 12, color: T.inkMuted, marginTop: 4 }}>Click or drag · AI extracts all terms including late fees and payment schedule</div>
                  </>
              }
            </div>

            {extractError && (
              <div style={{
                background: extractError.startsWith('✓') ? T.tealLight : T.coralLight,
                border: `1px solid ${extractError.startsWith('✓') ? T.teal + '33' : T.coral + '33'}`,
                borderRadius: T.radiusSm, padding: '10px 14px', fontSize: 13,
                color: extractError.startsWith('✓') ? T.tealDark : T.coral,
                marginBottom: 16,
              }}>
                {extractError}
              </div>
            )}

            <div style={{ borderTop: `1px solid ${T.border}`, paddingTop: 16, marginBottom: 16 }}>
              <div style={{ fontSize: 11, color: T.inkMuted, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: 14 }}>Review & Edit Details</div>
              {renderLeaseFormFields(newLease, setNewLease)}
            </div>

            <div style={{ display: 'flex', gap: 10 }}>
              <button onClick={addLease} disabled={saving} style={{ ...btn.primary }}>
                {saving ? 'Saving…' : 'Save Lease'}
              </button>
              <button onClick={() => { setShowAdd(false); setExtractError(''); }}
                style={{ ...btn.ghost }}>Cancel</button>
            </div>
          </div>
        </div>
      )}

      {/* Edit Lease Modal */}
      {editingLease && editForm && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100 }}
          onClick={() => { setEditingLease(null); setEditForm(null); }}>
          <div style={{ background: T.surface, borderRadius: T.radiusLg, padding: 32, width: 560, maxHeight: '88vh', overflowY: 'auto', boxShadow: T.shadowMd }}
            onClick={e => e.stopPropagation()}>
            <div style={{ fontWeight: 700, fontSize: 18, color: T.navy, marginBottom: 4 }}>Edit Lease</div>
            <div style={{ fontSize: 13, color: T.inkMuted, marginBottom: 20 }}>{editingLease.tenant_name}</div>
            {renderLeaseFormFields(editForm, setEditForm)}
            <div style={{ display: 'flex', gap: 10, marginTop: 8 }}>
              <button onClick={saveLease} disabled={saving} style={{ ...btn.primary }}>
                {saving ? 'Saving…' : 'Save Changes'}
              </button>
              <button onClick={() => { setEditingLease(null); setEditForm(null); }}
                style={{ ...btn.ghost }}>Cancel</button>
            </div>
          </div>
        </div>
      )}

      {/* Renewal Wizard Modal */}
      {renewalWizard && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100 }}
          onClick={() => setRenewalWizard(null)}>
          <div style={{ background: T.surface, borderRadius: T.radiusLg, padding: 32, width: 500, boxShadow: T.shadowMd }}
            onClick={e => e.stopPropagation()}>
            <div style={{ fontWeight: 700, fontSize: 18, color: T.navy, marginBottom: 4 }}>✦ Renewal Wizard</div>
            <div style={{ fontSize: 13, color: T.inkMuted, marginBottom: 24 }}>{renewalWizard.tenant_name} · {renewalWizard.property}</div>

            <div style={{ background: T.bg, borderRadius: T.radiusSm, padding: 14, marginBottom: 24, display: 'flex', gap: 24 }}>
              <div>
                <div style={{ fontSize: 11, color: T.inkMuted, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.4px' }}>Current Rent</div>
                <div style={{ fontSize: 20, fontWeight: 700, color: T.navy }}>${renewalWizard.rent.toLocaleString()}/mo</div>
              </div>
              <div>
                <div style={{ fontSize: 11, color: T.inkMuted, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.4px' }}>Lease Expires</div>
                <div style={{ fontSize: 20, fontWeight: 700, color: T.ink }}>{renewalWizard.end_date}</div>
              </div>
            </div>

            <div style={{ marginBottom: 20 }}>
              <label style={label}>Rent Increase Type</label>
              <div style={{ display: 'flex', gap: 8 }}>
                {[
                  { id: 'percent', label: '% Increase' },
                  { id: 'fixed', label: '$ Fixed Amount' },
                  { id: 'market', label: '✦ Research Market Rate' },
                ].map(opt => (
                  <button key={opt.id} onClick={() => setRenewalOptions({ ...renewalOptions, increaseType: opt.id as any })}
                    style={{
                      flex: 1, padding: '8px 6px', borderRadius: T.radiusSm, fontSize: 12, fontWeight: 600, cursor: 'pointer',
                      background: renewalOptions.increaseType === opt.id ? T.navy : T.bg,
                      color: renewalOptions.increaseType === opt.id ? 'white' : T.inkMid,
                      border: `1px solid ${renewalOptions.increaseType === opt.id ? T.navy : T.border}`,
                    }}>
                    {opt.label}
                  </button>
                ))}
              </div>
            </div>

            {renewalOptions.increaseType !== 'market' && (
              <div style={{ marginBottom: 20 }}>
                <label style={label}>{renewalOptions.increaseType === 'percent' ? 'Percentage Increase (%)' : 'Dollar Amount Increase ($)'}</label>
                <input style={input} type="number" value={renewalOptions.increaseValue}
                  onChange={e => setRenewalOptions({ ...renewalOptions, increaseValue: e.target.value })} />
                {renewalOptions.increaseValue && (
                  <div style={{ fontSize: 12, color: T.tealDark, marginTop: 6, fontWeight: 600 }}>
                    New rent: ${renewalOptions.increaseType === 'percent'
                      ? Math.round(renewalWizard.rent * (1 + +renewalOptions.increaseValue / 100)).toLocaleString()
                      : (renewalWizard.rent + +renewalOptions.increaseValue).toLocaleString()
                    }/mo
                  </div>
                )}
              </div>
            )}

            {renewalOptions.increaseType === 'market' && (
              <div style={{ background: T.tealLight, border: `1px solid ${T.teal}33`, borderRadius: T.radiusSm, padding: 12, marginBottom: 20, fontSize: 13, color: T.tealDark }}>
                ✦ Claude will research comparable rentals in your area and propose a competitive market rate.
              </div>
            )}

            <div style={{ marginBottom: 20 }}>
              <label style={label}>New Lease Term</label>
              <div style={{ display: 'flex', gap: 8 }}>
                {[{ id: '12', label: '12 Months' }, { id: '6', label: '6 Months' }, { id: 'month-to-month', label: 'Month-to-Month' }].map(opt => (
                  <button key={opt.id} onClick={() => setRenewalOptions({ ...renewalOptions, newTerm: opt.id as any })}
                    style={{
                      flex: 1, padding: '8px', borderRadius: T.radiusSm, fontSize: 12, fontWeight: 600, cursor: 'pointer',
                      background: renewalOptions.newTerm === opt.id ? T.navy : T.bg,
                      color: renewalOptions.newTerm === opt.id ? 'white' : T.inkMid,
                      border: `1px solid ${renewalOptions.newTerm === opt.id ? T.navy : T.border}`,
                    }}>
                    {opt.label}
                  </button>
                ))}
              </div>
            </div>

            <div style={{ marginBottom: 24 }}>
              <label style={label}>Additional Notes for Claude (optional)</label>
              <textarea value={renewalOptions.notes}
                onChange={e => setRenewalOptions({ ...renewalOptions, notes: e.target.value })}
                placeholder="e.g. tenant has been great, offer discount if they sign early..."
                style={{ ...input, minHeight: 70, resize: 'vertical' as const }} />
            </div>

            <div style={{ display: 'flex', gap: 10 }}>
              <button onClick={draftRenewal} style={{ ...btn.primary }}>✦ Draft Renewal Letter</button>
              <button onClick={() => setRenewalWizard(null)} style={{ ...btn.ghost }}>Cancel</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}