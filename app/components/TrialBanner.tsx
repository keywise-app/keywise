'use client';
import { useState } from 'react';

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

  if (dismissed || subscriptionStatus !== 'trialing') return null;

  const daysLeft = trialEndsAt
    ? Math.max(0, Math.ceil((new Date(trialEndsAt).getTime() - Date.now()) / 86400000))
    : null;

  const openBillingPortal = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/stripe/billing-portal', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ user_id: userId }),
      });
      const data = await res.json();
      if (data.url) window.location.href = data.url;
    } catch {
      // silently fail — user can go to settings
    }
    setLoading(false);
  };

  return (
    <div style={{
      background: 'linear-gradient(90deg, #00A886 0%, #00C9A0 100%)',
      padding: '10px 20px',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      gap: 12,
      flexShrink: 0,
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, minWidth: 0 }}>
        <span style={{ fontSize: 15, flexShrink: 0 }}>⏱</span>
        <span style={{ fontSize: 13, color: '#fff', fontWeight: 600, lineHeight: 1.4 }}>
          {daysLeft !== null
            ? `Your free trial ends in ${daysLeft} day${daysLeft !== 1 ? 's' : ''}.`
            : 'Your free trial is active.'}{' '}
          <span style={{ fontWeight: 400, opacity: 0.9 }}>Add a payment method to keep Pro access after your trial.</span>
        </span>
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0 }}>
        <button
          onClick={openBillingPortal}
          disabled={loading}
          style={{
            background: '#fff', color: '#00A886', border: 'none',
            borderRadius: 7, padding: '6px 14px', fontSize: 12, fontWeight: 700,
            cursor: loading ? 'default' : 'pointer', opacity: loading ? 0.7 : 1,
            whiteSpace: 'nowrap',
          }}>
          {loading ? 'Loading…' : 'Add Payment Method →'}
        </button>
        <button
          onClick={() => setDismissed(true)}
          style={{
            background: 'transparent', border: 'none',
            color: 'rgba(255,255,255,0.7)', fontSize: 18, lineHeight: 1,
            cursor: 'pointer', padding: '2px 4px',
          }}
          aria-label="Dismiss">
          ×
        </button>
      </div>
    </div>
  );
}
