'use client';
import { useState, useEffect, useRef } from 'react';
import { supabase } from '../lib/supabase';
import { T, input, label, btn } from '../lib/theme';

function AddressAutocomplete({
  value,
  onChange,
  onSelect,
  placeholder,
}: {
  value: string;
  onChange: (v: string) => void;
  onSelect: (address: string) => void;
  placeholder?: string;
}) {
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [open, setOpen] = useState(false);
  const [dropdownRect, setDropdownRect] = useState<{ top: number; left: number; width: number } | null>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (inputRef.current && !inputRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  const updateDropdownPos = () => {
    if (!inputRef.current) return;
    const rect = inputRef.current.getBoundingClientRect();
    setDropdownRect({ top: rect.bottom + window.scrollY + 4, left: rect.left, width: rect.width });
  };

  const fetchSuggestions = (query: string) => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    if (query.length < 3) { setSuggestions([]); setOpen(false); return; }
    debounceRef.current = setTimeout(async () => {
      const token = process.env.NEXT_PUBLIC_MAPBOX_TOKEN;
      console.log('[Mapbox] Fetching suggestions for:', query, '| token present:', !!token);
      if (!token) {
        console.warn('[Mapbox] NEXT_PUBLIC_MAPBOX_TOKEN is not set');
        return;
      }
      const url = `https://api.mapbox.com/geocoding/v5/mapbox.places/${encodeURIComponent(query)}.json?access_token=${token}&types=address&country=US&limit=5`;
      const res = await fetch(url);
      const data = await res.json();
      console.log('[Mapbox] Response status:', res.status, '| features:', data.features?.length ?? 0, data);
      const places = (data.features || []).map((f: any) => f.place_name as string);
      setSuggestions(places);
      if (places.length > 0) {
        updateDropdownPos();
        setOpen(true);
      } else {
        setOpen(false);
      }
    }, 300);
  };

  return (
    <>
      <input
        ref={inputRef}
        style={input}
        value={value}
        placeholder={placeholder || 'Start typing an address…'}
        onChange={e => { onChange(e.target.value); fetchSuggestions(e.target.value); }}
        onFocus={() => { if (suggestions.length > 0) { updateDropdownPos(); setOpen(true); } }}
        autoComplete="off"
      />
      {open && dropdownRect && suggestions.length > 0 && (
        <div style={{
          position: 'fixed',
          top: dropdownRect.top,
          left: dropdownRect.left,
          width: dropdownRect.width,
          zIndex: 1000,
          background: '#fff',
          border: `1px solid ${T.border}`,
          borderRadius: 8,
          boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
          overflow: 'hidden',
        }}>
          {suggestions.map((s, i) => (
            <div
              key={i}
              onMouseDown={e => { e.preventDefault(); onSelect(s); setSuggestions([]); setOpen(false); }}
              style={{
                padding: '10px 14px', fontSize: 13, cursor: 'pointer',
                borderBottom: i < suggestions.length - 1 ? `1px solid ${T.border}` : 'none',
                color: T.ink, background: '#fff',
              }}
              onMouseEnter={e => (e.currentTarget.style.background = T.tealLight)}
              onMouseLeave={e => (e.currentTarget.style.background = '#fff')}
            >
              {s}
            </div>
          ))}
        </div>
      )}
    </>
  );
}

type Building = {
  id: string;
  address: string;
  name: string;
  type: string;
  year_built: number;
  num_units: number;
  mortgage: number;
  insurance: number;
  hoa_fee: number;
  notes: string;
};

type Unit = {
  id: string;
  address: string;
  unit_number: string;
  building_id: string;
  beds: number;
  baths: number;
  sqft: number;
  current_rent: number;
  pets: string;
  laundry: string;
  parking: string;
};

type Lease = {
  id: string;
  tenant_name: string;
  property: string;
  rent: number;
  end_date: string;
  status: string;
  email: string;
  phone: string;
};

const BUILDING_TYPES = [
  'Single Family', 'Duplex', 'Triplex', 'Fourplex',
  'Multi-Unit (5+)', 'Apartment Building', 'Condo', 'Townhouse', 'Other',
];

