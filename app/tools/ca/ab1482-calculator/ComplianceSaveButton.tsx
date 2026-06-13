'use client';

import { useState } from 'react';
import { supabase } from '../../../../app/lib/supabase';
import { AB1482Input } from '../../../../lib/compliance/ca/ab1482-calculator';
import { RentCapResult } from '../../../../lib/compliance/types';

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

interface CalcEntry {
  input: AB1482Input;
  result: RentCapResult;
  nickname?: string;
}

interface Props {
  calculations: CalcEntry[];
  onSaved?: () => void;
}

export default function ComplianceSaveButton({ calculations, onSaved }: Props) {
  const [status, setStatus] = useState<'idle' | 'saving' | 'saved' | 'signup' | 'signing-up' | 'error'>('idle');
  const [errorMsg, setErrorMsg] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [alertCpi, setAlertCpi] = useState(true);
  const [alertWindow, setAlertWindow] = useState(true);
  const [properties, setProperties] = useState<{ id: string; address: string }[]>([]);
  const [selectedPropertyId, setSelectedPropertyId] = useState<string | null>(null);
  const [showPicker, setShowPicker] = useState(false);

  async function saveToSupabase(userId: string) {
    for (const calc of calculations) {
      let propertyId = selectedPropertyId;

      // If no property selected and we have a nickname, create one
      if (!propertyId && calc.nickname) {
        const { data: prop, error: propErr } = await supabase
          .from('properties')
          .insert({
            user_id: userId,
            address: calc.nickname || `Unit (${calc.input.zipCode})`,
            zip_code: calc.input.zipCode,
            year_built: calc.input.yearBuilt,
            property_type: calc.input.propertyType,
            ab1482_subject: calc.result.eligible,
            current_rent: calc.input.currentRent || null,
            last_rent_increase_date: calc.input.lastIncreaseDate || null,
            last_rent_increase_amount: calc.input.lastIncreaseAmount || null,
          })
          .select('id')
          .single();
        if (propErr) {
          console.error('[compliance-save] property insert error:', propErr);
          continue;
        }
        propertyId = prop?.id || null;
      }

      await supabase.from('compliance_calculations').insert({
        user_id: userId,
        property_id: propertyId,
        calculator: 'ab1482',
        input_data: calc.input,
        result_data: calc.result,
        effective_date: calc.input.effectiveDate,
        created_at: new Date().toISOString(),
      });
    }
  }

  async function handleSave() {
    setStatus('saving');
    setErrorMsg('');
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        // Anonymous — save to sessionStorage and show signup
        try {
          const existing = JSON.parse(sessionStorage.getItem('ab1482_rows') || '[]');
          const updated = [...existing, ...calculations.map(c => ({ input: c.input, result: c.result, nickname: c.nickname }))];
          sessionStorage.setItem('ab1482_rows', JSON.stringify(updated));
        } catch { /* sessionStorage unavailable */ }
        setStatus('signup');
        return;
      }

      // Logged in — fetch properties for picker if single calc
      if (calculations.length === 1) {
        const { data: props } = await supabase
          .from('properties')
          .select('id, address')
          .eq('user_id', user.id)
          .order('address');
        if (props && props.length > 0) {
          setProperties(props);
          setShowPicker(true);
          setStatus('idle');
          return;
        }
      }

      await saveToSupabase(user.id);
      setStatus('saved');
      onSaved?.();
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to save');
      setStatus('error');
    }
  }

  async function handleSaveWithProperty() {
    setStatus('saving');
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      await saveToSupabase(user.id);
      setStatus('saved');
      setShowPicker(false);
      onSaved?.();
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to save');
      setStatus('error');
    }
  }

  async function handleSignup() {
    if (!email || !password) return;
    setStatus('signing-up');
    setErrorMsg('');
    try {
      const { data, error } = await supabase.auth.signUp({ email, password });
      if (error) throw error;
      const userId = data.user?.id;
      if (!userId) throw new Error('Signup succeeded but no user ID returned');

      // Update profile with notification preferences
      await supabase.from('profiles').upsert({
        id: userId,
        email,
        notify_compliance: alertCpi || alertWindow,
      });

      // Save calculations
      await saveToSupabase(userId);

      // Clear sessionStorage
      try { sessionStorage.removeItem('ab1482_rows'); } catch { /* ok */ }

      setStatus('saved');
      onSaved?.();

      // Redirect to dashboard after short delay
      setTimeout(() => { window.location.href = '/'; }, 1500);
    } catch (err: any) {
      setErrorMsg(err.message || 'Signup failed');
      setStatus('error');
    }
  }

  if (status === 'saved') {
    return (
      <div style={{ background: GREEN_LIGHT, border: `1px solid ${GREEN_DARK}44`, borderRadius: 10, padding: '12px 16px', display: 'flex', alignItems: 'center', gap: 8 }}>
        <span style={{ fontSize: 16 }}>&#10003;</span>
        <span style={{ fontSize: 14, fontWeight: 600, color: GREEN_DARK }}>Calculation saved</span>
      </div>
    );
  }

  // Property picker for logged-in user
  if (showPicker) {
    return (
      <div style={{ background: '#fff', border: `1px solid ${BORDER}`, borderRadius: 14, padding: 20 }}>
        <div style={{ fontSize: 14, fontWeight: 700, color: N, marginBottom: 12 }}>Link to a property (optional)</div>
        <select
          style={{ ...inputStyle, marginBottom: 12 }}
          value={selectedPropertyId || ''}
          onChange={e => setSelectedPropertyId(e.target.value || null)}
        >
          <option value="">Create new property</option>
          {properties.map(p => (
            <option key={p.id} value={p.id}>{p.address}</option>
          ))}
        </select>
        <div style={{ display: 'flex', gap: 8 }}>
          <button
            onClick={handleSaveWithProperty}
            disabled={status === 'saving'}
            style={{
              flex: 1, background: N, color: '#fff', border: 'none', borderRadius: 10,
              padding: '11px', fontSize: 14, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit',
            }}
          >
            {status === 'saving' ? 'Saving...' : 'Save'}
          </button>
          <button
            onClick={() => { setShowPicker(false); setStatus('idle'); }}
            style={{
              background: BG, border: `1px solid ${BORDER}`, borderRadius: 10,
              padding: '11px 16px', fontSize: 13, fontWeight: 600, color: N, cursor: 'pointer', fontFamily: 'inherit',
            }}
          >
            Cancel
          </button>
        </div>
      </div>
    );
  }

  // Signup form for anonymous users
  if (status === 'signup' || status === 'signing-up') {
    return (
      <div style={{ background: '#fff', border: `1px solid ${BORDER}`, borderRadius: 14, padding: 24 }}>
        <div style={{ fontSize: 16, fontWeight: 700, color: N, marginBottom: 4 }}>Save your calculations</div>
        <p style={{ fontSize: 13, color: INK_MUTED, marginBottom: 16 }}>
          Create a free Keywise account to save your results and get compliance alerts.
        </p>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <input
            style={inputStyle}
            type="email"
            placeholder="Email"
            value={email}
            onChange={e => setEmail(e.target.value)}
          />
          <input
            style={inputStyle}
            type="password"
            placeholder="Password (6+ characters)"
            value={password}
            onChange={e => setPassword(e.target.value)}
          />
          <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, color: INK_MID, cursor: 'pointer' }}>
            <input type="checkbox" checked={alertCpi} onChange={e => setAlertCpi(e.target.checked)} />
            Notify me when CPI rates update each year
          </label>
          <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, color: INK_MID, cursor: 'pointer' }}>
            <input type="checkbox" checked={alertWindow} onChange={e => setAlertWindow(e.target.checked)} />
            Remind me when rent increase windows open
          </label>
          {errorMsg && (
            <div style={{ fontSize: 13, color: CORAL }}>{errorMsg}</div>
          )}
          <button
            onClick={handleSignup}
            disabled={!email || !password || password.length < 6}
            style={{
              width: '100%', background: (!email || !password || password.length < 6) ? '#C8CDD8' : TEAL,
              color: (!email || !password || password.length < 6) ? '#fff' : N,
              border: 'none', borderRadius: 10, padding: '13px', fontSize: 15, fontWeight: 700,
              cursor: (!email || !password || password.length < 6) ? 'default' : 'pointer', fontFamily: 'inherit',
            }}
          >
            {status === 'signing-up' ? 'Creating account...' : 'Create account & save'}
          </button>
          <div style={{ fontSize: 11, color: INK_MUTED, textAlign: 'center' }}>Free for 1-2 units. No credit card.</div>
        </div>
      </div>
    );
  }

  return (
    <div>
      {errorMsg && (
        <div style={{ fontSize: 13, color: CORAL, marginBottom: 8 }}>{errorMsg}</div>
      )}
      <button
        onClick={handleSave}
        disabled={status === 'saving'}
        style={{
          width: '100%', background: N, color: '#fff',
          border: 'none', borderRadius: 10, padding: '13px', fontSize: 15, fontWeight: 700,
          cursor: status === 'saving' ? 'default' : 'pointer', fontFamily: 'inherit',
        }}
      >
        {status === 'saving' ? 'Saving...' : calculations.length > 1 ? 'Save these calculations' : 'Save this calculation'}
      </button>
    </div>
  );
}
