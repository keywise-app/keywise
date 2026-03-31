'use client';
import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { T, btn } from '../lib/theme';

export default function TenantDashboard({ previewLeaseId }: { previewLeaseId?: string } = {}) {
  const [lease, setLease] = useState<any>(null);
  const [payments, setPayments] = useState<any[]>([]);
  const [landlord, setLandlord] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [msgText, setMsgText] = useState('');
  const [msgSending, setMsgSending] = useState(false);
  const [msgSent, setMsgSent] = useState(false);
  const [payNowLoading, setPayNowLoading] = useState<Record<string, boolean>>({});

  useEffect(() => { fetchData(); }, []);

  const fetchData = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { setLoading(false); return; }

    let leaseData: any = null;

    if (previewLeaseId) {
      // Preview mode — fetch lease directly by ID for the landlord
      const { data } = await supabase.from('leases').select('*').eq('id', previewLeaseId).single();
      leaseData = data;
    } else {
      // Tenant flow — try by user ID first, fall back to email match
      const { data: byUserId } = await supabase
        .from('leases')
        .select('*')
        .eq('tenant_user_id', user.id)
        .single();

      if (byUserId) {
        leaseData = byUserId;
      } else {
        const { data: byEmail } = await supabase
          .from('leases')
          .select('*')
          .eq('email', user.email)
          .single();
        if (byEmail) {
          leaseData = byEmail;
          // Opportunistically link the user ID now that we found the lease
          await supabase
            .from('leases')
            .update({ tenant_user_id: user.id })
            .eq('id', byEmail.id);
        }
      }
    }

    if (!leaseData) { setLoading(false); return; }
    setLease(leaseData);

    const [payRes, landlordRes] = await Promise.all([
      supabase
        .from('payments')
        .select('*')
        .eq('lease_id', leaseData.id)
        .order('due_date', { ascending: false }),
      supabase
        .from('profiles')
        .select('full_name, email, phone, company')
        .eq('id', leaseData.user_id)
        .single(),
    ]);

    if (payRes.data) setPayments(payRes.data);
    if (landlordRes.data) setLandlord(landlordRes.data);
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

  const sendMessage = async () => {
    if (!msgText.trim() || !landlord?.phone) return;
    setMsgSending(true);
    try {
      const res = await fetch('/api/send-sms', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ to: landlord.phone, message: msgText }),
      });
      const data = await res.json();
      if (data.error) {
        alert('Failed to send: ' + data.error);
      } else {
        setMsgSent(true);
        setMsgText('');
        setTimeout(() => setMsgSent(false), 4000);
      }
    } catch (err: any) {
      alert('Error: ' + (err.message || 'Could not send message.'));
    }
    setMsgSending(false);
  };

  const outstanding = payments.filter(p => p.status !== 'paid');
  const history = payments.filter(p => p.status === 'paid');

  const statusStyle = (status: string) => {
    if (status === 'paid') return { background: T.greenLight, color: T.greenDark };
    if (status === 'overdue') return { background: T.coralLight, color: T.coral };
    return { background: T.amberLight, color: T.amberDark };
  };

  if (loading) return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '60vh', color: T.inkMuted, fontSize: 14 }}>
      Loading your dashboard…
    </div>
  );

  if (!lease) return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '60vh' }}>
      <div style={{ textAlign: 'center', maxWidth: 420 }}>
        <div style={{ fontSize: 36, marginBottom: 16 }}>🏠</div>
        <div style={{ fontWeight: 700, fontSize: 18, color: T.navy, marginBottom: 8 }}>Lease not found</div>
        <div style={{ fontSize: 14, color: T.inkMuted, lineHeight: 1.6 }}>
          We couldn't find your lease. Please contact your landlord to confirm your email address matches your lease record.
        </div>
      </div>
    </div>
  );

  const propertyShort = lease.property?.split(',')[0] || lease.property;

  return (
    <div style={{ maxWidth: 680, margin: '0 auto' }}>
      <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap" rel="stylesheet" />
      <style>{`* { box-sizing: border-box; } body { margin: 0; } button, input, select, textarea { font-family: inherit; }`}</style>

      {/* Preview banner */}
      {previewLeaseId && (
        <div style={{ background: T.amberLight, border: `1px solid ${T.amber}44`, borderRadius: T.radiusSm, padding: '10px 16px', marginBottom: 20, fontSize: 13, color: T.amberDark, fontWeight: 600 }}>
          👁 Preview mode — this is what {lease.tenant_name} will see
        </div>
      )}

      {/* Header */}
      <div style={{ marginBottom: 28 }}>
        <div style={{ fontSize: 26, fontWeight: 700, color: T.navy, letterSpacing: '-0.5px' }}>
          Welcome back, {lease.tenant_name?.split(' ')[0] || 'there'} 👋
        </div>
        <div style={{ display: 'inline-flex', alignItems: 'center', gap: 6, background: T.tealLight, border: `1px solid ${T.teal}44`, borderRadius: 20, padding: '4px 12px', marginTop: 8 }}>
          <span style={{ fontSize: 13 }}>🏠</span>
          <span style={{ fontSize: 13, color: T.tealDark, fontWeight: 600 }}>{propertyShort}</span>
        </div>
      </div>

      {/* Outstanding Payments */}
      <div style={{ background: '#fff', border: `1px solid ${T.border}`, borderRadius: T.radius, padding: 24, marginBottom: 20, boxShadow: T.shadow }}>
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
                    {(p as any).description ? ` · ${(p as any).description}` : ''}
                  </div>
                </div>
                <button
                  onClick={() => openPayNow(p)}
                  disabled={payNowLoading[p.id]}
                  style={{
                    background: payNowLoading[p.id] ? '#e0e4ff' : '#635BFF',
                    color: '#fff', border: 'none', borderRadius: T.radiusSm,
                    padding: '10px 20px', fontSize: 13, fontWeight: 600,
                    cursor: payNowLoading[p.id] ? 'default' : 'pointer',
                    opacity: payNowLoading[p.id] ? 0.7 : 1,
                    flexShrink: 0,
                  }}>
                  {payNowLoading[p.id] ? 'Loading…' : '⚡ Pay Now'}
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Payment History */}
      {history.length > 0 && (
        <div style={{ background: '#fff', border: `1px solid ${T.border}`, borderRadius: T.radius, padding: 24, marginBottom: 20, boxShadow: T.shadow }}>
          <div style={{ fontWeight: 700, fontSize: 16, color: T.navy, marginBottom: 16 }}>Payment History</div>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr>
                {['Amount', 'Due Date', 'Paid On', 'Status'].map(h => (
                  <th key={h} style={{ textAlign: 'left', fontSize: 11, color: T.inkMuted, fontWeight: 700, padding: '6px 12px', textTransform: 'uppercase', letterSpacing: '0.5px', borderBottom: `2px solid ${T.border}` }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {history.map(p => (
                <tr key={p.id}>
                  <td style={{ padding: '11px 12px', fontSize: 14, fontWeight: 700, color: T.navy, borderBottom: `1px solid ${T.border}` }}>${(p.amount || 0).toLocaleString()}</td>
                  <td style={{ padding: '11px 12px', fontSize: 13, color: T.inkMid, borderBottom: `1px solid ${T.border}` }}>{p.due_date}</td>
                  <td style={{ padding: '11px 12px', fontSize: 13, color: T.inkMuted, borderBottom: `1px solid ${T.border}` }}>{p.paid_date || '—'}</td>
                  <td style={{ padding: '11px 12px', borderBottom: `1px solid ${T.border}` }}>
                    <span style={{ ...statusStyle(p.status), padding: '3px 10px', borderRadius: 20, fontSize: 11, fontWeight: 700, textTransform: 'uppercase' as const }}>
                      {p.status}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Lease Details */}
      <div style={{ background: '#fff', border: `1px solid ${T.border}`, borderRadius: T.radius, padding: 24, marginBottom: 20, boxShadow: T.shadow }}>
        <div style={{ fontWeight: 700, fontSize: 16, color: T.navy, marginBottom: 16 }}>Lease Details</div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
          {[
            { label: 'Monthly Rent', value: '$' + (lease.rent || 0).toLocaleString() + '/mo' },
            { label: 'Lease Start', value: lease.start_date || '—' },
            { label: 'Lease End', value: lease.end_date || 'Month-to-month' },
            { label: 'Payment Due', value: lease.payment_day ? `${lease.payment_day}${ordinal(lease.payment_day)} of the month` : '—' },
          ].map(item => (
            <div key={item.label} style={{ background: T.bg, borderRadius: T.radiusSm, padding: '12px 16px' }}>
              <div style={{ fontSize: 11, color: T.inkMuted, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.4px', marginBottom: 4 }}>{item.label}</div>
              <div style={{ fontSize: 15, fontWeight: 700, color: T.navy }}>{item.value}</div>
            </div>
          ))}
        </div>

        {landlord && (
          <div style={{ marginTop: 16, paddingTop: 16, borderTop: `1px solid ${T.border}` }}>
            <div style={{ fontSize: 12, color: T.inkMuted, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.4px', marginBottom: 8 }}>Your Landlord</div>
            <div style={{ fontSize: 14, fontWeight: 600, color: T.ink, marginBottom: 4 }}>{landlord.full_name || landlord.company || '—'}</div>
            <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap' }}>
              {landlord.email && <span style={{ fontSize: 13, color: T.inkMid }}>📧 {landlord.email}</span>}
              {landlord.phone && <span style={{ fontSize: 13, color: T.inkMid }}>📞 {landlord.phone}</span>}
            </div>
          </div>
        )}
      </div>

      {/* Message Landlord */}
      <div style={{ background: '#fff', border: `1px solid ${T.border}`, borderRadius: T.radius, padding: 24, marginBottom: 20, boxShadow: T.shadow }}>
        <div style={{ fontWeight: 700, fontSize: 16, color: T.navy, marginBottom: 4 }}>Message Your Landlord</div>
        <div style={{ fontSize: 13, color: T.inkMuted, marginBottom: 16 }}>Send a quick message via SMS</div>

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
              disabled={!msgText.trim() || msgSending || !landlord?.phone}
              style={{ ...btn.primary, opacity: (!msgText.trim() || msgSending || !landlord?.phone) ? 0.6 : 1 }}>
              {msgSending ? 'Sending…' : '📤 Send Message'}
            </button>
            {!landlord?.phone && (
              <div style={{ marginTop: 8, fontSize: 12, color: T.inkMuted }}>
                Your landlord hasn't set up a phone number yet. Try emailing them directly.
              </div>
            )}
          </>
        )}
      </div>

      {/* Sign out */}
      <div style={{ textAlign: 'center', paddingBottom: 40 }}>
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
