'use client';
import { useState } from 'react';
import { supabase } from '../lib/supabase';

export default function TrialBanner({
  subscriptionStatus,
  trialEndsAt,
  userId,
}: {
  subscriptionStatus: string | null;
  trialEndsAt: string | null;
  userId: string;
}) {
  const [dismissed, setDismissed] = useState(false);
  const [loading, setLoading] = useState(false);

  // Show for free users (no subscription) or trialing users
  if (dismissed || subscriptionStatus === 'active') return null;
  if (!subscriptionStatus && typeof window !== 'undefined' && localStorage.getItem('kw_upgrade_dismissed')) return null;

  const isTrialing = subscriptionStatus === 'trialing';
  const daysLeft = isTrialing && trialEndsAt
    ? Math.max(0, Math.ceil((new Date(trialEndsAt).getTime() - Date.now()) / 86400000))
    : null;

  const handleUpgrade = async () => {
    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { setLoading(false); return; }
      const { data: profile } = await supabase.from('profiles').select('email, full_name').eq('id', user.id).single();
      const res = await fetch('/api/stripe/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ user_id: user.id, email: profile?.email || user.email, name: profile?.full_name || '', return_path: 'portfolio' }),
      });
      const data = await res.json();
      if (data.checkoutUrl) window.location.href = data.checkoutUrl;
      else if (data.error) alert('Error: ' + data.error);
    } catch (err: any) {
      alert('Error: ' + (err.message || 'Could not start checkout'));
    }
    setLoading(false);
  };

  return (
    <div style={{
      background: 'linear-gradient(90deg, #0F3460 0%, #1a4a80 100%)',
      padding: '10px 20px',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      gap: 12,
      flexShrink: 0,
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, minWidth: 0 }}>
        <span style={{ fontSize: 15, flexShrink: 0 }}>✦</span>
        <span style={{ fontSize: 13, color: '#fff', fontWeight: 600, lineHeight: 1.4 }}>
          {isTrialing && daysLeft !== null
            ? `Trial ends in ${daysLeft} day${daysLeft !== 1 ? 's' : ''}. `
            : "You're on the free plan. "
          }
          <span style={{ fontWeight: 400, opacity: 0.9 }}>
            Upgrade to Pro for $19/mo — unlimited units + online payments.
          </span>
        </span>
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0 }}>
        <button onClick={handleUpgrade} disabled={loading}
          style={{ background: '#00D4AA', color: '#0F3460', border: 'none', borderRadius: 7, padding: '6px 14px', fontSize: 12, fontWeight: 700, cursor: loading ? 'default' : 'pointer', opacity: loading ? 0.7 : 1, whiteSpace: 'nowrap' }}>
          {loading ? 'Loading…' : 'Upgrade to Pro →'}
        </button>
        <button onClick={() => { setDismissed(true); if (!subscriptionStatus) localStorage.setItem('kw_upgrade_dismissed', '1'); }}
          style={{ background: 'transparent', border: 'none', color: 'rgba(255,255,255,0.5)', fontSize: 18, lineHeight: 1, cursor: 'pointer', padding: '2px 4px' }}>
          ×
        </button>
      </div>
    </div>
  );
}
