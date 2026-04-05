'use client';
import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { T, btn } from '../lib/theme';

export default function TenantDashboard({ previewLeaseId }: { previewLeaseId?: string } = {}) {
  const [lease, setLease] = useState<any>(null);
  const [payments, setPayments] = useState<any[]>([]);
  const [documents, setDocuments] = useState<any[]>([]);
  const [landlord, setLandlord] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [msgText, setMsgText] = useState('');
  const [msgSending, setMsgSending] = useState(false);
  const [msgSent, setMsgSent] = useState(false);
  const [payNowLoading, setPayNowLoading] = useState<Record<string, boolean>>({});
  const [docUrls, setDocUrls] = useState<Record<string, string>>({});
  const [docLoading, setDocLoading] = useState<Record<string, boolean>>({});
  const [paymentMethodSaved, setPaymentMethodSaved] = useState(false);
  const [autopayEnabled, setAutopayEnabled] = useState(false);
  const [stripeCustomerId, setStripeCustomerId] = useState<string | null>(null);
  const [stripePaymentMethodId, setStripePaymentMethodId] = useState<string | null>(null);
  const [setupLoading, setSetupLoading] = useState(false);
  const [chargingPayment, setChargingPayment] = useState<string | null>(null);
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth < 768);
    check();
    window.addEventListener('resize', check);
    return () => window.removeEventListener('resize', check);
  }, []);

  useEffect(() => { fetchData(); }, []);

  const fetchData = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { setLoading(false); return; }

    let leaseData: any = null;

    if (previewLeaseId) {
      // Preview mode — fetch by ID using service role API
      const res = await fetch(`/api/tenant-lease?email=${encodeURIComponent(user.email || '')}&user_id=${user.id}`);
      const { lease } = await res.json();
      leaseData = lease;
    } else {
      // Use server-side API to bypass RLS (lease belongs to landlord)
      const res = await fetch(`/api/tenant-lease?email=${encodeURIComponent(user.email || '')}&user_id=${user.id}`);
      const { lease } = await res.json();
      leaseData = lease;
    }

    if (!leaseData) { setLoading(false); return; }
    setLease(leaseData);

    // Use server-side APIs to bypass RLS
    const [payRes, landlordRes, docRes] = await Promise.all([
      fetch(`/api/tenant-lease?email=${encodeURIComponent(user.email || '')}&user_id=${user.id}`).then(() =>
        supabase.from('payments').select('*').eq('lease_id', leaseData.id).order('due_date', { ascending: false })
      ),
      fetch(`/api/tenant/landlord-info?lease_id=${leaseData.id}`).then(r => r.json()),
      fetch(`/api/tenant/documents?lease_id=${leaseData.id}`).then(r => r.json()),
    ]);

    if (payRes.data) setPayments(payRes.data);
    if (landlordRes.landlord) setLandlord(landlordRes.landlord);
    if (docRes.documents) setDocuments(docRes.documents);

    // Load tenant payment method info
    const { data: tenantProfile } = await supabase.from('profiles').select('stripe_customer_id, stripe_payment_method_id, autopay_enabled').eq('id', user.id).single();
    if (tenantProfile?.stripe_payment_method_id) {
      setPaymentMethodSaved(true);
      setStripeCustomerId(tenantProfile.stripe_customer_id);
      setStripePaymentMethodId(tenantProfile.stripe_payment_method_id);
      setAutopayEnabled(tenantProfile.autopay_enabled || false);
    }

    setLoading(false);
  };

  const openPayNow = async (p: any) => {
    if (!lease) return;
    setPayNowLoading(prev => ({ ...prev, [p.id]: true }));
    try {
      const res = await fetch('/api/stripe/payment-link', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          lease_id: lease.id,
          tenant_name: lease.tenant_name,
          property: lease.property,
          amount: p.amount,
          due_date: p.due_date,
          landlord_user_id: lease.user_id,
        }),
      });
      const data = await res.json();
      if (data.error) {
        alert('Could not create payment link: ' + data.error);
      } else {
        window.open(data.url, '_blank');
      }
    } catch (err: any) {
      alert('Error: ' + (err.message || 'Could not create payment link.'));
    }
    setPayNowLoading(prev => ({ ...prev, [p.id]: false }));
  };

  const payWithSavedCard = async (p: any) => {
    if (!stripeCustomerId || !stripePaymentMethodId) return;
    setChargingPayment(p.id);
    try {
      const res = await fetch('/api/tenant/charge', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          payment_id: p.id,
          customer_id: stripeCustomerId,
          payment_method_id: stripePaymentMethodId,
          amount: p.amount,
          landlord_stripe_account_id: landlord?.stripe_account_id || null,
        }),
      });
      const data = await res.json();
      if (data.success) {
        setPayments(prev => prev.map(x => x.id === p.id ? { ...x, status: 'paid', paid_date: new Date().toISOString().split('T')[0], method: 'Auto-Pay (Stripe)' } : x));
      } else {
        alert('Payment failed: ' + (data.error || 'Unknown error'));
      }
    } catch (err: any) {
      alert('Payment error: ' + (err.message || 'Unknown error'));
    }
    setChargingPayment(null);
  };

  const setupPayment = async (type: 'manual' | 'autopay') => {
    if (!lease) return;
    setSetupLoading(true);
    try {
      const res = await fetch('/api/tenant/setup-payment', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          tenant_email: lease.email,
          tenant_name: lease.tenant_name,
          lease_id: lease.id,
          payment_type: type,
        }),
      });
      const data = await res.json();
      if (data.checkoutUrl) {
        window.location.href = data.checkoutUrl;
      } else {
        alert('Setup failed: ' + (data.error || 'Unknown error'));
        setSetupLoading(false);
      }
    } catch (err: any) {
      alert('Error: ' + (err.message || 'Could not set up payment'));
      setSetupLoading(false);
    }
  };

  const sendMessage = async () => {
    if (!msgText.trim()) return;
    setMsgSending(true);
    const senderName = lease?.tenant_name?.split(' ')[0] || 'Your tenant';
    const promises: Promise<any>[] = [];
    if (landlord?.phone) {
      promises.push(fetch('/api/send-sms', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ to: landlord.phone, message: `${senderName}: ${msgText}` }),
      }));
    }
    if (landlord?.email) {
      promises.push(fetch('/api/send-email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          to: landlord.email,
          subject: `Message from ${senderName} — ${lease?.property?.split(',')[0] || lease?.property}`,
          from_name: senderName,
          html: `<p><strong>${senderName}</strong> sent you a message via Keywise:</p><blockquote style="border-left:3px solid #00D4AA;padding-left:12px;margin:12px 0;color:#333">${msgText}</blockquote><p style="color:#888;font-size:12px">Tenant: ${lease?.tenant_name} · ${lease?.property}</p>`,
        }),
      }));
    }
    try {
      await Promise.all(promises);
      setMsgSent(true);
      setMsgText('');
      setTimeout(() => setMsgSent(false), 4000);
    } catch (err: any) {
      alert('Error: ' + (err.message || 'Could not send message.'));
    }
    setMsgSending(false);
  };

  const openDocument = async (doc: any) => {
    if (!doc.file_path) { alert('No file available for this document.'); return; }
    if (docUrls[doc.id]) { window.open(docUrls[doc.id], '_blank'); return; }
    setDocLoading(prev => ({ ...prev, [doc.id]: true }));
    try {
      const { data } = await supabase.storage.from('documents').createSignedUrl(doc.file_path, 3600);
      if (data?.signedUrl) {
        setDocUrls(prev => ({ ...prev, [doc.id]: data.signedUrl }));
        window.open(data.signedUrl, '_blank');
      }
    } catch { /* silent */ }
    setDocLoading(prev => ({ ...prev, [doc.id]: false }));
  };

  const outstanding = payments.filter(p => p.status !== 'paid');
  const history = payments.filter(p => p.status === 'paid');

  const statusStyle = (status: string) => {
    if (status === 'paid') return { background: T.greenLight, color: T.greenDark };
    if (status === 'overdue') return { background: T.coralLight, color: T.coral };
    return { background: T.amberLight, color: T.amberDark };
  };

  const greeting = () => {
    const h = new Date().getHours();
    if (h < 12) return 'Good morning';
    if (h < 17) return 'Good afternoon';
    return 'Good evening';
  };

  const leaseProgress = () => {
    if (!lease?.start_date || !lease?.end_date) return null;
    const start = new Date(lease.start_date).getTime();
    const end = new Date(lease.end_date).getTime();
    const now = Date.now();
    if (now < start || end <= start) return null;
    const pct = Math.min(100, Math.max(0, ((now - start) / (end - start)) * 100));
    const daysLeft = Math.ceil((end - now) / 86400000);
    return { pct, daysLeft };
  };

  if (loading) return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '60vh', color: T.inkMuted, fontSize: 14 }}>
      Loading your dashboard…
    </div>
  );

  if (!lease) return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '60vh' }}>
      <div style={{ textAlign: 'center', maxWidth: 420, padding: '0 20px' }}>
        <div style={{ fontSize: 36, marginBottom: 16 }}>🏠</div>
        <div style={{ fontWeight: 700, fontSize: 18, color: T.navy, marginBottom: 8 }}>Lease not found</div>
        <div style={{ fontSize: 14, color: T.inkMuted, lineHeight: 1.6 }}>
          We couldn't find your lease. Please contact your landlord to confirm your email address matches your lease record.
        </div>
      </div>
    </div>
  );

  const propertyShort = lease.property?.split(',')[0] || lease.property;
  const progress = leaseProgress();

  return (
    <div style={{ maxWidth: isMobile ? '100%' : 800, margin: '0 auto', padding: isMobile ? '0 0 40px' : '0 24px 40px' }}>

      {/* Tenant Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20, padding: isMobile ? '16px 16px 0' : '0' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{ width: 32, height: 32, borderRadius: 8, background: T.navy, display: 'flex', alignItems: 'center', justifyContent: 'center', color: T.teal, fontWeight: 700, fontSize: 14 }}>K</div>
          <span style={{ fontSize: 15, fontWeight: 700, color: T.navy }}>Keywise</span>
        </div>
        {!previewLeaseId && (
          <button onClick={() => supabase.auth.signOut()}
            style={{ background: T.bg, border: `1px solid ${T.border}`, borderRadius: 8, padding: '6px 14px', fontSize: 12, fontWeight: 600, color: T.inkMuted, cursor: 'pointer' }}>
            Sign out
          </button>
        )}
      </div>

      {/* Preview banner */}
      {previewLeaseId && (
        <div style={{ background: T.amberLight, border: `1px solid ${T.amber}44`, borderRadius: T.radiusSm, padding: '10px 16px', marginBottom: 20, fontSize: 13, color: T.amberDark, fontWeight: 600 }}>
          👁 Preview mode — this is what {lease.tenant_name} will see
        </div>
      )}

      {/* Welcome */}
      <div style={{ marginBottom: 24, padding: isMobile ? '0 16px' : '0' }}>
        <div style={{ fontSize: isMobile ? 22 : 26, fontWeight: 700, color: T.navy, letterSpacing: '-0.5px' }}>
          {greeting()}, {lease.tenant_name?.split(' ')[0] || 'there'} 👋
        </div>
        <div style={{ display: 'inline-flex', alignItems: 'center', gap: 6, background: T.tealLight, border: `1px solid ${T.teal}44`, borderRadius: 20, padding: '4px 12px', marginTop: 8 }}>
          <span style={{ fontSize: 13 }}>🏠</span>
          <span style={{ fontSize: 13, color: T.tealDark, fontWeight: 600 }}>{propertyShort}</span>
        </div>
      </div>

      {/* Lease Progress */}
      {progress && (
        <div style={{ background: '#fff', border: `1px solid ${T.border}`, borderRadius: T.radius, padding: 20, marginBottom: 16, boxShadow: T.shadow }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
            <div style={{ fontSize: 13, fontWeight: 600, color: T.navy }}>Lease Progress</div>
            <div style={{ fontSize: 12, color: progress.daysLeft <= 90 ? T.coral : T.inkMuted, fontWeight: 600 }}>
              {progress.daysLeft > 0 ? `${progress.daysLeft} days remaining` : 'Lease ended'}
            </div>
          </div>
          <div style={{ height: 8, background: T.bg, borderRadius: 4, overflow: 'hidden' }}>
            <div style={{
              height: '100%', borderRadius: 4,
              width: `${progress.pct}%`,
              background: progress.daysLeft <= 30 ? T.coral : progress.daysLeft <= 90 ? T.amber : T.teal,
              transition: 'width 0.6s ease',
            }} />
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 6, fontSize: 11, color: T.inkMuted }}>
            <span>{lease.start_date}</span>
            <span>{lease.end_date}</span>
          </div>
        </div>
      )}

      {/* Payment Setup */}
      {!paymentMethodSaved && lease && (
        <div style={{ background: '#fff', borderRadius: T.radius, padding: 24, marginBottom: 16, border: `2px solid ${T.teal}`, boxShadow: T.shadow }}>
          <div style={{ fontWeight: 700, fontSize: 16, color: T.navy, marginBottom: 8 }}>Set Up Payments</div>
          <p style={{ color: T.inkMuted, fontSize: 13, marginBottom: 16, margin: '0 0 16px' }}>
            Save your payment method to pay rent quickly each month.
          </p>
          <div style={{ display: 'flex', gap: 10, flexDirection: isMobile ? 'column' : 'row' }}>
            <button onClick={() => setupPayment('manual')} disabled={setupLoading}
              style={{ ...btn.ghost, flex: 1, padding: '12px', fontSize: 13, opacity: setupLoading ? 0.7 : 1 }}>
              {setupLoading ? 'Setting up...' : '💳 Save Card for Easy Payments'}
            </button>
            <button onClick={() => setupPayment('autopay')} disabled={setupLoading}
              style={{ ...btn.primary, flex: 1, padding: '12px', fontSize: 13, opacity: setupLoading ? 0.7 : 1 }}>
              {setupLoading ? 'Setting up...' : '✓ Set Up Auto-Pay'}
            </button>
          </div>
        </div>
      )}

      {paymentMethodSaved && autopayEnabled && (
        <div style={{ background: T.tealLight, borderRadius: T.radius, padding: 16, marginBottom: 16, border: `1px solid ${T.teal}33` }}>
          <div style={{ fontWeight: 700, color: T.tealDark }}>✓ Auto-Pay Active</div>
          <div style={{ fontSize: 12, color: T.tealDark, marginTop: 4 }}>
            Your rent will be charged automatically on the {lease?.payment_day || 1}st of each month.
          </div>
        </div>
      )}

      {/* Outstanding Payments */}
      <div style={{ background: '#fff', border: `1px solid ${T.border}`, borderRadius: T.radius, padding: 24, marginBottom: 16, boxShadow: T.shadow }}>
        <div style={{ fontWeight: 700, fontSize: 16, color: T.navy, marginBottom: 4 }}>Outstanding Payments</div>
        <div style={{ fontSize: 13, color: T.inkMuted, marginBottom: 16 }}>Payments due or upcoming</div>

        {outstanding.length === 0 ? (
          <div style={{ background: T.greenLight, border: `1px solid ${T.green}33`, borderRadius: T.radiusSm, padding: '14px 18px', display: 'flex', alignItems: 'center', gap: 10 }}>
            <span style={{ fontSize: 18 }}>✓</span>
            <span style={{ fontSize: 14, fontWeight: 600, color: T.greenDark }}>All caught up! No outstanding payments.</span>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {outstanding.map(p => (
              <div key={p.id} style={{
                display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12,
                background: p.status === 'overdue' ? T.coralLight : T.bg,
                border: `1px solid ${p.status === 'overdue' ? T.coral + '44' : T.border}`,
                borderRadius: T.radiusSm, padding: '14px 16px',
              }}>
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 2 }}>
                    <span style={{ fontWeight: 700, fontSize: 20, color: T.navy }}>${(p.amount || 0).toLocaleString()}</span>
                    <span style={{ ...statusStyle(p.status), fontSize: 10, fontWeight: 700, padding: '2px 8px', borderRadius: 20, textTransform: 'uppercase' as const }}>
                      {p.status}
                    </span>
                  </div>
                  <div style={{ fontSize: 13, color: T.inkMuted }}>
                    Due {p.due_date}
                    {p.description ? ` · ${p.description}` : ''}
                  </div>
                </div>
                <div style={{ display: 'flex', gap: 8, flexShrink: 0, flexDirection: isMobile ? 'column' : 'row' }}>
                  {paymentMethodSaved && (
                    <button onClick={() => payWithSavedCard(p)} disabled={chargingPayment === p.id}
                      style={{ background: chargingPayment === p.id ? '#e0e4ff' : T.teal, color: T.navy, border: 'none', borderRadius: T.radiusSm, padding: '10px 16px', fontSize: 12, fontWeight: 700, cursor: chargingPayment === p.id ? 'default' : 'pointer', opacity: chargingPayment === p.id ? 0.7 : 1 }}>
                      {chargingPayment === p.id ? 'Paying...' : '⚡ Pay with Saved Card'}
                    </button>
                  )}
                  <button onClick={() => openPayNow(p)} disabled={payNowLoading[p.id]}
                    style={{ background: payNowLoading[p.id] ? '#e0e4ff' : '#635BFF', color: '#fff', border: 'none', borderRadius: T.radiusSm, padding: '10px 16px', fontSize: 12, fontWeight: 600, cursor: payNowLoading[p.id] ? 'default' : 'pointer', opacity: payNowLoading[p.id] ? 0.7 : 1 }}>
                    {payNowLoading[p.id] ? 'Loading...' : paymentMethodSaved ? 'Pay Other Way' : '⚡ Pay Now'}
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Payment History */}
      {history.length > 0 && (
        <div style={{ background: '#fff', border: `1px solid ${T.border}`, borderRadius: T.radius, padding: 24, marginBottom: 16, boxShadow: T.shadow }}>
          <div style={{ fontWeight: 700, fontSize: 16, color: T.navy, marginBottom: 16 }}>Payment History</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
            {history.map(p => (
              <div key={p.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '11px 0', borderBottom: `1px solid ${T.border}` }}>
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <span style={{ fontSize: 15, fontWeight: 700, color: T.navy }}>${(p.amount || 0).toLocaleString()}</span>
                    <span style={{ ...statusStyle(p.status), fontSize: 10, fontWeight: 700, padding: '2px 8px', borderRadius: 20, textTransform: 'uppercase' as const }}>paid</span>
                  </div>
                  <div style={{ fontSize: 12, color: T.inkMuted, marginTop: 2 }}>
                    {p.paid_date ? `Paid ${p.paid_date}` : `Due ${p.due_date}`}
                    {p.method ? ` · ${p.method}` : ''}
                  </div>
                </div>
                <button
                  onClick={() => {
                    const w = window.open('', '_blank')!;
                    w.document.write(`<!DOCTYPE html><html><head><title>Receipt</title><style>body{font-family:Arial,sans-serif;max-width:500px;margin:40px auto;padding:0 20px}h2{color:#0F3460}table{width:100%;border-collapse:collapse}td{padding:8px 0;border-bottom:1px solid #eee}td:last-child{text-align:right;font-weight:600}@media print{button{display:none}}</style></head><body><h2>Keywise — Payment Receipt</h2><p>Receipt for ${lease.tenant_name} at ${propertyShort}</p><table><tr><td>Amount</td><td>$${(p.amount||0).toLocaleString()}</td></tr><tr><td>Paid On</td><td>${p.paid_date||'—'}</td></tr><tr><td>Method</td><td>${p.method||'—'}</td></tr><tr><td>Property</td><td>${propertyShort}</td></tr></table><br/><button onclick="window.print()">Print Receipt</button></body></html>`);
                    w.document.close();
                  }}
                  style={{ ...btn.ghost, fontSize: 11, padding: '5px 10px', flexShrink: 0 }}>
                  ↓ Receipt
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Documents */}
      {documents.length >= 0 && lease && (
        <div style={{ background: '#fff', border: `1px solid ${T.border}`, borderRadius: T.radius, padding: 24, marginBottom: 16, boxShadow: T.shadow }}>
          <div style={{ fontWeight: 700, fontSize: 16, color: T.navy, marginBottom: 16 }}>Documents</div>
          {documents.length === 0 && (
            <div style={{ textAlign: 'center', padding: 20, color: T.inkMuted, fontSize: 13 }}>No documents yet.</div>
          )}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {documents.map(doc => (
              <div key={doc.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 14px', background: T.bg, borderRadius: T.radiusSm, border: `1px solid ${T.border}` }}>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 13, fontWeight: 600, color: T.navy, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' as const }}>
                    {doc.name || doc.file_name || 'Document'}
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 3 }}>
                    <span style={{ fontSize: 11, color: T.inkMuted }}>{doc.type || 'Document'}</span>
                    {doc.signed_at ? (
                      <span style={{ fontSize: 10, fontWeight: 700, background: T.greenLight, color: T.greenDark, padding: '1px 7px', borderRadius: 10 }}>
                        ✓ Signed {doc.signed_at.slice(0, 10)}
                      </span>
                    ) : doc.requires_signature ? (
                      <span style={{ fontSize: 10, fontWeight: 700, background: T.amberLight, color: T.amberDark, padding: '1px 7px', borderRadius: 10 }}>
                        Awaiting signature
                      </span>
                    ) : null}
                  </div>
                </div>
                <button
                  onClick={() => doc.signed_url ? window.open(doc.signed_url, '_blank') : openDocument(doc)}
                  disabled={docLoading[doc.id]}
                  style={{ ...btn.ghost, fontSize: 11, padding: '5px 12px', flexShrink: 0, marginLeft: 10 }}>
                  {docLoading[doc.id] ? '…' : '↓ View'}
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Lease Details + Landlord */}
      <div style={{ background: '#fff', border: `1px solid ${T.border}`, borderRadius: T.radius, padding: 24, marginBottom: 16, boxShadow: T.shadow }}>
        <div style={{ fontWeight: 700, fontSize: 16, color: T.navy, marginBottom: 16 }}>Lease Details</div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
          {[
            { label: 'Monthly Rent', value: '$' + (lease.rent || 0).toLocaleString() + '/mo' },
            { label: 'Lease Start', value: lease.start_date || '—' },
            { label: 'Lease End', value: lease.end_date || 'Month-to-month' },
            { label: 'Payment Due', value: lease.payment_day ? `${lease.payment_day}${ordinal(lease.payment_day)} of month` : '—' },
          ].map(item => (
            <div key={item.label} style={{ background: T.bg, borderRadius: T.radiusSm, padding: '12px 14px' }}>
              <div style={{ fontSize: 11, color: T.inkMuted, fontWeight: 700, textTransform: 'uppercase' as const, letterSpacing: '0.4px', marginBottom: 4 }}>{item.label}</div>
              <div style={{ fontSize: 14, fontWeight: 700, color: T.navy }}>{item.value}</div>
            </div>
          ))}
        </div>

        {landlord && (
          <div style={{ marginTop: 16, paddingTop: 16, borderTop: `1px solid ${T.border}` }}>
            <div style={{ fontSize: 12, color: T.inkMuted, fontWeight: 700, textTransform: 'uppercase' as const, letterSpacing: '0.4px', marginBottom: 10 }}>Your Landlord</div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 14, background: T.bg, borderRadius: T.radiusSm, padding: '14px 16px' }}>
              <div style={{ width: 40, height: 40, borderRadius: '50%', background: T.navy, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                <span style={{ color: '#fff', fontWeight: 700, fontSize: 16 }}>
                  {(landlord.full_name || landlord.company || '?')[0].toUpperCase()}
                </span>
              </div>
              <div>
                <div style={{ fontSize: 14, fontWeight: 700, color: T.navy }}>{landlord.full_name || landlord.company || '—'}</div>
                <div style={{ display: 'flex', flexWrap: 'wrap' as const, gap: '2px 14px', marginTop: 3 }}>
                  {landlord.email && <span style={{ fontSize: 12, color: T.inkMuted }}>✉ {landlord.email}</span>}
                  {landlord.phone && <span style={{ fontSize: 12, color: T.inkMuted }}>📞 {landlord.phone}</span>}
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Message Landlord */}
      <div style={{ background: '#fff', border: `1px solid ${T.border}`, borderRadius: T.radius, padding: 24, marginBottom: 16, boxShadow: T.shadow }}>
        <div style={{ fontWeight: 700, fontSize: 16, color: T.navy, marginBottom: 4 }}>Message Your Landlord</div>
        <div style={{ fontSize: 13, color: T.inkMuted, marginBottom: 16 }}>
          {landlord?.email && landlord?.phone ? 'Sends via SMS and email' : landlord?.email ? 'Sends via email' : landlord?.phone ? 'Sends via SMS' : 'No contact info on file'}
        </div>

        {msgSent ? (
          <div style={{ background: T.greenLight, border: `1px solid ${T.green}33`, borderRadius: T.radiusSm, padding: '14px 18px', fontSize: 14, fontWeight: 600, color: T.greenDark }}>
            ✓ Message sent!
          </div>
        ) : (
          <>
            <textarea
              value={msgText}
              onChange={e => setMsgText(e.target.value)}
              placeholder="Type your message here…"
              rows={4}
              style={{
                width: '100%', background: T.bg, border: `1px solid ${T.border}`, borderRadius: T.radiusSm,
                padding: '10px 12px', fontSize: 13, outline: 'none', resize: 'vertical' as const,
                fontFamily: 'inherit', color: T.ink, boxSizing: 'border-box' as const, marginBottom: 12,
              }}
            />
            <button
              onClick={sendMessage}
              disabled={!msgText.trim() || msgSending || (!landlord?.phone && !landlord?.email)}
              style={{ ...btn.primary, opacity: (!msgText.trim() || msgSending || (!landlord?.phone && !landlord?.email)) ? 0.6 : 1 }}>
              {msgSending ? 'Sending…' : '📤 Send Message'}
            </button>
            {!landlord?.phone && !landlord?.email && (
              <div style={{ marginTop: 8, fontSize: 12, color: T.inkMuted }}>
                Your landlord hasn't set up contact info yet.
              </div>
            )}
          </>
        )}
      </div>

      {/* Sign out */}
      <div style={{ textAlign: 'center', paddingTop: 8 }}>
        <button onClick={() => supabase.auth.signOut()}
          style={{ background: 'none', border: 'none', color: T.inkMuted, fontSize: 13, cursor: 'pointer', textDecoration: 'underline' }}>
          Sign out
        </button>
      </div>
    </div>
  );
}

function ordinal(n: number): string {
  if (n === 1) return 'st';
  if (n === 2) return 'nd';
  if (n === 3) return 'rd';
  return 'th';
}
