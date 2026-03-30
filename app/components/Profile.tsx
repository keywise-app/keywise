'use client';
import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { T, input, label, btn } from '../lib/theme';

export default function Profile({ onImport }: { onImport?: () => void }) {
  const [profile, setProfile] = useState({
    full_name: '', email: '', phone: '', company: '', address: '',
  });
  const [stripeAccountId, setStripeAccountId] = useState('');
  const [stripeConnecting, setStripeConnecting] = useState(false);
  const [stripeError, setStripeError] = useState('');
  const [userId, setUserId] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => { fetchProfile(); }, []);

  const fetchProfile = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { setLoading(false); return; }
    setUserId(user.id);
    const { data } = await supabase.from('profiles').select('*').eq('id', user.id).single();
    if (data) {
      setProfile({
        full_name: data.full_name || '',
        email: data.email || '',
        phone: data.phone || '',
        company: data.company || '',
        address: data.address || '',
      });
      setStripeAccountId(data.stripe_account_id || '');
    }
    setLoading(false);
  };

  const saveProfile = async () => {
    setSaving(true);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { setSaving(false); return; }
    const { error } = await supabase.from('profiles').upsert({
      id: user.id,
      full_name: profile.full_name,
      email: profile.email,
      phone: profile.phone,
      company: profile.company,
      address: profile.address,
    });
    if (error) { alert('Error saving: ' + error.message); }
    else { setSaved(true); setTimeout(() => setSaved(false), 3000); }
    setSaving(false);
  };

  const connectStripe = async () => {
    setStripeConnecting(true);
    setStripeError('');
    try {
      const res = await fetch('/api/stripe/connect', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ user_id: userId }),
      });
      const data = await res.json();
      if (data.error) {
        setStripeError(data.error);
        setStripeConnecting(false);
      } else {
        window.location.href = data.url;
        // Don't reset stripeConnecting — page will navigate away
      }
    } catch (err: any) {
      setStripeError(err.message || 'Failed to connect Stripe.');
      setStripeConnecting(false);
    }
  };

  if (loading) return <div style={{ textAlign: 'center', padding: 60, color: T.inkMuted }}>Loading profile…</div>;

  return (
    <div style={{ maxWidth: 560 }}>
      <div style={{ background: T.surface, border: `1px solid ${T.border}`, borderRadius: T.radius, padding: 32, marginBottom: 20, boxShadow: T.shadow }}>
        <div style={{ fontWeight: 700, fontSize: 17, color: T.navy, marginBottom: 4 }}>Landlord Profile</div>
        <div style={{ fontSize: 13, color: T.inkMuted, marginBottom: 24 }}>
          This info appears automatically in every letter, notice, and email draft.
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 16 }}>
          {[
            { label: 'Full Name', key: 'full_name', placeholder: 'John Smith', type: 'text' },
            { label: 'Email Address', key: 'email', placeholder: 'john@email.com', type: 'email' },
            { label: 'Phone Number', key: 'phone', placeholder: '(949) 555-0100', type: 'tel' },
            { label: 'Company / DBA', key: 'company', placeholder: 'Smith Properties LLC', type: 'text' },
          ].map(f => (
            <div key={f.key}>
              <label style={label}>{f.label}</label>
              <input
                type={f.type}
                style={input}
                placeholder={f.placeholder}
                value={profile[f.key as keyof typeof profile]}
                onChange={e => setProfile({ ...profile, [f.key]: e.target.value })}
              />
            </div>
          ))}
        </div>

        <div style={{ marginBottom: 24 }}>
          <label style={label}>Mailing Address</label>
          <input
            type="text"
            style={input}
            placeholder="123 Main St, Dana Point, CA 92629"
            value={profile.address}
            onChange={e => setProfile({ ...profile, address: e.target.value })}
          />
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <button onClick={saveProfile} disabled={saving} style={{ ...btn.primary }}>
            {saving ? 'Saving…' : 'Save Profile'}
          </button>
          {saved && (
            <span style={{ fontSize: 13, color: T.greenDark, fontWeight: 600 }}>✓ Saved</span>
          )}
        </div>
      </div>

      {/* Stripe Payments */}
      <div style={{ background: T.surface, border: `1px solid ${T.border}`, borderRadius: T.radius, padding: 24, marginBottom: 20, boxShadow: T.shadow }}>
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 16 }}>
          <div>
            <div style={{ fontWeight: 700, fontSize: 15, color: T.navy, marginBottom: 4 }}>Payments</div>
            <div style={{ fontSize: 13, color: T.inkMuted, lineHeight: 1.6 }}>
              {stripeAccountId
                ? 'Tenants can pay rent online via Stripe. Payment links are available on each payment row.'
                : 'Connect Stripe to let tenants pay rent online. Keywise will send payment links directly to each tenant.'}
            </div>
          </div>

          {stripeAccountId ? (
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0 }}>
              <span style={{ background: T.greenLight, color: T.greenDark, border: `1px solid ${T.green}33`, borderRadius: 20, padding: '5px 12px', fontSize: 12, fontWeight: 700, whiteSpace: 'nowrap' }}>
                ✓ Stripe Connected
              </span>
            </div>
          ) : (
            <button
              onClick={connectStripe}
              disabled={stripeConnecting || !userId}
              style={{
                flexShrink: 0, background: '#635BFF', color: '#fff', border: 'none',
                borderRadius: T.radiusSm, padding: '9px 18px', fontSize: 13, fontWeight: 600,
                cursor: stripeConnecting ? 'default' : 'pointer', opacity: stripeConnecting ? 0.7 : 1,
                display: 'inline-flex', alignItems: 'center', gap: 6,
              }}>
              {stripeConnecting ? 'Redirecting…' : '⚡ Connect Stripe'}
            </button>
          )}
        </div>

        {stripeAccountId && (
          <div style={{ marginTop: 10, background: T.bg, borderRadius: T.radiusSm, padding: '10px 14px', fontSize: 12, color: T.inkMuted }}>
            Account ID: <span style={{ fontFamily: 'monospace', color: T.inkMid }}>{stripeAccountId}</span>
          </div>
        )}

        <div style={{ marginTop: 14, borderTop: `1px solid ${T.border}`, paddingTop: 14, display: 'flex', flexDirection: 'column', gap: 4 }}>
          <div style={{ fontSize: 12, color: T.inkMid }}>
            <span style={{ fontWeight: 600 }}>Platform fee:</span> $2.00 per transaction (absorbed by landlord)
          </div>
          <div style={{ fontSize: 11, color: T.inkMuted }}>
            Stripe's standard processing fee (2.9% + 30¢) applies separately to each payment.
          </div>
        </div>

        {stripeError && (
          <div style={{ marginTop: 12, background: T.coralLight, border: `1px solid ${T.coral}33`, borderRadius: T.radiusSm, padding: '8px 12px', fontSize: 13, color: T.coral }}>
            {stripeError}
          </div>
        )}
      </div>

      {/* Account */}
      <div style={{ background: T.surface, border: `1px solid ${T.border}`, borderRadius: T.radius, padding: 24, marginBottom: 20, boxShadow: T.shadow }}>
        <div style={{ fontWeight: 700, fontSize: 15, color: T.navy, marginBottom: 6 }}>Account</div>
        <div style={{ fontSize: 13, color: T.inkMuted, marginBottom: 16 }}>
          Signed in as {profile.email || 'your account'}
        </div>
        <button onClick={() => supabase.auth.signOut()}
          style={{ ...btn.ghost, fontSize: 13 }}>
          Sign Out
        </button>
      </div>

      {/* Import */}
      {onImport && (
        <div style={{ background: T.surface, border: `1px solid ${T.border}`, borderRadius: T.radius, padding: 24, boxShadow: T.shadow }}>
          <div style={{ fontWeight: 700, fontSize: 15, color: T.navy, marginBottom: 6 }}>Import Documents</div>
          <div style={{ fontSize: 13, color: T.inkMuted, marginBottom: 16 }}>
            Bulk upload leases, insurance certificates, and receipts — AI organizes everything automatically.
          </div>
          <button onClick={onImport} style={{ ...btn.teal }}>
            ✦ Import Documents
          </button>
        </div>
      )}
    </div>
  );
}
