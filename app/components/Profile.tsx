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
  const [subscriptionStatus, setSubscriptionStatus] = useState<string | null>(null);
  const [trialEndsAt, setTrialEndsAt] = useState<string | null>(null);
  const [stripeCustomerId, setStripeCustomerId] = useState<string | null>(null);
  const [billingLoading, setBillingLoading] = useState(false);
  const [subscribing, setSubscribing] = useState(false);
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [deleteText, setDeleteText] = useState('');
  const [deleting, setDeleting] = useState(false);
  const [deleted, setDeleted] = useState(false);
  const [notifications, setNotifications] = useState({ notify_payment: true, notify_overdue: true, notify_renewal: true });

  useEffect(() => { fetchProfile(); }, []);

  // Poll for subscription activation if incomplete
  useEffect(() => {
    if (subscriptionStatus !== 'incomplete') return;
    const interval = setInterval(async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      const { data } = await supabase.from('profiles').select('subscription_status').eq('id', user.id).single();
      if (data?.subscription_status === 'active') {
        setSubscriptionStatus('active');
        clearInterval(interval);
      }
    }, 5000);
    return () => clearInterval(interval);
  }, [subscriptionStatus]);

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
      setSubscriptionStatus(data.subscription_status || null);
      setTrialEndsAt(data.trial_ends_at || null);
      setStripeCustomerId(data.stripe_customer_id || null);
      setNotifications({
        notify_payment: data.notify_payment !== false,
        notify_overdue: data.notify_overdue !== false,
        notify_renewal: data.notify_renewal !== false,
      });
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
      ...notifications,
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

  const startTrial = async () => {
    setSubscribing(true);
    try {
      const res = await fetch('/api/stripe/subscribe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ user_id: userId, email: profile.email, name: profile.full_name }),
      });
      const data = await res.json();
      if (data.checkoutUrl) {
        window.location.href = data.checkoutUrl;
      } else {
        alert(data.error || 'Failed to start checkout');
        setSubscribing(false);
      }
    } catch (err: any) {
      alert(err.message || 'Failed to start checkout.');
      setSubscribing(false);
    }
  };

  const openBillingPortal = async () => {
    setBillingLoading(true);
    try {
      const res = await fetch('/api/stripe/billing-portal', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ user_id: userId }),
      });
      const data = await res.json();
      if (data.url) window.location.href = data.url;
      else alert(data.error || 'Could not open billing portal.');
    } catch (err: any) {
      alert(err.message || 'Failed to open billing portal.');
    }
    setBillingLoading(false);
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

      {/* Subscription */}
      <div style={{ background: T.surface, border: `1px solid ${T.border}`, borderRadius: T.radius, padding: 24, marginBottom: 20, boxShadow: T.shadow }}>
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 16, marginBottom: 16 }}>
          <div>
            <div style={{ fontWeight: 700, fontSize: 15, color: T.navy, marginBottom: 4 }}>Subscription</div>
            <div style={{ fontSize: 13, color: T.inkMuted }}>Keywise Pro — $19/month</div>
          </div>
          {subscriptionStatus && (
            <span style={{
              background: subscriptionStatus === 'active' ? T.greenLight
                : subscriptionStatus === 'incomplete' ? T.amberLight
                : subscriptionStatus === 'past_due' ? '#FFF4EE'
                : '#F3F4F6',
              color: subscriptionStatus === 'active' ? T.greenDark
                : subscriptionStatus === 'incomplete' ? T.amberDark
                : subscriptionStatus === 'past_due' ? '#C2410C'
                : T.inkMuted,
              border: `1px solid ${subscriptionStatus === 'active' ? T.green + '33'
                : subscriptionStatus === 'incomplete' ? T.amber + '44'
                : subscriptionStatus === 'past_due' ? '#FED7AA'
                : T.border}`,
              borderRadius: 20, padding: '5px 12px', fontSize: 12, fontWeight: 700,
              whiteSpace: 'nowrap' as const, flexShrink: 0,
            }}>
              {subscriptionStatus === 'active' ? '✓ Pro Active'
                : subscriptionStatus === 'incomplete' ? '⏳ Processing...'
                : subscriptionStatus === 'past_due' ? '⚠ Payment Failed'
                : subscriptionStatus === 'cancelled' ? 'Cancelled'
                : subscriptionStatus}
            </span>
          )}
        </div>

        {/* No subscription / no customer yet */}
        {(!subscriptionStatus || !stripeCustomerId) && (
          <>
            <div style={{ fontSize: 13, color: T.inkMuted, marginBottom: 16, lineHeight: 1.6 }}>
              Upgrade to Pro to unlock unlimited units, online rent collection, payment reminders, and priority support.
            </div>
            <button onClick={startTrial} disabled={subscribing || !userId}
              style={{ ...btn.primary, opacity: subscribing ? 0.7 : 1, marginBottom: 10 }}>
              {subscribing ? 'Setting up…' : 'Upgrade to Pro →'}
            </button>
            <div style={{ fontSize: 12, color: T.inkMuted }}>Free forever · Pro $19/month · Cancel anytime</div>
          </>
        )}

        {/* Trialing */}
        {subscriptionStatus === 'trialing' && (() => {
          const daysLeft = trialEndsAt
            ? Math.max(0, Math.ceil((new Date(trialEndsAt).getTime() - Date.now()) / 86400000))
            : null;
          const endDate = trialEndsAt
            ? new Date(trialEndsAt).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })
            : null;
          return (
            <>
              <div style={{ background: '#E0FAF5', border: `1px solid ${T.teal}44`, borderRadius: T.radiusSm, padding: '10px 14px', fontSize: 13, color: T.tealDark, marginBottom: 16, lineHeight: 1.5 }}>
                {daysLeft !== null && <><strong>{daysLeft} day{daysLeft !== 1 ? 's' : ''} remaining</strong> · </>}
                {endDate && <>Trial ends {endDate}</>}
              </div>
              <button onClick={openBillingPortal} disabled={billingLoading}
                style={{ ...btn.teal, opacity: billingLoading ? 0.7 : 1 }}>
                {billingLoading ? 'Loading…' : 'Add Payment Method →'}
              </button>
            </>
          );
        })()}

        {/* Active */}
        {subscriptionStatus === 'active' && (
          <>
            <button onClick={openBillingPortal} disabled={billingLoading}
              style={{ ...btn.ghost, fontSize: 13, opacity: billingLoading ? 0.7 : 1, marginBottom: 10 }}>
              {billingLoading ? 'Loading…' : 'Manage Billing →'}
            </button>
            <div style={{ fontSize: 12, color: T.inkMuted }}>
              Opens Stripe's secure portal to update your payment method or cancel.
            </div>
          </>
        )}

        {/* Past due */}
        {subscriptionStatus === 'past_due' && (
          <>
            <div style={{ background: '#FFF4EE', border: '1px solid #FED7AA', borderRadius: T.radiusSm, padding: '10px 14px', fontSize: 13, color: '#C2410C', fontWeight: 600, marginBottom: 16 }}>
              ⚠ Payment failed — update your payment method to restore access.
            </div>
            <button onClick={openBillingPortal} disabled={billingLoading}
              style={{ background: '#C2410C', color: '#fff', border: 'none', borderRadius: T.radiusSm, padding: '9px 18px', fontSize: 13, fontWeight: 600, cursor: billingLoading ? 'default' : 'pointer', opacity: billingLoading ? 0.7 : 1 }}>
              {billingLoading ? 'Loading…' : 'Update Payment Method →'}
            </button>
          </>
        )}

        {/* Cancelled */}
        {subscriptionStatus === 'cancelled' && (
          <>
            <div style={{ fontSize: 13, color: T.inkMuted, marginBottom: 16 }}>
              Your subscription has been cancelled. Reactivate to restore Pro features.
            </div>
            <button onClick={startTrial} disabled={subscribing}
              style={{ ...btn.primary, opacity: subscribing ? 0.7 : 1 }}>
              {subscribing ? 'Setting up…' : 'Reactivate Plan →'}
            </button>
          </>
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
        <div style={{ background: T.surface, border: `1px solid ${T.border}`, borderRadius: T.radius, padding: 24, marginBottom: 20, boxShadow: T.shadow }}>
          <div style={{ fontWeight: 700, fontSize: 15, color: T.navy, marginBottom: 6 }}>Import Documents</div>
          <div style={{ fontSize: 13, color: T.inkMuted, marginBottom: 16 }}>
            Bulk upload leases, insurance certificates, and receipts — AI organizes everything automatically.
          </div>
          <button onClick={onImport} style={{ ...btn.teal }}>
            ✦ Import Documents
          </button>
        </div>
      )}

      {/* Notifications */}
      <div style={{ background: T.surface, border: `1px solid ${T.border}`, borderRadius: T.radius, padding: 24, boxShadow: T.shadow, marginBottom: 24 }}>
        <div style={{ fontWeight: 700, fontSize: 15, color: T.navy, marginBottom: 16 }}>Email Notifications</div>
        {[
          { key: 'notify_payment', label: 'Payment received', desc: 'Get notified when a tenant makes a payment' },
          { key: 'notify_overdue', label: 'Rent overdue', desc: 'Get notified when rent is past due' },
          { key: 'notify_renewal', label: 'Lease expiring', desc: 'Get notified when a lease expires within 60 days' },
        ].map(n => (
          <div key={n.key} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 0', borderBottom: `1px solid ${T.border}` }}>
            <div>
              <div style={{ fontSize: 13, fontWeight: 600, color: T.ink }}>{n.label}</div>
              <div style={{ fontSize: 12, color: T.inkMuted, marginTop: 2 }}>{n.desc}</div>
            </div>
            <button
              onClick={() => setNotifications(prev => ({ ...prev, [n.key]: !prev[n.key as keyof typeof prev] }))}
              style={{
                width: 44, height: 24, borderRadius: 12, border: 'none', cursor: 'pointer',
                background: notifications[n.key as keyof typeof notifications] ? T.teal : T.border,
                position: 'relative', transition: 'background 0.2s', flexShrink: 0,
              }}>
              <div style={{
                width: 20, height: 20, borderRadius: '50%', background: 'white',
                position: 'absolute', top: 2,
                left: notifications[n.key as keyof typeof notifications] ? 22 : 2,
                transition: 'left 0.2s', boxShadow: '0 1px 3px rgba(0,0,0,0.2)',
              }} />
            </button>
          </div>
        ))}
        <div style={{ fontSize: 11, color: T.inkMuted, marginTop: 12 }}>
          Changes are saved when you click "Save Profile" above.
        </div>
      </div>

      {/* Danger Zone */}
      <div style={{ border: '1.5px solid #FCA5A5', borderRadius: T.radius, padding: 24 }}>
        <div style={{ fontWeight: 700, fontSize: 15, color: '#DC2626', marginBottom: 6 }}>Danger Zone</div>
        <div style={{ fontSize: 13, color: T.inkMuted, marginBottom: 16, lineHeight: 1.6 }}>
          Permanently delete your account and all associated data. This cannot be undone.
        </div>
        <button onClick={() => { setDeleteModalOpen(true); setDeleteText(''); }}
          style={{ background: 'transparent', color: '#DC2626', border: '1.5px solid #FCA5A5', borderRadius: T.radiusSm, padding: '9px 18px', fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>
          Delete Account
        </button>
      </div>

      {/* Delete confirmation modal */}
      {deleteModalOpen && (
        <div onClick={e => { if (e.target === e.currentTarget && !deleting) { setDeleteModalOpen(false); setDeleteText(''); } }}
          style={{ position: 'fixed', inset: 0, background: 'rgba(15,52,96,0.5)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20, backdropFilter: 'blur(3px)' }}>
          <div style={{ width: '100%', maxWidth: 440, background: '#fff', borderRadius: 16, padding: 32, boxShadow: '0 24px 80px rgba(0,0,0,0.2)', position: 'relative' }}>
            {!deleting && !deleted && (
              <button onClick={() => { setDeleteModalOpen(false); setDeleteText(''); }}
                style={{ position: 'absolute', top: 14, right: 16, background: 'none', border: 'none', fontSize: 22, cursor: 'pointer', color: T.inkMuted, lineHeight: 1 }}>×</button>
            )}

            {deleted ? (
              <div style={{ textAlign: 'center', padding: '16px 0' }}>
                <div style={{ fontSize: 36, marginBottom: 16 }}>👋</div>
                <div style={{ fontSize: 17, fontWeight: 700, color: T.navy, marginBottom: 8 }}>Account deleted</div>
                <div style={{ fontSize: 13, color: T.inkMuted }}>Your account has been permanently deleted. Redirecting…</div>
              </div>
            ) : (
              <>
                <div style={{ width: 44, height: 44, borderRadius: 12, background: '#FFF5F5', border: '1px solid #FCA5A5', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 22, marginBottom: 16 }}>⚠️</div>
                <div style={{ fontSize: 18, fontWeight: 700, color: '#DC2626', marginBottom: 8 }}>Delete your account?</div>
                <div style={{ fontSize: 13, color: T.inkMuted, marginBottom: 16, lineHeight: 1.6 }}>
                  This will permanently delete all of your data including:
                </div>
                <ul style={{ margin: '0 0 20px', padding: '0 0 0 20px', fontSize: 13, color: T.inkMid, lineHeight: 1.9 }}>
                  <li>Properties and units</li>
                  <li>Leases and tenant records</li>
                  <li>Payment history</li>
                  <li>Documents and maintenance records</li>
                  <li>Your Stripe subscription (cancelled immediately)</li>
                </ul>
                <div style={{ background: '#FFF5F5', border: '1px solid #FCA5A5', borderRadius: T.radiusSm, padding: '10px 14px', fontSize: 12, color: '#DC2626', fontWeight: 600, marginBottom: 20 }}>
                  This action is irreversible and cannot be undone.
                </div>
                <label style={{ ...label, marginBottom: 6, display: 'block' }}>
                  Type <strong>DELETE</strong> to confirm
                </label>
                <input
                  style={{ ...input, marginBottom: 20, borderColor: deleteText === 'DELETE' ? '#DC2626' : undefined }}
                  type="text"
                  placeholder="DELETE"
                  value={deleteText}
                  onChange={e => setDeleteText(e.target.value)}
                  autoComplete="off"
                  spellCheck={false}
                />
                <div style={{ display: 'flex', gap: 10 }}>
                  <button
                    disabled={deleteText !== 'DELETE' || deleting}
                    onClick={async () => {
                      setDeleting(true);
                      try {
                        const res = await fetch('/api/delete-account', {
                          method: 'POST',
                          headers: { 'Content-Type': 'application/json' },
                          body: JSON.stringify({ user_id: userId }),
                        });
                        const data = await res.json();
                        if (data.success) {
                          setDeleted(true);
                          setTimeout(async () => {
                            await supabase.auth.signOut();
                          }, 1500);
                        } else {
                          alert('Error: ' + (data.error || 'Failed to delete account.'));
                          setDeleting(false);
                        }
                      } catch (err: any) {
                        alert(err.message || 'Failed to delete account.');
                        setDeleting(false);
                      }
                    }}
                    style={{
                      flex: 1, background: deleteText === 'DELETE' ? '#DC2626' : '#F3F4F6',
                      color: deleteText === 'DELETE' ? '#fff' : T.inkMuted,
                      border: 'none', borderRadius: T.radiusSm, padding: '11px', fontSize: 13,
                      fontWeight: 700, cursor: deleteText !== 'DELETE' || deleting ? 'default' : 'pointer',
                      opacity: deleting ? 0.7 : 1, transition: 'all 0.15s',
                    }}>
                    {deleting ? 'Deleting…' : 'Permanently Delete Account'}
                  </button>
                  <button onClick={() => { setDeleteModalOpen(false); setDeleteText(''); }}
                    disabled={deleting}
                    style={{ ...btn.ghost, fontSize: 13, opacity: deleting ? 0.5 : 1 }}>
                    Cancel
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
