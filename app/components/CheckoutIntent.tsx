'use client';

import { useState } from 'react';
import { workspaceApi } from '../lib/workspace-api';

export type CheckoutPlan = 'monthly' | 'annual' | 'founding';

const offers: Record<CheckoutPlan, { name: string; price: string }> = {
  monthly: { name: 'Pro monthly', price: '$49/month after your 14-day trial' },
  annual: { name: 'Pro annual', price: '$390/year after your 14-day trial' },
  founding: { name: 'Founding member', price: '$29/month after your 14-day trial, while your subscription stays active' },
};

export function checkoutPlanFromSearch(search: string): CheckoutPlan | null {
  const plan = new URLSearchParams(search).get('plan');
  return plan === 'monthly' || plan === 'annual' || plan === 'founding' ? plan : null;
}

export default function CheckoutIntent({ plan, onDismiss }: { plan: CheckoutPlan; onDismiss: () => void }) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const offer = offers[plan];

  async function continueToCheckout() {
    setBusy(true);
    setError('');
    try {
      const { checkoutUrl } = await workspaceApi('/api/stripe/checkout', {
        method: 'POST',
        body: JSON.stringify({ plan, return_path: 'portfolio' }),
      });
      if (typeof checkoutUrl !== 'string' || !checkoutUrl.startsWith('https://checkout.stripe.com/')) {
        throw new Error('Checkout is unavailable. Please try again.');
      }
      window.location.assign(checkoutUrl);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Checkout is unavailable. Please try again.');
      setBusy(false);
    }
  }

  return <main style={{ minHeight: '100vh', background: '#F3F7F7', color: '#253950', fontFamily: 'Inter, system-ui, sans-serif', padding: '48px 20px' }}>
    <section style={{ maxWidth: 520, margin: '0 auto', background: '#fff', border: '1px solid #DEE6EA', borderRadius: 18, padding: 'clamp(24px, 6vw, 40px)', boxShadow: '0 12px 40px #0F346015' }}>
      <p style={{ color: '#006D5A', fontSize: 13, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.08em' }}>Your Keywise account is ready</p>
      <h1 style={{ color: '#0F3460', fontSize: 32, lineHeight: 1.15, margin: '10px 0 16px' }}>Review your plan</h1>
      <p style={{ fontSize: 17, lineHeight: 1.6 }}>You selected <strong>{offer.name}</strong>. {offer.price}. A card is required to start the trial. Stripe will show the full terms before you confirm.</p>
      {plan === 'founding' && <p style={{ fontSize: 15, lineHeight: 1.6 }}>The founding rate is available only while spots remain. Your place is confirmed after checkout, not when you create an account.</p>}
      {error && <p role="alert" style={{ color: '#A3222A', fontSize: 15 }}>{error}</p>}
      <button type="button" onClick={continueToCheckout} disabled={busy} style={{ width: '100%', minHeight: 48, border: 0, borderRadius: 10, background: '#0F3460', color: '#fff', fontSize: 16, fontWeight: 700, cursor: busy ? 'wait' : 'pointer', opacity: busy ? .7 : 1 }}>{busy ? 'Opening checkout…' : 'Continue to secure checkout'}</button>
      <button type="button" onClick={onDismiss} style={{ width: '100%', minHeight: 48, marginTop: 12, border: '1px solid #BECBD6', borderRadius: 10, background: '#fff', color: '#0F3460', fontSize: 16, fontWeight: 650, cursor: 'pointer' }}>Use my free account instead</button>
    </section>
  </main>;
}
