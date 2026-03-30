'use client';
import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';

type Property = {
  id: string;
  address: string;
  name: string;
  type: string;
  sqft: number;
  beds: number;
  baths: number;
  garage: string;
  parking: string;
  laundry: string;
  outdoor: string;
  pets: string;
  furnished: boolean;
  ac: boolean;
  notes: string;
  year_built: number;
  last_renovated: number;
  utilities_included: string;
  hoa_fee: number;
  mortgage: number;
  insurance: number;
  current_rent: number;
  target_rent: number;
  school_district: string;
  proximity: string;
  preferred_lease_term: string;
  insurance_policy: string;
  insurance_expiry: string;
};

const inputStyle = {
  width: '100%', background: '#F7F5F0', border: '1px solid #E8E3D8',
  borderRadius: 8, padding: '9px 12px', fontSize: 13, outline: 'none',
  boxSizing: 'border-box' as const,
};

const labelStyle = {
  fontSize: 11, color: '#8C8070', fontWeight: 700,
  textTransform: 'uppercase' as const, letterSpacing: '0.4px',
  display: 'block', marginBottom: 5,
};

const EMPTY_FORM = {
  address: '', name: '', type: 'apartment',
  sqft: '', beds: '1', baths: '1',
  garage: 'none', parking: 'street', laundry: 'shared',
  outdoor: 'none', pets: 'no pets',
  furnished: false, ac: true, notes: '',
  year_built: '', last_renovated: '',
  utilities_included: 'none',
  hoa_fee: '', mortgage: '', insurance: '',
  current_rent: '', target_rent: '',
  school_district: '', proximity: '',
  preferred_lease_term: '12 months',
  insurance_policy: '', insurance_expiry: '',
};

const TABS = ['basics', 'features', 'financials', 'details'] as const;
type Tab = typeof TABS[number];

const TAB_LABELS = { basics: '🏠 Basics', features: '✨ Features', financials: '💰 Financials', details: '📋 Details' };