export default function Portfolio() {
  const [buildings, setBuildings] = useState<Building[]>([]);
  const [units, setUnits] = useState<Unit[]>([]);
  const [leases, setLeases] = useState<Lease[]>([]);
  const [expenses, setExpenses] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedBuilding, setExpandedBuilding] = useState<string | null>(null);
  const [showAddBuilding, setShowAddBuilding] = useState(false);
  const [showAddUnit, setShowAddUnit] = useState(false);
  const [editingBuilding, setEditingBuilding] = useState<Building | null>(null);
  const [editingUnit, setEditingUnit] = useState<Unit | null>(null);
  const [saving, setSaving] = useState(false);
  const [analyzing, setAnalyzing] = useState<string | null>(null);
  const [analyses, setAnalyses] = useState<{ [key: string]: string }>({});
  const [lookingUp, setLookingUp] = useState(false);
  const [lookupResult, setLookupResult] = useState<string | null>(null);
  const [buildingAddressSelected, setBuildingAddressSelected] = useState(false);
  const [unitLookingUp, setUnitLookingUp] = useState(false);
  const [unitLookupResult, setUnitLookupResult] = useState<string | null>(null);
  const [unitAddressSelected, setUnitAddressSelected] = useState(false);

  const emptyBuilding = {
    address: '', name: '', type: 'Duplex', year_built: '',
    num_units: '2', mortgage: '', insurance: '', hoa_fee: '', notes: '',
  };
  const emptyUnit = {
    building_id: '', unit_number: '', beds: '2', baths: '1',
    sqft: '', current_rent: '', pets: 'no pets', laundry: 'in-unit', parking: 'included',
  };

  const [buildingForm, setBuildingForm] = useState<any>(emptyBuilding);
  const [unitForm, setUnitForm] = useState<any>(emptyUnit);

  useEffect(() => { fetchAll(); }, []);

  const fetchAll = async () => {
    setLoading(true);
    const [bRes, uRes, lRes, eRes] = await Promise.all([
      supabase.from('buildings').select('*').order('address'),
      supabase.from('properties').select('*').eq('is_unit', true).order('unit_number'),
      supabase.from('leases').select('*').order('tenant_name'),
      supabase.from('expenses').select('*').order('date', { ascending: false }),
    ]);
    if (bRes.data) setBuildings(bRes.data);
    if (uRes.data) setUnits(uRes.data);
    if (lRes.data) setLeases(lRes.data);
    if (eRes.data) setExpenses(eRes.data);
    if (bRes.data && bRes.data.length > 0 && !expandedBuilding) {
      setExpandedBuilding(bRes.data[0].id);
    }
    setLoading(false);
  };

  const saveBuilding = async () => {
    setSaving(true);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { setSaving(false); return; }

    const payload = {
      user_id: user.id,
      address: buildingForm.address,
      name: buildingForm.name,
      type: buildingForm.type,
      year_built: +buildingForm.year_built || null,
      num_units: +buildingForm.num_units || 2,
      mortgage: +buildingForm.mortgage || 0,
      insurance: +buildingForm.insurance || 0,
      hoa_fee: +buildingForm.hoa_fee || 0,
      notes: buildingForm.notes,
    };

    let error;
    if (editingBuilding) {
      ({ error } = await supabase.from('buildings').update(payload).eq('id', editingBuilding.id));
    } else {
      ({ error } = await supabase.from('buildings').insert(payload));
    }

    if (error) { alert('Error: ' + error.message); }
    else {
      await fetchAll();
      setShowAddBuilding(false);
      setEditingBuilding(null);
      setBuildingForm(emptyBuilding);
    }
    setSaving(false);
  };

  const saveUnit = async () => {
    setSaving(true);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { setSaving(false); return; }

    const building = buildings.find(b => b.id === unitForm.building_id);
    const address = building
      ? building.address + (unitForm.unit_number ? ', Unit ' + unitForm.unit_number : '')
      : '';

    const payload = {
      user_id: user.id,
      building_id: unitForm.building_id,
      unit_number: unitForm.unit_number,
      address,
      is_unit: true,
      beds: +unitForm.beds || 1,
      baths: parseFloat(unitForm.baths) || 1,
      sqft: +unitForm.sqft || null,
      current_rent: +unitForm.current_rent || 0,
      pets: unitForm.pets,
      laundry: unitForm.laundry,
      parking: unitForm.parking,
    };

    let error;
    if (editingUnit) {
      ({ error } = await supabase.from('properties').update(payload).eq('id', editingUnit.id));
    } else {
      ({ error } = await supabase.from('properties').insert(payload));
    }

    if (error) { alert('Error: ' + error.message); }
    else {
      await fetchAll();
      setShowAddUnit(false);
      setEditingUnit(null);
      setUnitForm(emptyUnit);
    }
    setSaving(false);
  };

  const deleteBuilding = async (id: string) => {
    if (!confirm('Delete this building? Units inside will also be removed.')) return;
    await supabase.from('properties').delete().eq('building_id', id);
    await supabase.from('buildings').delete().eq('id', id);
    await fetchAll();
  };

  const deleteUnit = async (id: string) => {
    if (!confirm('Remove this unit?')) return;
    await supabase.from('properties').delete().eq('id', id);
    await fetchAll();
  };

  const formatLookupResult = (d: any): string => {
    const parts: string[] = [];
    if (d.beds) parts.push(`${d.beds} bed`);
    if (d.baths) parts.push(`${d.baths} bath`);
    if (d.sqft) parts.push(`${d.sqft.toLocaleString()} sqft`);
    if (d.year_built) parts.push(`built ${d.year_built}`);
    if (d.estimated_value) parts.push(`est. value $${d.estimated_value.toLocaleString()}`);
    return parts.join(' · ') || 'Some data found';
  };

  const lookupBuildingData = async () => {
    if (!buildingForm.address) return;
    setLookingUp(true);
    setLookupResult(null);
    const res = await fetch('/api/lookup-property', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ address: buildingForm.address }),
    });
    const data = await res.json();
    setLookingUp(false);
    if (!data.found || !data.data) {
      setLookupResult('none');
      return;
    }
    const d = data.data;
    const typeMap: Record<string, string> = {
      house: 'Single Family', condo: 'Condo', duplex: 'Duplex',
      apartment: 'Apartment Building', townhouse: 'Townhouse',
    };
    setBuildingForm((f: any) => ({
      ...f,
      year_built: d.year_built ?? f.year_built,
      num_units: d.num_units ?? f.num_units,
      type: d.property_type && typeMap[d.property_type.toLowerCase()] ? typeMap[d.property_type.toLowerCase()] : f.type,
    }));
    setLookupResult(formatLookupResult(d));
  };

  const lookupUnitData = async () => {
    const building = buildings.find(b => b.id === unitForm.building_id);
    const address = building
      ? building.address + (unitForm.unit_number ? ', Unit ' + unitForm.unit_number : '')
      : '';
    if (!address) return;
    setUnitLookingUp(true);
    setUnitLookupResult(null);
    const res = await fetch('/api/lookup-property', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ address }),
    });
    const data = await res.json();
    setUnitLookingUp(false);
    if (!data.found || !data.data) {
      setUnitLookupResult('none');
      return;
    }
    const d = data.data;
    setUnitForm((f: any) => ({
      ...f,
      beds: d.beds ?? f.beds,
      baths: d.baths ? String(d.baths) : f.baths,
      sqft: d.sqft ?? f.sqft,
    }));
    setUnitLookupResult(formatLookupResult(d));
  };

  const openEditBuilding = (building: Building) => {
    setEditingBuilding(building);
    setBuildingForm({
      address: building.address || '',
      name: building.name || '',
      type: building.type || 'Duplex',
      year_built: building.year_built || '',
      num_units: building.num_units || 2,
      mortgage: building.mortgage || '',
      insurance: building.insurance || '',
      hoa_fee: building.hoa_fee || '',
      notes: building.notes || '',
    });
    setLookupResult(null);
    setBuildingAddressSelected(false);
    setShowAddBuilding(true);
  };

  const openEditUnit = (unit: Unit) => {
    setEditingUnit(unit);
    setUnitForm({
      building_id: unit.building_id || '',
      unit_number: unit.unit_number || '',
      beds: unit.beds || '2',
      baths: unit.baths || '1',
      sqft: unit.sqft || '',
      current_rent: unit.current_rent || '',
      pets: unit.pets || 'no pets',
      laundry: unit.laundry || 'in-unit',
      parking: unit.parking || 'included',
    });
    setUnitLookupResult(null);
    setUnitAddressSelected(false);
    setShowAddUnit(true);
  };

  const analyzeBuilding = async (building: Building) => {
    setAnalyzing(building.id);
    const buildingUnits = units.filter(u => u.building_id === building.id);
    const totalRent = buildingUnits.reduce((s, u) => {
      const lease = leases.find(l => l.property?.includes(building.address));
      return s + (lease?.rent || u.current_rent || 0);
    }, 0);
    const monthlyFixed = (building.mortgage || 0) + (building.insurance || 0) + (building.hoa_fee || 0);
    const cashFlow = totalRent - monthlyFixed;

    const res = await fetch('/api/claude', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        prompt: 'Analyze this rental property:\n\nBuilding: ' + building.address + '\nType: ' + building.type + '\nUnits: ' + building.num_units + '\nTotal monthly rent: $' + totalRent + '\nMortgage: $' + (building.mortgage || 0) + '/mo\nInsurance: $' + (building.insurance || 0) + '/mo\nHOA: $' + (building.hoa_fee || 0) + '/mo\nNet cash flow: $' + cashFlow + '/mo\n\nProvide: 1) Cash flow assessment, 2) Is this performing well? 3) Key risks, 4) Top 2-3 ways to improve returns. Be specific and practical.',
      }),
    });
    const data = await res.json();
    setAnalyses(prev => ({ ...prev, [building.id]: data.result }));
    setAnalyzing(null);
  };

  const getBuildingCashFlow = (building: Building) => {
    const buildingUnits = units.filter(u => u.building_id === building.id);
    const totalRent = buildingUnits.reduce((s, u) => {
      const lease = leases.find(l => l.property?.includes(u.address || building.address));
      return s + (lease?.rent || u.current_rent || 0);
    }, 0);
    const fixed = (building.mortgage || 0) + (building.insurance || 0) + (building.hoa_fee || 0);
    const buildingExpenses = expenses.filter(e =>
      e.building_id === building.id || e.property?.includes(building.address)
    );
    const monthExpenses = buildingExpenses
      .filter(e => e.date?.startsWith(new Date().toISOString().slice(0, 7)))
      .reduce((s, e) => s + (e.amount || 0), 0);
    return { totalRent, fixed, net: totalRent - fixed - monthExpenses };
  };

  const getUnitLease = (unit: Unit) =>
    leases.find(l => l.property === unit.address || l.property?.includes('Unit ' + unit.unit_number));

  const getDaysLeft = (endDate: string) =>
    Math.ceil((new Date(endDate).getTime() - new Date().getTime()) / 86400000);

  const formatBaths = (baths: number) =>
    baths % 1 === 0 ? baths.toString() : baths.toFixed(1);

  // Bathroom options including half baths
  const BATH_OPTIONS = ['1', '1.5', '2', '2.5', '3', '3.5', '4'];
  const BED_OPTIONS = ['Studio', '1', '2', '3', '4', '5'];

  if (loading) return <div style={{ textAlign: 'center', padding: 60, color: T.inkMuted }}>Loading portfolio…</div>;

  return (
    <div>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
        <div style={{ fontSize: 13, color: T.inkMuted }}>
          {buildings.length} building{buildings.length !== 1 ? 's' : ''} · {units.length} unit{units.length !== 1 ? 's' : ''}
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          {buildings.length > 0 && (
            <button onClick={() => { setUnitForm({ ...emptyUnit, building_id: buildings[0].id }); setEditingUnit(null); setShowAddUnit(true); }}
              style={{ ...btn.ghost, fontSize: 12, padding: '7px 14px' }}>
              + Add Unit
            </button>
          )}
          <button onClick={() => { setBuildingForm(emptyBuilding); setEditingBuilding(null); setShowAddBuilding(true); }}
            style={{ ...btn.primary, fontSize: 12, padding: '7px 14px' }}>
            + Add Building
          </button>
        </div>
      </div>

      {/* Empty state */}
      {buildings.length === 0 && (
        <div style={{ background: T.surface, border: `1px solid ${T.border}`, borderRadius: T.radius, padding: 48, textAlign: 'center', boxShadow: T.shadow }}>
          <div style={{ fontSize: 40, marginBottom: 12 }}>🏘️</div>
          <div style={{ fontWeight: 700, fontSize: 16, color: T.navy, marginBottom: 6 }}>Add your first building</div>
          <div style={{ color: T.inkMuted, fontSize: 13, marginBottom: 24, maxWidth: 400, margin: '0 auto 24px' }}>
            Start with the building — then add individual units. Mortgage, insurance, and shared costs live at the building level.
          </div>
          <button onClick={() => setShowAddBuilding(true)} style={{ ...btn.primary }}>+ Add Building</button>
        </div>
      )}

      {/* Buildings */}
      {buildings.map(building => {
        const cf = getBuildingCashFlow(building);
        const buildingUnits = units.filter(u => u.building_id === building.id);
        const isExpanded = expandedBuilding === building.id;

        return (
          <div key={building.id} style={{ background: T.surface, border: `1px solid ${T.border}`, borderRadius: T.radius, marginBottom: 20, boxShadow: T.shadow, overflow: 'hidden' }}>

            {/* Building header */}
            <div style={{ padding: '20px 24px', borderBottom: isExpanded ? `1px solid ${T.border}` : 'none' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <div style={{ flex: 1, cursor: 'pointer' }} onClick={() => setExpandedBuilding(isExpanded ? null : building.id)}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 6 }}>
                    <span style={{ fontSize: 20 }}>🏘️</span>
                    <div style={{ fontWeight: 700, fontSize: 17, color: T.navy }}>
                      {building.name || building.address}
                    </div>
                    {building.name && (
                      <div style={{ fontSize: 13, color: T.inkMuted }}>{building.address}</div>
                    )}
                    <span style={{ background: T.bg, color: T.inkMid, fontSize: 11, fontWeight: 600, padding: '2px 8px', borderRadius: 20, border: `1px solid ${T.border}` }}>
                      {building.type} · {building.num_units} unit{building.num_units !== 1 ? 's' : ''}
                    </span>
                    {building.year_built && (
                      <span style={{ fontSize: 11, color: T.inkMuted }}>Built {building.year_built}</span>
                    )}
                  </div>

                  {/* Financials */}
                  <div style={{ display: 'flex', gap: 24, flexWrap: 'wrap', marginTop: 10 }}>
                    {[
                      { label: 'Rent Income', value: '$' + cf.totalRent.toLocaleString() + '/mo', color: T.greenDark },
                      { label: 'Fixed Costs', value: '$' + cf.fixed.toLocaleString() + '/mo', color: T.coral },
                      { label: 'Net Cash Flow', value: (cf.net >= 0 ? '+' : '') + '$' + cf.net.toLocaleString() + '/mo', color: cf.net >= 0 ? T.greenDark : T.coral },
                    ].map(item => (
                      <div key={item.label}>
                        <div style={{ fontSize: 11, color: T.inkMuted, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.4px' }}>{item.label}</div>
                        <div style={{ fontSize: 15, fontWeight: 700, color: item.color, marginTop: 2 }}>{item.value}</div>
                      </div>
                    ))}
                  </div>

                  {/* Cost breakdown */}
                  {(building.mortgage > 0 || building.insurance > 0 || building.hoa_fee > 0) && (
                    <div style={{ display: 'flex', gap: 16, marginTop: 8, flexWrap: 'wrap' }}>
                      {building.mortgage > 0 && <span style={{ fontSize: 12, color: T.inkMuted }}>🏦 ${building.mortgage.toLocaleString()} mortgage</span>}
                      {building.insurance > 0 && <span style={{ fontSize: 12, color: T.inkMuted }}>🛡️ ${building.insurance.toLocaleString()} insurance</span>}
                      {building.hoa_fee > 0 && <span style={{ fontSize: 12, color: T.inkMuted }}>🏘️ ${building.hoa_fee.toLocaleString()} HOA</span>}
                    </div>
                  )}
                </div>

                {/* Actions */}
                <div style={{ display: 'flex', gap: 8, marginLeft: 16, flexShrink: 0 }}>
                  <button onClick={() => analyzeBuilding(building)} disabled={analyzing === building.id}
                    style={{ ...btn.teal, fontSize: 12, padding: '7px 14px' }}>
                    {analyzing === building.id ? 'Analyzing…' : '✦ Analyze'}
                  </button>
                  <button onClick={() => openEditBuilding(building)}
                    style={{ ...btn.ghost, fontSize: 12, padding: '7px 12px' }}>
                    ✏️ Edit
                  </button>
                  <button onClick={() => deleteBuilding(building.id)}
                    style={{ ...btn.danger, fontSize: 12, padding: '7px 12px' }}>
                    Remove
                  </button>
                  <span onClick={() => setExpandedBuilding(isExpanded ? null : building.id)}
                    style={{ fontSize: 16, color: T.inkMuted, cursor: 'pointer', padding: '7px 4px' }}>
                    {isExpanded ? '▲' : '▼'}
                  </span>
                </div>
              </div>
            </div>

            {/* AI Analysis */}
            {analyses[building.id] && (
              <div style={{ padding: '0 24px 16px', borderBottom: `1px solid ${T.border}` }}>
                <div style={{ background: T.tealLight, border: `1px solid ${T.teal}33`, borderRadius: T.radiusSm, padding: 16, fontSize: 13, lineHeight: 1.75, whiteSpace: 'pre-wrap', color: T.ink }}>
                  {analyses[building.id]}
                </div>
                <button onClick={() => setAnalyses(prev => { const n = { ...prev }; delete n[building.id]; return n; })}
                  style={{ ...btn.danger, fontSize: 11, padding: '4px 10px', marginTop: 8 }}>Dismiss</button>
              </div>
            )}

            {/* Units */}
            {isExpanded && (
              <div style={{ padding: '20px 24px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
                  <div style={{ fontSize: 12, fontWeight: 700, color: T.inkMuted, textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                    Units ({buildingUnits.length})
                  </div>
                  <button onClick={() => { setUnitForm({ ...emptyUnit, building_id: building.id }); setEditingUnit(null); setShowAddUnit(true); }}
                    style={{ ...btn.ghost, fontSize: 11, padding: '5px 12px' }}>
                    + Add Unit
                  </button>
                </div>

                {buildingUnits.length === 0 && (
                  <div style={{ textAlign: 'center', padding: '24px', background: T.bg, borderRadius: T.radiusSm, color: T.inkMuted, fontSize: 13 }}>
                    No units yet — add units to track tenants, leases, and cash flow per unit.
                  </div>
                )}

                <div style={{ display: 'grid', gridTemplateColumns: buildingUnits.length > 2 ? 'repeat(3, 1fr)' : buildingUnits.length === 2 ? '1fr 1fr' : '1fr', gap: 12 }}>
                  {buildingUnits.map(unit => {
                    const lease = getUnitLease(unit);
                    const daysLeft = lease?.end_date ? getDaysLeft(lease.end_date) : null;
                    const expiring = daysLeft !== null && daysLeft <= 90 && daysLeft > 0;
                    const expired = daysLeft !== null && daysLeft < 0;

                    return (
                      <div key={unit.id} style={{ background: T.bg, border: `1px solid ${T.border}`, borderRadius: T.radiusSm, padding: 16 }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 10 }}>
                          <div>
                            <div style={{ fontWeight: 700, fontSize: 14, color: T.ink }}>
                              {unit.unit_number ? 'Unit ' + unit.unit_number : unit.address}
                            </div>
                            <div style={{ fontSize: 12, color: T.inkMuted, marginTop: 2 }}>
                              {unit.beds === 0 ? 'Studio' : unit.beds + 'bd'} · {formatBaths(unit.baths)}ba
                              {unit.sqft ? ' · ' + unit.sqft.toLocaleString() + ' sqft' : ''}
                            </div>
                            <div style={{ fontSize: 11, color: T.inkMuted, marginTop: 2 }}>
                              {unit.laundry && unit.laundry} · {unit.pets && unit.pets}
                            </div>
                          </div>
                          <div style={{ display: 'flex', flexDirection: 'column', gap: 4, alignItems: 'flex-end' }}>
                            {lease ? (
                              <span style={{
                                background: expired ? T.coralLight : expiring ? T.amberLight : T.greenLight,
                                color: expired ? T.coral : expiring ? T.amberDark : T.greenDark,
                                fontSize: 10, fontWeight: 700, padding: '2px 7px', borderRadius: 20, textTransform: 'uppercase',
                              }}>
                                {expired ? 'Expired' : expiring ? 'Renew Soon' : 'Occupied'}
                              </span>
                            ) : (
                              <span style={{ background: T.surface, color: T.inkMuted, fontSize: 10, fontWeight: 700, padding: '2px 7px', borderRadius: 20, textTransform: 'uppercase', border: `1px solid ${T.border}` }}>
                                Vacant
                              </span>
                            )}
                            <div style={{ display: 'flex', gap: 4 }}>
                              <button onClick={() => openEditUnit(unit)}
                                style={{ background: 'none', border: 'none', color: T.inkMuted, fontSize: 12, cursor: 'pointer', padding: '2px 4px' }}>
                                ✏️
                              </button>
                              <button onClick={() => deleteUnit(unit.id)}
                                style={{ background: 'none', border: 'none', color: T.coral, fontSize: 12, cursor: 'pointer', padding: '2px 4px' }}>
                                ✕
                              </button>
                            </div>
                          </div>
                        </div>

                        {lease ? (
                          <div style={{ borderTop: `1px solid ${T.border}`, paddingTop: 10 }}>
                            <div style={{ fontWeight: 600, fontSize: 13, color: T.ink }}>{lease.tenant_name}</div>
                            <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 4 }}>
                              <span style={{ fontSize: 13, fontWeight: 700, color: T.navy }}>${(lease.rent || 0).toLocaleString()}/mo</span>
                              <span style={{ fontSize: 11, color: T.inkMuted }}>
                                {daysLeft !== null && daysLeft > 0 ? daysLeft + 'd left' : daysLeft !== null && daysLeft < 0 ? 'expired' : ''}
                              </span>
                            </div>
                            {lease.email && <div style={{ fontSize: 11, color: T.inkMuted, marginTop: 4 }}>📧 {lease.email}</div>}
                            {lease.phone && <div style={{ fontSize: 11, color: T.inkMuted }}>📞 {lease.phone}</div>}
                          </div>
                        ) : (
                          <div style={{ borderTop: `1px solid ${T.border}`, paddingTop: 10 }}>
                            <div style={{ fontSize: 12, color: T.inkMuted }}>
                              Market rent: <span style={{ fontWeight: 700, color: T.navy }}>${(unit.current_rent || 0).toLocaleString()}/mo</span>
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>

                {/* Building cost allocation */}
                {buildingUnits.length > 1 && (building.mortgage > 0 || building.insurance > 0) && (
                  <div style={{ marginTop: 16, padding: 14, background: T.bg, borderRadius: T.radiusSm, fontSize: 12, border: `1px solid ${T.border}` }}>
                    <div style={{ fontWeight: 700, color: T.inkMuted, textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: 8, fontSize: 11 }}>
                      Building costs split equally across {buildingUnits.length} units
                    </div>
                    <div style={{ display: 'flex', gap: 20, flexWrap: 'wrap' }}>
                      {building.mortgage > 0 && (
                        <span style={{ color: T.inkMid }}>
                          🏦 ${Math.round(building.mortgage / buildingUnits.length).toLocaleString()}/unit mortgage
                        </span>
                      )}
                      {building.insurance > 0 && (
                        <span style={{ color: T.inkMid }}>
                          🛡️ ${Math.round(building.insurance / buildingUnits.length).toLocaleString()}/unit insurance
                        </span>
                      )}
                      {building.hoa_fee > 0 && (
                        <span style={{ color: T.inkMid }}>
                          🏘️ ${Math.round(building.hoa_fee / buildingUnits.length).toLocaleString()}/unit HOA
                        </span>
                      )}
                      <span style={{ fontWeight: 700, color: T.tealDark }}>
                        = ${Math.round(((building.mortgage || 0) + (building.insurance || 0) + (building.hoa_fee || 0)) / buildingUnits.length).toLocaleString()}/unit total
                      </span>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        );
      })}

      {/* Add / Edit Building Modal */}
      {showAddBuilding && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100 }}
          onClick={() => { setShowAddBuilding(false); setEditingBuilding(null); setBuildingForm(emptyBuilding); setLookupResult(null); setBuildingAddressSelected(false); }}>
          <div style={{ background: T.surface, borderRadius: T.radiusLg, padding: 32, width: 540, maxHeight: '90vh', overflowY: 'auto', boxShadow: T.shadowMd }}
            onClick={e => e.stopPropagation()}>
            <div style={{ fontWeight: 700, fontSize: 18, color: T.navy, marginBottom: 4 }}>
              {editingBuilding ? 'Edit Building' : 'Add Building'}
            </div>
            <div style={{ fontSize: 13, color: T.inkMuted, marginBottom: 24 }}>
              Mortgage, insurance, and shared costs live at the building level.
            </div>

            <div style={{ marginBottom: 14 }}>
              <label style={label}>Building Address *</label>
              <AddressAutocomplete
                value={buildingForm.address}
                placeholder="42 Maple St, Dana Point, CA 92629"
                onChange={v => { setBuildingForm({ ...buildingForm, address: v }); setBuildingAddressSelected(false); setLookupResult(null); }}
                onSelect={v => { setBuildingForm({ ...buildingForm, address: v }); setBuildingAddressSelected(true); setLookupResult(null); }}
              />
              {buildingAddressSelected && (
                <div style={{ marginTop: 8 }}>
                  <button
                    onClick={lookupBuildingData}
                    disabled={lookingUp}
                    style={{ background: 'none', border: 'none', padding: 0, cursor: 'pointer', fontSize: 13, color: T.tealDark, fontWeight: 600 }}>
                    {lookingUp ? '✦ Searching public records…' : '✦ Look up property data'}
                  </button>
                </div>
              )}
              {lookupResult && lookupResult !== 'none' && (
                <div style={{ marginTop: 8, background: T.tealLight, border: `1px solid ${T.teal}44`, borderRadius: T.radiusSm, padding: '10px 14px' }}>
                  <div style={{ fontSize: 13, color: T.tealDark, fontWeight: 600 }}>✦ Found: {lookupResult}</div>
                  <div style={{ fontSize: 11, color: T.tealDark, marginTop: 3, opacity: 0.8 }}>Not right? Edit the fields below.</div>
                </div>
              )}
              {lookupResult === 'none' && (
                <div style={{ marginTop: 8, background: T.bg, border: `1px solid ${T.border}`, borderRadius: T.radiusSm, padding: '10px 14px', fontSize: 13, color: T.inkMuted }}>
                  No public data found for this address. Please fill in manually.
                </div>
              )}
            </div>

            <div style={{ marginBottom: 14 }}>
              <label style={label}>Nickname (optional)</label>
              <input style={input} value={buildingForm.name} placeholder="e.g. Maple Duplex, Ocean View Building"
                onChange={e => setBuildingForm({ ...buildingForm, name: e.target.value })} />
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 12, marginBottom: 14 }}>
              <div>
                <label style={label}>Building Type</label>
                <select style={input} value={buildingForm.type} onChange={e => setBuildingForm({ ...buildingForm, type: e.target.value })}>
                  {BUILDING_TYPES.map(t => <option key={t}>{t}</option>)}
                </select>
              </div>
              <div>
                <label style={label}>Number of Units</label>
                <input style={input} type="number" min="1" value={buildingForm.num_units}
                  onChange={e => setBuildingForm({ ...buildingForm, num_units: e.target.value })} />
              </div>
              <div>
                <label style={label}>Year Built</label>
                <input style={input} type="number" value={buildingForm.year_built} placeholder="1995"
                  onChange={e => setBuildingForm({ ...buildingForm, year_built: e.target.value })} />
              </div>
            </div>

            <div style={{ borderTop: `1px solid ${T.border}`, paddingTop: 16, marginBottom: 4 }}>
              <div style={{ fontSize: 11, fontWeight: 700, color: T.inkMuted, textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: 14 }}>
                Building-level Monthly Costs
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 12, marginBottom: 14 }}>
                {[
                  { label: 'Mortgage ($/mo)', key: 'mortgage', placeholder: '2800' },
                  { label: 'Insurance ($/mo)', key: 'insurance', placeholder: '150' },
                  { label: 'HOA Fee ($/mo)', key: 'hoa_fee', placeholder: '0' },
                ].map(f => (
                  <div key={f.key}>
                    <label style={label}>{f.label}</label>
                    <input style={input} type="number" value={buildingForm[f.key]} placeholder={f.placeholder}
                      onChange={e => setBuildingForm({ ...buildingForm, [f.key]: e.target.value })} />
                  </div>
                ))}
              </div>
            </div>

            <div style={{ marginBottom: 24 }}>
              <label style={label}>Notes</label>
              <textarea value={buildingForm.notes} onChange={e => setBuildingForm({ ...buildingForm, notes: e.target.value })}
                placeholder="Any notes about this building…"
                style={{ ...input, minHeight: 60, resize: 'vertical' as const }} />
            </div>

            <div style={{ display: 'flex', gap: 10 }}>
              <button onClick={saveBuilding} disabled={saving || !buildingForm.address} style={{ ...btn.primary }}>
                {saving ? 'Saving…' : editingBuilding ? 'Save Changes' : 'Save Building'}
              </button>
              <button onClick={() => { setShowAddBuilding(false); setEditingBuilding(null); setBuildingForm(emptyBuilding); setLookupResult(null); setBuildingAddressSelected(false); }}
                style={{ ...btn.ghost }}>Cancel</button>
            </div>
          </div>
        </div>
      )}

      {/* Add / Edit Unit Modal */}
      {showAddUnit && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100 }}
          onClick={() => { setShowAddUnit(false); setEditingUnit(null); setUnitForm(emptyUnit); setUnitLookupResult(null); setUnitAddressSelected(false); }}>
          <div style={{ background: T.surface, borderRadius: T.radiusLg, padding: 32, width: 500, boxShadow: T.shadowMd }}
            onClick={e => e.stopPropagation()}>
            <div style={{ fontWeight: 700, fontSize: 18, color: T.navy, marginBottom: 4 }}>
              {editingUnit ? 'Edit Unit' : 'Add Unit'}
            </div>
            <div style={{ fontSize: 13, color: T.inkMuted, marginBottom: 24 }}>
              Each unit has its own lease, tenant, and rent — building costs are shared above.
            </div>

            <div style={{ marginBottom: 14 }}>
              <label style={label}>Building</label>
              <select style={input} value={unitForm.building_id}
                onChange={e => setUnitForm({ ...unitForm, building_id: e.target.value })}>
                <option value="">Select building…</option>
                {buildings.map(b => <option key={b.id} value={b.id}>{b.name || b.address}</option>)}
              </select>
            </div>

            <div style={{ marginBottom: 14 }}>
              <label style={label}>Unit Number / Identifier</label>
              <input style={input} value={unitForm.unit_number} placeholder="e.g. 1, 2, A, B, Upper, Lower"
                onChange={e => setUnitForm({ ...unitForm, unit_number: e.target.value })} />
              {unitForm.building_id && (
                <div style={{ marginTop: 8 }}>
                  <button
                    onClick={lookupUnitData}
                    disabled={unitLookingUp}
                    style={{ background: 'none', border: 'none', padding: 0, cursor: 'pointer', fontSize: 13, color: T.tealDark, fontWeight: 600 }}>
                    {unitLookingUp ? '✦ Searching public records…' : '✦ Look up unit data'}
                  </button>
                </div>
              )}
              {unitLookupResult && unitLookupResult !== 'none' && (
                <div style={{ marginTop: 8, background: T.tealLight, border: `1px solid ${T.teal}44`, borderRadius: T.radiusSm, padding: '10px 14px' }}>
                  <div style={{ fontSize: 13, color: T.tealDark, fontWeight: 600 }}>✦ Found: {unitLookupResult}</div>
                  <div style={{ fontSize: 11, color: T.tealDark, marginTop: 3, opacity: 0.8 }}>Not right? Edit the fields below.</div>
                </div>
              )}
              {unitLookupResult === 'none' && (
                <div style={{ marginTop: 8, background: T.bg, border: `1px solid ${T.border}`, borderRadius: T.radiusSm, padding: '10px 14px', fontSize: 13, color: T.inkMuted }}>
                  No public data found for this unit. Please fill in manually.
                </div>
              )}
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 12, marginBottom: 14 }}>
              <div>
                <label style={label}>Bedrooms</label>
                <select style={input} value={unitForm.beds}
                  onChange={e => setUnitForm({ ...unitForm, beds: e.target.value })}>
                  {BED_OPTIONS.map(b => <option key={b} value={b === 'Studio' ? '0' : b}>{b}</option>)}
                </select>
              </div>
              <div>
                <label style={label}>Bathrooms</label>
                <select style={input} value={String(unitForm.baths)}
                  onChange={e => setUnitForm({ ...unitForm, baths: e.target.value })}>
                  {BATH_OPTIONS.map(b => <option key={b} value={b}>{b} bath{parseFloat(b) !== 1 ? 's' : ''}</option>)}
                </select>
              </div>
              <div>
                <label style={label}>Sqft</label>
                <input style={input} type="number" value={unitForm.sqft} placeholder="850"
                  onChange={e => setUnitForm({ ...unitForm, sqft: e.target.value })} />
              </div>
            </div>

            <div style={{ marginBottom: 14 }}>
              <label style={label}>Market Rent ($/mo)</label>
              <input style={input} type="number" value={unitForm.current_rent} placeholder="1800"
                onChange={e => setUnitForm({ ...unitForm, current_rent: e.target.value })} />
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 12, marginBottom: 24 }}>
              <div>
                <label style={label}>Laundry</label>
                <select style={input} value={unitForm.laundry}
                  onChange={e => setUnitForm({ ...unitForm, laundry: e.target.value })}>
                  {['in-unit', 'shared', 'hookups only', 'none'].map(l => <option key={l}>{l}</option>)}
                </select>
              </div>
              <div>
                <label style={label}>Parking</label>
                <select style={input} value={unitForm.parking}
                  onChange={e => setUnitForm({ ...unitForm, parking: e.target.value })}>
                  {['included', '1 space', '2 spaces', 'street only', 'none'].map(p => <option key={p}>{p}</option>)}
                </select>
              </div>
              <div>
                <label style={label}>Pets</label>
                <select style={input} value={unitForm.pets}
                  onChange={e => setUnitForm({ ...unitForm, pets: e.target.value })}>
                  {['no pets', 'cats only', 'small dogs', 'all pets allowed'].map(p => <option key={p}>{p}</option>)}
                </select>
              </div>
            </div>

            <div style={{ display: 'flex', gap: 10 }}>
              <button onClick={saveUnit} disabled={saving || !unitForm.building_id} style={{ ...btn.primary }}>
                {saving ? 'Saving…' : editingUnit ? 'Save Changes' : 'Save Unit'}
              </button>
              <button onClick={() => { setShowAddUnit(false); setEditingUnit(null); setUnitForm(emptyUnit); setUnitLookupResult(null); setUnitAddressSelected(false); }}
                style={{ ...btn.ghost }}>Cancel</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}