export default function Properties() {
  const [properties, setProperties] = useState<Property[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAdd, setShowAdd] = useState(false);
  const [saving, setSaving] = useState(false);
  const [analyzing, setAnalyzing] = useState<string | null>(null);
  const [analyses, setAnalyses] = useState<{ [key: string]: string }>({});
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [form, setForm] = useState<any>(EMPTY_FORM);
  const [formTab, setFormTab] = useState<Tab>('basics');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState<any>(null);
  const [editTab, setEditTab] = useState<Tab>('basics');

  useEffect(() => { fetchProperties(); }, []);

  const fetchProperties = async () => {
    setLoading(true);
    const { data, error } = await supabase.from('properties').select('*').order('created_at', { ascending: true });
    if (!error && data) setProperties(data);
    setLoading(false);
  };

  const saveProperty = async (data: any, id?: string) => {
    setSaving(true);
    const payload = {
      address: data.address, name: data.name, type: data.type,
      sqft: +data.sqft || null, beds: +data.beds, baths: +data.baths,
      garage: data.garage, parking: data.parking, laundry: data.laundry,
      outdoor: data.outdoor, pets: data.pets,
      furnished: data.furnished, ac: data.ac, notes: data.notes,
      year_built: +data.year_built || null,
      last_renovated: +data.last_renovated || null,
      utilities_included: data.utilities_included,
      hoa_fee: +data.hoa_fee || 0,
      mortgage: +data.mortgage || 0,
      insurance: +data.insurance || 0,
      current_rent: +data.current_rent || 0,
      target_rent: +data.target_rent || 0,
      school_district: data.school_district,
      proximity: data.proximity,
      preferred_lease_term: data.preferred_lease_term,
      insurance_policy: data.insurance_policy,
      insurance_expiry: data.insurance_expiry || null,
    };

    let error;
    if (id) {
      ({ error } = await supabase.from('properties').update(payload).eq('id', id));
    } else {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { setSaving(false); return; }
      ({ error } = await supabase.from('properties').insert({ ...payload, user_id: user.id }));
    }

    if (error) {
      alert('Error saving: ' + error.message);
    } else {
      await fetchProperties();
      setShowAdd(false);
      setEditingId(null);
      setEditForm(null);
      setForm(EMPTY_FORM);
      setFormTab('basics');
    }
    setSaving(false);
  };

  const removeProperty = async (id: string) => {
    if (!confirm('Remove this property?')) return;
    await supabase.from('properties').delete().eq('id', id);
    setProperties(properties.filter(p => p.id !== id));
  };

  const openEdit = (p: Property) => {
    setEditingId(p.id);
    setEditTab('basics');
    setEditForm({
      address: p.address || '', name: p.name || '', type: p.type || 'apartment',
      sqft: p.sqft || '', beds: p.beds || '1', baths: p.baths || '1',
      garage: p.garage || 'none', parking: p.parking || 'street',
      laundry: p.laundry || 'shared', outdoor: p.outdoor || 'none',
      pets: p.pets || 'no pets', furnished: p.furnished || false,
      ac: p.ac !== false, notes: p.notes || '',
      year_built: p.year_built || '', last_renovated: p.last_renovated || '',
      utilities_included: p.utilities_included || 'none',
      hoa_fee: p.hoa_fee || '', mortgage: p.mortgage || '',
      insurance: p.insurance || '', current_rent: p.current_rent || '',
      target_rent: p.target_rent || '', school_district: p.school_district || '',
      proximity: p.proximity || '', preferred_lease_term: p.preferred_lease_term || '12 months',
      insurance_policy: p.insurance_policy || '', insurance_expiry: p.insurance_expiry || '',
    });
  };

  const analyzeRent = async (property: Property) => {
    setAnalyzing(property.id);
    const details = [
      property.type, property.beds + ' bed', property.baths + ' bath',
      property.sqft ? property.sqft + ' sqft' : '',
      property.year_built ? 'built ' + property.year_built : '',
      property.last_renovated ? 'renovated ' + property.last_renovated : '',
      property.garage !== 'none' ? property.garage + ' garage' : '',
      property.laundry + ' laundry',
      property.outdoor !== 'none' ? property.outdoor : '',
      property.ac ? 'central AC' : 'no AC',
      property.furnished ? 'furnished' : 'unfurnished',
      property.pets !== 'no pets' ? 'pets allowed' : 'no pets',
      property.utilities_included !== 'none' ? 'utilities included: ' + property.utilities_included : '',
      property.hoa_fee ? 'HOA $' + property.hoa_fee + '/mo' : '',
      property.school_district ? 'school district: ' + property.school_district : '',
      property.proximity || '',
      property.notes || '',
    ].filter(Boolean).join(', ');

    const cashFlow = (property.current_rent || 0) - (property.mortgage || 0) - (property.hoa_fee || 0) - (property.insurance || 0);

    const res = await fetch('/api/claude', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        prompt: 'You are a rental market expert. Analyze this property:\n\nAddress: ' + property.address + '\nDetails: ' + details + '\nCurrent rent: $' + (property.current_rent || 'not set') + '/mo\nTarget rent: $' + (property.target_rent || 'not set') + '/mo\nMonthly cash flow (before maintenance/taxes): $' + cashFlow + '\n\nProvide:\n1. Recommended monthly rent range based on these features and location\n2. Which features add the most value\n3. Which features are limiting rent potential\n4. Top 3 upgrades that would justify higher rent with estimated ROI\n5. Is current rent above/below/at market?\n6. Best time to list or renew based on seasonal trends\n\nBe specific with dollar amounts.',
      }),
    });
    const data = await res.json();
    setAnalyses(prev => ({ ...prev, [property.id]: data.result }));
    setAnalyzing(null);
  };

  const getCashFlow = (p: Property) => (p.current_rent || 0) - (p.mortgage || 0) - (p.hoa_fee || 0) - (p.insurance || 0);

  const featureTag = (label: string) => (
    <span key={label} style={{ background: '#F7F5F0', border: '1px solid #E8E3D8', borderRadius: 6, padding: '3px 10px', fontSize: 12, color: '#4A4A4A', fontWeight: 500 }}>
      {label}
    </span>
  );

  const renderTabs = (current: Tab, onChange: (t: Tab) => void) => (
    <div style={{ display: 'flex', gap: 8, marginBottom: 24 }}>
      {TABS.map(t => (
        <button key={t} onClick={() => onChange(t)}
          style={{
            padding: '7px 14px', borderRadius: 8, fontSize: 12, fontWeight: 600, cursor: 'pointer',
            background: current === t ? '#1A472A' : '#F7F5F0',
            color: current === t ? 'white' : '#4A4A4A',
            border: '1px solid ' + (current === t ? '#1A472A' : '#E8E3D8'),
          }}>
          {TAB_LABELS[t]}
        </button>
      ))}
    </div>
  );

  const renderBasics = (f: any, set: (v: any) => void) => (
    <div>
      <div style={{ marginBottom: 14 }}>
        <label style={labelStyle}>Property Address *</label>
        <input style={inputStyle} value={f.address} placeholder="34092 Alcazar Dr, Unit B, Dana Point, CA"
          onChange={e => set({ ...f, address: e.target.value })} />
      </div>
      <div style={{ marginBottom: 14 }}>
        <label style={labelStyle}>Nickname (optional)</label>
        <input style={inputStyle} value={f.name} placeholder="e.g. Dana Point Unit"
          onChange={e => set({ ...f, name: e.target.value })} />
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr 1fr', gap: 12, marginBottom: 14 }}>
        <div>
          <label style={labelStyle}>Type</label>
          <select style={inputStyle} value={f.type} onChange={e => set({ ...f, type: e.target.value })}>
            {['apartment', 'condo', 'house', 'townhouse', 'duplex', 'studio'].map(t => <option key={t}>{t}</option>)}
          </select>
        </div>
        <div>
          <label style={labelStyle}>Beds</label>
          <select style={inputStyle} value={f.beds} onChange={e => set({ ...f, beds: e.target.value })}>
            {['studio', '1', '2', '3', '4', '5'].map(b => <option key={b}>{b}</option>)}
          </select>
        </div>
        <div>
          <label style={labelStyle}>Baths</label>
          <select style={inputStyle} value={f.baths} onChange={e => set({ ...f, baths: e.target.value })}>
            {['1', '1.5', '2', '2.5', '3'].map(b => <option key={b}>{b}</option>)}
          </select>
        </div>
        <div>
          <label style={labelStyle}>Sqft</label>
          <input style={inputStyle} type="number" value={f.sqft} placeholder="850"
            onChange={e => set({ ...f, sqft: e.target.value })} />
        </div>
        <div>
          <label style={labelStyle}>Year Built</label>
          <input style={inputStyle} type="number" value={f.year_built} placeholder="1998"
            onChange={e => set({ ...f, year_built: e.target.value })} />
        </div>
      </div>
      <div style={{ marginBottom: 14 }}>
        <label style={labelStyle}>Last Renovated (year)</label>
        <input style={inputStyle} type="number" value={f.last_renovated} placeholder="2021"
          onChange={e => set({ ...f, last_renovated: e.target.value })} />
      </div>
      <div style={{ marginBottom: 14 }}>
        <label style={labelStyle}>Proximity Highlights</label>
        <input style={inputStyle} value={f.proximity} placeholder="e.g. 2 blocks from beach, walking distance to shops"
          onChange={e => set({ ...f, proximity: e.target.value })} />
      </div>
      <div style={{ marginBottom: 14 }}>
        <label style={labelStyle}>School District</label>
        <input style={inputStyle} value={f.school_district} placeholder="e.g. Capistrano Unified"
          onChange={e => set({ ...f, school_district: e.target.value })} />
      </div>
    </div>
  );

  const renderFeatures = (f: any, set: (v: any) => void) => (
    <div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 14 }}>
        {[
          { label: 'Garage', key: 'garage', options: ['none', 'attached 1-car', 'attached 2-car', 'detached', 'carport'] },
          { label: 'Parking', key: 'parking', options: ['street', 'assigned spot', 'covered', 'garage included', 'none'] },
          { label: 'Laundry', key: 'laundry', options: ['in-unit', 'in-unit hookups', 'shared', 'none'] },
          { label: 'Outdoor Space', key: 'outdoor', options: ['none', 'private backyard', 'shared backyard', 'patio', 'balcony', 'rooftop deck', 'ocean view'] },
          { label: 'Pets Policy', key: 'pets', options: ['no pets', 'cats only', 'small dogs', 'all pets welcome', 'case by case'] },
          { label: 'Utilities Included', key: 'utilities_included', options: ['none', 'water only', 'water + trash', 'all utilities', 'electric only', 'gas only'] },
        ].map(field => (
          <div key={field.key}>
            <label style={labelStyle}>{field.label}</label>
            <select style={inputStyle} value={f[field.key]} onChange={e => set({ ...f, [field.key]: e.target.value })}>
              {field.options.map(o => <option key={o}>{o}</option>)}
            </select>
          </div>
        ))}
      </div>
      <div style={{ display: 'flex', gap: 12, marginBottom: 14 }}>
        {[{ label: '❄️ Central AC', key: 'ac' }, { label: '🛋️ Furnished', key: 'furnished' }].map(toggle => (
          <button key={toggle.key} onClick={() => set({ ...f, [toggle.key]: !f[toggle.key] })}
            style={{
              flex: 1, padding: '9px', borderRadius: 8, fontSize: 13, fontWeight: 600, cursor: 'pointer',
              background: f[toggle.key] ? '#D8EDDF' : '#F7F5F0',
              color: f[toggle.key] ? '#2D6A4F' : '#8C8070',
              border: '1px solid ' + (f[toggle.key] ? '#2D6A4F' : '#E8E3D8'),
            }}>
            {toggle.label} {f[toggle.key] ? '✓' : ''}
          </button>
        ))}
      </div>
      <div style={{ marginBottom: 14 }}>
        <label style={labelStyle}>Additional Notes</label>
        <textarea value={f.notes} onChange={e => set({ ...f, notes: e.target.value })}
          placeholder="e.g. Recently renovated kitchen, new appliances, ocean view..."
          style={{ ...inputStyle, minHeight: 80, resize: 'vertical', fontFamily: 'sans-serif' }} />
      </div>
    </div>
  );

  const renderFinancials = (f: any, set: (v: any) => void) => {
    const cf = (+f.current_rent || 0) - (+f.mortgage || 0) - (+f.hoa_fee || 0) - (+f.insurance || 0);
    return (
      <div>
        <div style={{ background: '#F7F5F0', borderRadius: 10, padding: 14, marginBottom: 20, fontSize: 13, color: '#4A4A4A' }}>
          💡 These numbers power your cash flow calculator and help Claude give better rent recommendations.
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 14 }}>
          {[
            { label: 'Current Rent ($/mo)', key: 'current_rent', placeholder: '2100' },
            { label: 'Target Rent ($/mo)', key: 'target_rent', placeholder: '2300' },
            { label: 'Mortgage Payment ($/mo)', key: 'mortgage', placeholder: '1400' },
            { label: 'HOA Fee ($/mo)', key: 'hoa_fee', placeholder: '0' },
            { label: 'Insurance ($/mo)', key: 'insurance', placeholder: '100' },
          ].map(field => (
            <div key={field.key}>
              <label style={labelStyle}>{field.label}</label>
              <input style={inputStyle} type="number" value={f[field.key]} placeholder={field.placeholder}
                onChange={e => set({ ...f, [field.key]: e.target.value })} />
            </div>
          ))}
        </div>
        {f.current_rent && (
          <div style={{ background: 'white', border: '1px solid #E8E3D8', borderRadius: 10, padding: 16 }}>
            <div style={{ fontSize: 12, fontWeight: 700, color: '#8C8070', textTransform: 'uppercase', letterSpacing: '0.4px', marginBottom: 12 }}>Cash Flow Preview</div>
            {[
              { label: 'Rent Income', value: +f.current_rent, pos: true },
              { label: 'Mortgage', value: +f.mortgage || 0, pos: false },
              { label: 'HOA', value: +f.hoa_fee || 0, pos: false },
              { label: 'Insurance', value: +f.insurance || 0, pos: false },
            ].filter(r => r.value > 0).map(row => (
              <div key={row.label} style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, marginBottom: 6 }}>
                <span style={{ color: '#4A4A4A' }}>{row.label}</span>
                <span style={{ fontWeight: 600, color: row.pos ? '#2D6A4F' : '#C0392B' }}>
                  {row.pos ? '+' : '-'}${row.value.toLocaleString()}/mo
                </span>
              </div>
            ))}
            <div style={{ borderTop: '2px solid #E8E3D8', paddingTop: 8, marginTop: 4, display: 'flex', justifyContent: 'space-between', fontWeight: 700, fontSize: 14 }}>
              <span>Net Cash Flow</span>
              <span style={{ color: cf >= 0 ? '#2D6A4F' : '#C0392B' }}>${cf.toLocaleString()}/mo</span>
            </div>
          </div>
        )}
      </div>
    );
  };

  const renderDetails = (f: any, set: (v: any) => void) => (
    <div>
      <div style={{ marginBottom: 14 }}>
        <label style={labelStyle}>Preferred Lease Term</label>
        <select style={inputStyle} value={f.preferred_lease_term} onChange={e => set({ ...f, preferred_lease_term: e.target.value })}>
          {['12 months', '6 months', 'month-to-month', 'flexible'].map(t => <option key={t}>{t}</option>)}
        </select>
      </div>
      <div style={{ marginBottom: 14 }}>
        <label style={labelStyle}>Insurance Policy Number</label>
        <input style={inputStyle} value={f.insurance_policy} placeholder="e.g. POL-123456"
          onChange={e => set({ ...f, insurance_policy: e.target.value })} />
      </div>
      <div style={{ marginBottom: 14 }}>
        <label style={labelStyle}>Insurance Expiry Date</label>
        <input style={inputStyle} type="date" value={f.insurance_expiry}
          onChange={e => set({ ...f, insurance_expiry: e.target.value })} />
      </div>
    </div>
  );

  const renderNavButtons = (currentTab: Tab, onTabChange: (t: Tab) => void, onSave: () => void) => (
    <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 24, paddingTop: 20, borderTop: '1px solid #E8E3D8' }}>
      <div>
        {currentTab !== 'basics' && (
          <button onClick={() => onTabChange(TABS[TABS.indexOf(currentTab) - 1])}
            style={{ background: '#F7F5F0', border: '1px solid #E8E3D8', borderRadius: 8, padding: '9px 18px', fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>
            ← Back
          </button>
        )}
      </div>
      <div style={{ display: 'flex', gap: 8 }}>
        {currentTab !== 'details' ? (
          <button onClick={() => onTabChange(TABS[TABS.indexOf(currentTab) + 1])}
            style={{ background: '#1A472A', color: 'white', border: 'none', borderRadius: 8, padding: '9px 18px', fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>
            Next →
          </button>
        ) : (
          <button onClick={onSave} disabled={saving}
            style={{ background: '#1A472A', color: 'white', border: 'none', borderRadius: 8, padding: '9px 18px', fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>
            {saving ? 'Saving…' : 'Save Property'}
          </button>
        )}
        <button onClick={() => { setShowAdd(false); setEditingId(null); setEditForm(null); }}
          style={{ background: '#F7F5F0', border: '1px solid #E8E3D8', borderRadius: 8, padding: '9px 18px', fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>
          Cancel
        </button>
      </div>
    </div>
  );

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
        <div style={{ fontSize: 13, color: '#8C8070' }}>
          {properties.length} {properties.length === 1 ? 'property' : 'properties'} · ${properties.reduce((s, p) => s + (p.current_rent || 0), 0).toLocaleString()}/mo total rent
        </div>
        <button onClick={() => setShowAdd(true)}
          style={{ background: '#1A472A', color: 'white', border: 'none', borderRadius: 8, padding: '9px 18px', fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>
          + Add Property
        </button>
      </div>

      {loading && <div style={{ textAlign: 'center', padding: 40, color: '#8C8070' }}>Loading properties…</div>}

      {!loading && properties.length === 0 && (
        <div style={{ background: 'white', border: '1px solid #E8E3D8', borderRadius: 12, padding: 40, textAlign: 'center' }}>
          <div style={{ fontSize: 32, marginBottom: 12 }}>🏠</div>
          <div style={{ fontWeight: 700, fontSize: 15, marginBottom: 6 }}>No properties yet</div>
          <div style={{ color: '#8C8070', fontSize: 13, marginBottom: 20 }}>Add your properties with full details to unlock AI rent analysis and cash flow tracking.</div>
          <button onClick={() => setShowAdd(true)}
            style={{ background: '#1A472A', color: 'white', border: 'none', borderRadius: 8, padding: '10px 20px', fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>
            + Add Your First Property
          </button>
        </div>
      )}

      {properties.map(p => {
        const cashFlow = getCashFlow(p);
        const isExpanded = expandedId === p.id;
        return (
          <div key={p.id} style={{ background: 'white', border: '1px solid #E8E3D8', borderRadius: 12, padding: 24, marginBottom: 16, boxShadow: '0 1px 3px rgba(0,0,0,0.06)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
              <div style={{ flex: 1 }}>
                <div style={{ fontWeight: 700, fontSize: 16, marginBottom: 2 }}>{p.name || p.address}</div>
                {p.name && <div style={{ fontSize: 13, color: '#8C8070', marginBottom: 12 }}>{p.address}</div>}
                {!p.name && <div style={{ marginBottom: 12 }} />}

                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(6, auto)', gap: 20, marginBottom: 14 }}>
                  {[
                    { label: 'Type', value: p.type },
                    { label: 'Beds', value: p.beds },
                    { label: 'Baths', value: p.baths },
                    { label: 'Sqft', value: p.sqft ? p.sqft.toLocaleString() : '—' },
                    { label: 'Current Rent', value: p.current_rent ? '$' + p.current_rent.toLocaleString() + '/mo' : '—' },
                    { label: 'Cash Flow', value: p.current_rent ? '$' + cashFlow.toLocaleString() + '/mo' : '—' },
                  ].map(item => (
                    <div key={item.label}>
                      <div style={{ fontSize: 11, color: '#8C8070', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.4px' }}>{item.label}</div>
                      <div style={{ fontSize: 14, fontWeight: 700, marginTop: 2, textTransform: 'capitalize', color: item.label === 'Cash Flow' ? (cashFlow >= 0 ? '#2D6A4F' : '#C0392B') : '#1C1C1C' }}>{item.value}</div>
                    </div>
                  ))}
                </div>

                {p.current_rent > 0 && (
                  <div style={{ background: '#F7F5F0', borderRadius: 8, padding: '10px 14px', marginBottom: 14, display: 'flex', gap: 20, fontSize: 12, flexWrap: 'wrap' }}>
                    <span style={{ color: '#2D6A4F', fontWeight: 600 }}>↑ ${p.current_rent.toLocaleString()} rent</span>
                    {p.mortgage > 0 && <span style={{ color: '#C0392B' }}>↓ ${p.mortgage.toLocaleString()} mortgage</span>}
                    {p.hoa_fee > 0 && <span style={{ color: '#C0392B' }}>↓ ${p.hoa_fee.toLocaleString()} HOA</span>}
                    {p.insurance > 0 && <span style={{ color: '#C0392B' }}>↓ ${p.insurance.toLocaleString()} insurance</span>}
                    <span style={{ fontWeight: 700, color: cashFlow >= 0 ? '#2D6A4F' : '#C0392B' }}>= ${cashFlow.toLocaleString()}/mo net</span>
                  </div>
                )}

                <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 8 }}>
                  {p.garage !== 'none' && featureTag('🚗 ' + p.garage)}
                  {featureTag('🧺 ' + p.laundry + ' laundry')}
                  {p.outdoor !== 'none' && featureTag('🌿 ' + p.outdoor)}
                  {p.ac && featureTag('❄️ AC')}
                  {p.furnished && featureTag('🛋️ furnished')}
                  {p.pets !== 'no pets' && featureTag('🐾 ' + p.pets)}
                  {p.utilities_included !== 'none' && featureTag('💡 ' + p.utilities_included + ' included')}
                  {p.year_built && featureTag('🏗️ built ' + p.year_built)}
                  {p.last_renovated && featureTag('✨ renovated ' + p.last_renovated)}
                </div>

                {isExpanded && (
                  <div style={{ marginTop: 12, paddingTop: 12, borderTop: '1px solid #E8E3D8' }}>
                    {p.proximity && <div style={{ fontSize: 13, color: '#4A4A4A', marginBottom: 6 }}>📍 {p.proximity}</div>}
                    {p.school_district && <div style={{ fontSize: 13, color: '#4A4A4A', marginBottom: 6 }}>🏫 {p.school_district}</div>}
                    {p.insurance_policy && <div style={{ fontSize: 13, color: '#4A4A4A', marginBottom: 6 }}>🛡️ Policy: {p.insurance_policy}{p.insurance_expiry ? ' · Expires ' + p.insurance_expiry : ''}</div>}
                    {p.target_rent > 0 && <div style={{ fontSize: 13, color: '#4A4A4A', marginBottom: 6 }}>🎯 Target rent: ${p.target_rent.toLocaleString()}/mo</div>}
                    {p.notes && <div style={{ fontSize: 13, color: '#8C8070', fontStyle: 'italic' }}>{p.notes}</div>}
                  </div>
                )}

                <button onClick={() => setExpandedId(isExpanded ? null : p.id)}
                  style={{ background: 'none', border: 'none', color: '#8C8070', fontSize: 12, cursor: 'pointer', padding: '4px 0', marginTop: 4 }}>
                  {isExpanded ? '▲ Show less' : '▼ Show more details'}
                </button>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginLeft: 20 }}>
                <button onClick={() => analyzeRent(p)} disabled={analyzing === p.id}
                  style={{ background: '#1A472A', color: 'white', border: 'none', borderRadius: 8, padding: '8px 16px', fontSize: 12, fontWeight: 600, cursor: 'pointer', whiteSpace: 'nowrap' }}>
                  {analyzing === p.id ? 'Analyzing…' : '✦ Analyze Rent'}
                </button>
                <button onClick={() => openEdit(p)}
                  style={{ background: '#F7F5F0', border: '1px solid #E8E3D8', borderRadius: 8, padding: '8px 16px', fontSize: 12, fontWeight: 600, cursor: 'pointer' }}>
                  ✏️ Edit
                </button>
                <button onClick={() => removeProperty(p.id)}
                  style={{ background: '#FDECEA', color: '#C0392B', border: 'none', borderRadius: 8, padding: '8px 16px', fontSize: 12, fontWeight: 600, cursor: 'pointer' }}>
                  Remove
                </button>
              </div>
            </div>

            {analyses[p.id] && (
              <div style={{ marginTop: 16 }}>
                <div style={{ fontSize: 12, fontWeight: 700, color: '#1A472A', marginBottom: 8 }}>✦ Rent Analysis</div>
                <div style={{ background: '#D8EDDF', border: '1px solid #2D6A4F33', borderRadius: 10, padding: 16, fontSize: 13, lineHeight: 1.75, whiteSpace: 'pre-wrap' }}>
                  {analyses[p.id]}
                </div>
                <div style={{ display: 'flex', gap: 8, marginTop: 10 }}>
                  <button onClick={() => navigator.clipboard.writeText(analyses[p.id])}
                    style={{ background: '#F7F5F0', border: '1px solid #E8E3D8', borderRadius: 8, padding: '6px 14px', fontSize: 12, fontWeight: 600, cursor: 'pointer' }}>
                    📋 Copy
                  </button>
                  <button onClick={() => setAnalyses(prev => { const n = { ...prev }; delete n[p.id]; return n; })}
                    style={{ background: '#FDECEA', color: '#C0392B', border: 'none', borderRadius: 8, padding: '6px 14px', fontSize: 12, fontWeight: 600, cursor: 'pointer' }}>
                    Dismiss
                  </button>
                </div>
              </div>
            )}
          </div>
        );
      })}

      {/* Add Property Modal */}
      {showAdd && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100 }}
          onClick={() => setShowAdd(false)}>
          <div style={{ background: 'white', borderRadius: 16, padding: 32, width: 600, maxHeight: '88vh', overflowY: 'auto', boxShadow: '0 8px 32px rgba(0,0,0,0.15)' }}
            onClick={e => e.stopPropagation()}>
            <div style={{ fontWeight: 700, fontSize: 18, marginBottom: 4 }}>Add Property</div>
            <div style={{ fontSize: 13, color: '#8C8070', marginBottom: 20 }}>The more details you add, the better the AI rent analysis.</div>
            {renderTabs(formTab, setFormTab)}
            {formTab === 'basics' && renderBasics(form, setForm)}
            {formTab === 'features' && renderFeatures(form, setForm)}
            {formTab === 'financials' && renderFinancials(form, setForm)}
            {formTab === 'details' && renderDetails(form, setForm)}
            {renderNavButtons(formTab, setFormTab, () => saveProperty(form))}
          </div>
        </div>
      )}

      {/* Edit Property Modal */}
      {editingId && editForm && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100 }}
          onClick={() => { setEditingId(null); setEditForm(null); }}>
          <div style={{ background: 'white', borderRadius: 16, padding: 32, width: 600, maxHeight: '88vh', overflowY: 'auto', boxShadow: '0 8px 32px rgba(0,0,0,0.15)' }}
            onClick={e => e.stopPropagation()}>
            <div style={{ fontWeight: 700, fontSize: 18, marginBottom: 4 }}>Edit Property</div>
            <div style={{ fontSize: 13, color: '#8C8070', marginBottom: 20 }}>{editForm.address}</div>
            {renderTabs(editTab, setEditTab)}
            {editTab === 'basics' && renderBasics(editForm, setEditForm)}
            {editTab === 'features' && renderFeatures(editForm, setEditForm)}
            {editTab === 'financials' && renderFinancials(editForm, setEditForm)}
            {editTab === 'details' && renderDetails(editForm, setEditForm)}
            {renderNavButtons(editTab, setEditTab, () => saveProperty(editForm, editingId))}
          </div>
        </div>
      )}
    </div>
  );
}