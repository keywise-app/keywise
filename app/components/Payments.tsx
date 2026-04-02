'use client';
import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { T, input, label, btn } from '../lib/theme';
import { getLimits } from '../lib/planLimits';

type Payment = {
  id: string;
  tenant_name: string;
  property: string;
  amount: number;
  due_date: string;
  paid_date: string | null;
  status: string;
  method: string | null;
  lease_id: string;
};

type Lease = {
  id: string;
  tenant_name: string;
  property: string;
  rent: number;
  start_date: string;
  end_date: string;
  payment_day: number;
  payment_frequency: string;
  late_fee_percent: number;
  late_fee_days: number;
  late_fee_type: string;
  lease_terms_raw: string;
};

export default function Payments() {
  const [payments, setPayments] = useState<Payment[]>([]);
  const [leases, setLeases] = useState<Lease[]>([]);
  const [loading, setLoading] = useState(true);
  const [showRecord, setShowRecord] = useState(false);
  const [showAdd, setShowAdd] = useState(false);
  const [showSchedule, setShowSchedule] = useState(false);
  const [selectedPayment, setSelectedPayment] = useState<Payment | null>(null);
  const [selectedLease, setSelectedLease] = useState<Lease | null>(null);
  const [method, setMethod] = useState('Zelle');
  const [paidDate, setPaidDate] = useState(new Date().toISOString().split('T')[0]);
  const [filter, setFilter] = useState('all');
  const [aiReminder, setAiReminder] = useState('');
  const [loadingReminder, setLoadingReminder] = useState(false);
  const [saving, setSaving] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [schedulePreview, setSchedulePreview] = useState<{ date: string; amount: number }[]>([]);
  const [landlordUserId, setLandlordUserId] = useState('');
  const [landlordStripeConnected, setLandlordStripeConnected] = useState(false);
  const [onlinePayments, setOnlinePayments] = useState(true);
  const [payNowLoading, setPayNowLoading] = useState<Record<string, boolean>>({});
  const [showRequest, setShowRequest] = useState(false);
  const [requestForm, setRequestForm] = useState({ lease_id: '', tenant_name: '', property: '', amount: '', description: '', due_date: '' });
  const [requestLoading, setRequestLoading] = useState(false);
  const [receiptSent, setReceiptSent] = useState<string | null>(null);

  const emptyForm = {
    lease_id: '', tenant_name: '', property: '',
    amount: '', due_date: '', status: 'pending',
  };
  const [form, setForm] = useState<any>(emptyForm);

  useEffect(() => {
    fetchAll();
    checkOverdue();
    supabase.auth.getUser().then(async ({ data: { user } }) => {
      if (!user) return;
      setLandlordUserId(user.id);
      const { data: profile } = await supabase
        .from('profiles')
        .select('stripe_account_id')
        .eq('id', user.id)
        .single();
      setLandlordStripeConnected(!!profile?.stripe_account_id);
    });
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (!user) return;
      supabase.from('profiles').select('subscription_status').eq('id', user.id).single()
        .then(({ data }) => { setOnlinePayments(getLimits(data?.subscription_status ?? 'free').onlinePayments); });
    });
  }, []);

  const fetchAll = async () => {
    setLoading(true);
    const [payRes, leaseRes] = await Promise.all([
      supabase.from('payments').select('*').order('due_date', { ascending: false }),
      supabase.from('leases').select('*').order('tenant_name'),
    ]);
    if (payRes.data) setPayments(payRes.data);
    if (leaseRes.data) setLeases(leaseRes.data);
    setLoading(false);
  };

  const checkOverdue = async () => {
    await fetch('/api/check-overdue', { method: 'POST' });
  };

  const generatePaymentDates = (lease: Lease): { date: string; amount: number }[] => {
    if (!lease.start_date || !lease.end_date || !lease.rent) return [];
    const dates: { date: string; amount: number }[] = [];
    const start = new Date(lease.start_date);
    const end = new Date(lease.end_date);
    const payDay = lease.payment_day || 1;

    if (!lease.payment_frequency || lease.payment_frequency === 'monthly') {
      let current = new Date(start.getFullYear(), start.getMonth(), payDay);
      if (current < start) current = new Date(start.getFullYear(), start.getMonth() + 1, payDay);
      while (current <= end) {
        dates.push({ date: current.toISOString().split('T')[0], amount: lease.rent });
        current = new Date(current.getFullYear(), current.getMonth() + 1, payDay);
      }
    } else if (lease.payment_frequency === 'bi-weekly') {
      let current = new Date(start);
      while (current <= end) {
        dates.push({ date: current.toISOString().split('T')[0], amount: Math.round(lease.rent / 2) });
        current = new Date(current.getTime() + 14 * 86400000);
      }
    } else if (lease.payment_frequency === 'weekly') {
      let current = new Date(start);
      while (current <= end) {
        dates.push({ date: current.toISOString().split('T')[0], amount: Math.round(lease.rent / 4) });
        current = new Date(current.getTime() + 7 * 86400000);
      }
    }
    return dates;
  };

  const openScheduleWizard = (lease: Lease) => {
    setSelectedLease({ ...lease });
    setSchedulePreview(generatePaymentDates(lease));
    setShowSchedule(true);
  };

  const generateSchedule = async () => {
    if (!selectedLease) return;
    setGenerating(true);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { setGenerating(false); return; }

    const dates = generatePaymentDates(selectedLease);
    let created = 0;
    let skipped = 0;
    const today = new Date().toISOString().split('T')[0];

    for (const { date, amount } of dates) {
      const { data: existing } = await supabase
        .from('payments').select('id')
        .eq('lease_id', selectedLease.id).eq('due_date', date).single();
      if (!existing) {
        await supabase.from('payments').insert({
          user_id: user.id,
          lease_id: selectedLease.id,
          tenant_name: selectedLease.tenant_name,
          property: selectedLease.property,
          amount: Math.round(amount),
          due_date: date,
          status: date < today ? 'overdue' : 'pending',
        });
        created++;
      } else { skipped++; }
    }

    // Save schedule settings back to lease
    await supabase.from('leases').update({
      payment_day: selectedLease.payment_day || 1,
      payment_frequency: selectedLease.payment_frequency || 'monthly',
      late_fee_percent: selectedLease.late_fee_percent || 5,
      late_fee_days: selectedLease.late_fee_days || 3,
      late_fee_type: selectedLease.late_fee_type || 'percent',
    }).eq('id', selectedLease.id);

    await fetchAll();
    setShowSchedule(false);
    setSelectedLease(null);
    alert('✓ Created ' + created + ' payment' + (created !== 1 ? 's' : '') + (skipped > 0 ? ', skipped ' + skipped + ' existing' : '') + ' for ' + selectedLease.tenant_name);
    setGenerating(false);
  };

  const addPayment = async () => {
    setSaving(true);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { setSaving(false); return; }
    const lease = leases.find(l => l.id === form.lease_id);
    const { error } = await supabase.from('payments').insert({
      user_id: user.id,
      lease_id: form.lease_id || null,
      tenant_name: lease?.tenant_name || form.tenant_name,
      property: lease?.property || form.property,
      amount: +form.amount,
      due_date: form.due_date,
      status: form.status,
      paid_date: form.status === 'paid' ? form.due_date : null,
    });
    if (error) { alert('Error: ' + error.message); }
    else { await fetchAll(); setShowAdd(false); setForm(emptyForm); }
    setSaving(false);
  };

  const confirmPayment = async () => {
    if (!selectedPayment) return;
    const { error } = await supabase.from('payments').update({
      status: 'paid', paid_date: paidDate, method,
    }).eq('id', selectedPayment.id);
    if (!error) {
      setPayments(payments.map(p => p.id === selectedPayment.id
        ? { ...p, status: 'paid', paid_date: paidDate, method } : p));

      // Send receipt email if tenant has email on file
      const lease = leases.find(l => l.id === selectedPayment.lease_id) as any;
      if (lease?.email) {
        const { data: { user } } = await supabase.auth.getUser();
        const { data: profile } = await supabase.from('profiles').select('full_name, email').eq('id', user!.id).single();
        fetch('/api/send-receipt', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            payment_id: selectedPayment.id,
            tenant_name: selectedPayment.tenant_name,
            tenant_email: lease.email,
            property: selectedPayment.property,
            amount: selectedPayment.amount,
            paid_date: paidDate,
            method,
            landlord_name: profile?.full_name || '',
            landlord_email: profile?.email || '',
          }),
        }).then(r => r.ok && (setReceiptSent(lease.email), setTimeout(() => setReceiptSent(null), 5000)));
      }
    }
    setShowRecord(false);
    setSelectedPayment(null);
  };

  const draftReminder = async (payment: Payment) => {
    setLoadingReminder(true);
    setAiReminder('');
    // Find the lease to get contract terms
    const lease = leases.find(l => l.id === payment.lease_id);
    const lateFeeLine = lease?.late_fee_percent
      ? 'Per your lease, a ' + (lease.late_fee_type === 'fixed' ? '$' + lease.late_fee_percent : lease.late_fee_percent + '%') + ' late fee applies after ' + (lease.late_fee_days || 3) + ' days.'
      : 'A late fee may apply per your lease.';

    const res = await fetch('/api/claude', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        prompt: 'Draft a short, professional but friendly rent reminder text message to ' + payment.tenant_name + ' at ' + payment.property + '. Rent of $' + payment.amount + ' was due on ' + payment.due_date + ' and has not been paid. ' + lateFeeLine + ' Ask them to pay within 3 days. Keep it under 100 words and conversational.',
      }),
    });
    const data = await res.json();
    setAiReminder(data.result);
    setLoadingReminder(false);
  };

  const submitRequest = async () => {
    if (!requestForm.lease_id || !requestForm.amount || !requestForm.due_date) {
      alert('Please fill in tenant, amount, and due date.');
      return;
    }
    setRequestLoading(true);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { setRequestLoading(false); return; }
    const lease = leases.find(l => l.id === requestForm.lease_id);
    const { error } = await supabase.from('payments').insert({
      user_id: user.id,
      lease_id: requestForm.lease_id,
      tenant_name: lease?.tenant_name || requestForm.tenant_name,
      property: lease?.property || requestForm.property,
      amount: +requestForm.amount,
      due_date: requestForm.due_date,
      status: 'pending',
    });
    if (error) {
      alert('Error: ' + error.message);
    } else {
      await fetchAll();
      setShowRequest(false);
      setRequestForm({ lease_id: '', tenant_name: '', property: '', amount: '', description: '', due_date: '' });
    }
    setRequestLoading(false);
  };

  const openPayNow = async (p: Payment) => {
    setPayNowLoading(prev => ({ ...prev, [p.id]: true }));
    try {
      const res = await fetch('/api/stripe/payment-link', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          lease_id: p.lease_id,
          tenant_name: p.tenant_name,
          property: p.property,
          amount: p.amount,
          due_date: p.due_date,
          landlord_user_id: landlordUserId,
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

  const filtered = filter === 'all' ? payments : payments.filter(p => p.status === filter);
  const now = new Date();
  const thisMonth = payments.filter(p => {
    const d = new Date(p.due_date);
    return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
  });
  const totalExpected = thisMonth.reduce((s, p) => s + (p.amount || 0), 0);
  const totalCollected = thisMonth.filter(p => p.status === 'paid').reduce((s, p) => s + (p.amount || 0), 0);
  const overdue = payments.filter(p => p.status === 'overdue');
  const leasesWithoutSchedules = leases.filter(l => !payments.some(p => p.lease_id === l.id));

  const statusStyle = (status: string) => {
    if (status === 'paid') return { background: T.greenLight, color: T.greenDark };
    if (status === 'overdue') return { background: T.coralLight, color: T.coral };
    return { background: T.amberLight, color: T.amberDark };
  };

  const ordinal = (n: number) => n === 1 ? '1st' : n === 2 ? '2nd' : n === 3 ? '3rd' : n + 'th';

  return (
    <div>
      {/* Receipt sent toast */}
      {receiptSent && (
        <div style={{ position: 'fixed', bottom: 32, left: '50%', transform: 'translateX(-50%)', background: '#1A1A2E', color: '#fff', padding: '12px 20px', borderRadius: 10, fontSize: 14, fontWeight: 600, zIndex: 9999, display: 'flex', alignItems: 'center', gap: 8, boxShadow: '0 4px 20px rgba(0,0,0,0.3)' }}>
          <span style={{ color: T.teal }}>✓</span> Receipt sent to {receiptSent}
        </div>
      )}
      {/* Stats */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 16, marginBottom: 24 }}>
        {[
          { label: 'Expected This Month', value: '$' + totalExpected.toLocaleString(), color: T.navy },
          { label: 'Collected', value: '$' + totalCollected.toLocaleString(), color: T.greenDark },
          { label: 'Outstanding', value: '$' + (totalExpected - totalCollected).toLocaleString(), color: T.coral },
        ].map(stat => (
          <div key={stat.label} style={{ background: T.surface, border: `1px solid ${T.border}`, borderRadius: T.radius, padding: 20, boxShadow: T.shadow }}>
            <div style={{ fontSize: 28, fontWeight: 700, color: stat.color }}>{stat.value}</div>
            <div style={{ fontSize: 11, color: T.inkMuted, textTransform: 'uppercase', letterSpacing: '0.5px', marginTop: 4 }}>{stat.label}</div>
          </div>
        ))}
      </div>

      {/* Set up schedules prompt */}
      {leasesWithoutSchedules.length > 0 && (
        <div style={{ background: T.tealLight, border: `1px solid ${T.teal}33`, borderRadius: T.radiusSm, padding: '14px 18px', marginBottom: 20 }}>
          <div style={{ fontWeight: 700, fontSize: 13, color: T.tealDark, marginBottom: 8 }}>✦ Set Up Recurring Payments</div>
          <div style={{ fontSize: 13, color: T.inkMid, marginBottom: 12 }}>
            These leases don't have payment schedules yet. Terms will be pre-filled from your lease contracts.
          </div>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            {leasesWithoutSchedules.map(lease => (
              <button key={lease.id} onClick={() => openScheduleWizard(lease)}
                style={{ background: T.teal, color: 'white', border: 'none', borderRadius: T.radiusSm, padding: '7px 14px', fontSize: 12, fontWeight: 600, cursor: 'pointer' }}>
                {lease.tenant_name} →
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Overdue alert */}
      {overdue.length > 0 && (
        <div style={{ background: T.coralLight, border: `1px solid ${T.coral}33`, borderRadius: T.radiusSm, padding: '14px 18px', marginBottom: 20, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
            <span style={{ fontSize: 18 }}>⚠️</span>
            <div>
              <div style={{ fontWeight: 700, fontSize: 13, color: T.coral }}>Overdue Payments</div>
              <div style={{ fontSize: 13, color: T.inkMid, marginTop: 2 }}>
                {overdue.map(p => p.tenant_name + ' — $' + p.amount?.toLocaleString()).join(' · ')}
              </div>
            </div>
          </div>
          <button onClick={() => draftReminder(overdue[0])} disabled={loadingReminder}
            style={{ ...btn.danger, whiteSpace: 'nowrap' as const }}>
            {loadingReminder ? 'Drafting…' : '✦ Draft Reminder'}
          </button>
        </div>
      )}

      {/* AI Reminder */}
      {aiReminder && (
        <div style={{ background: T.surface, border: `1px solid ${T.border}`, borderRadius: T.radius, padding: 20, marginBottom: 20, boxShadow: T.shadow }}>
          <div style={{ fontWeight: 700, fontSize: 13, color: T.navy, marginBottom: 10 }}>✦ AI Reminder Draft</div>
          <div style={{ background: T.tealLight, border: `1px solid ${T.teal}33`, borderRadius: T.radiusSm, padding: 14, fontSize: 13, lineHeight: 1.75, whiteSpace: 'pre-wrap' }}>{aiReminder}</div>
          <div style={{ display: 'flex', gap: 8, marginTop: 10 }}>
            <button onClick={() => navigator.clipboard.writeText(aiReminder)} style={{ ...btn.ghost, fontSize: 12, padding: '6px 14px' }}>📋 Copy</button>
            <button onClick={() => setAiReminder('')} style={{ ...btn.danger, fontSize: 12, padding: '6px 14px' }}>Dismiss</button>
          </div>
        </div>
      )}

      {/* Toolbar */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16, flexWrap: 'wrap', gap: 10 }}>
        <div style={{ display: 'flex', gap: 8 }}>
          {['all', 'paid', 'pending', 'overdue'].map(f => (
            <button key={f} onClick={() => setFilter(f)}
              style={{
                padding: '6px 14px', borderRadius: T.radiusSm, fontSize: 12, fontWeight: 600, cursor: 'pointer', textTransform: 'capitalize',
                background: filter === f ? T.navy : T.surface,
                color: filter === f ? 'white' : T.inkMid,
                border: `1px solid ${filter === f ? T.navy : T.border}`,
              }}>
              {f} ({f === 'all' ? payments.length : payments.filter(p => p.status === f).length})
            </button>
          ))}
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          {leases.length > 0 && (
            <button onClick={() => openScheduleWizard(leases[0])}
              style={{ ...btn.teal, fontSize: 12, padding: '7px 14px' }}>
              ✦ Set Up Recurring
            </button>
          )}
          <button onClick={() => setShowRequest(true)} style={{ ...btn.ghost, fontSize: 12, padding: '7px 14px' }}>
            📤 Request Payment
          </button>
          <button onClick={() => setShowAdd(true)} style={{ ...btn.primary, fontSize: 12, padding: '7px 14px' }}>
            + Add Payment
          </button>
        </div>
      </div>

      {/* Empty state */}
      {!loading && payments.length === 0 && (
        <div style={{ background: T.surface, border: `1px solid ${T.border}`, borderRadius: T.radius, padding: 40, textAlign: 'center', boxShadow: T.shadow }}>
          <div style={{ fontSize: 32, marginBottom: 12 }}>💳</div>
          <div style={{ fontWeight: 700, fontSize: 15, color: T.navy, marginBottom: 6 }}>No payments yet</div>
          <div style={{ color: T.inkMuted, fontSize: 13, marginBottom: 20 }}>
            Set up recurring payment schedules aligned with your lease terms.
          </div>
          {leases.length > 0 && (
            <div style={{ display: 'flex', gap: 10, justifyContent: 'center', flexWrap: 'wrap' }}>
              {leases.map(lease => (
                <button key={lease.id} onClick={() => openScheduleWizard(lease)} style={{ ...btn.primary }}>
                  ✦ Set up {lease.tenant_name}
                </button>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Table */}
      {payments.length > 0 && (
        <div style={{ background: T.surface, border: `1px solid ${T.border}`, borderRadius: T.radius, padding: 20, boxShadow: T.shadow }}>
          {loading
            ? <div style={{ textAlign: 'center', padding: 40, color: T.inkMuted }}>Loading payments…</div>
            : (
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                  <tr>
                    {['Tenant', 'Property', 'Amount', 'Due Date', 'Paid Date', 'Method', 'Status', ''].map(h => (
                      <th key={h} style={{ textAlign: 'left', fontSize: 11, color: T.inkMuted, fontWeight: 700, padding: '8px 12px', textTransform: 'uppercase', letterSpacing: '0.5px', borderBottom: `2px solid ${T.border}` }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {filtered.map(p => (
                    <tr key={p.id}>
                      <td style={{ padding: '12px', fontSize: 13, borderBottom: `1px solid ${T.border}`, fontWeight: 600, color: T.ink }}>{p.tenant_name}</td>
                      <td style={{ padding: '12px', fontSize: 13, borderBottom: `1px solid ${T.border}`, color: T.inkMid }}>{p.property?.split(',')[0]}</td>
                      <td style={{ padding: '12px', fontSize: 13, borderBottom: `1px solid ${T.border}`, fontWeight: 700, color: T.navy }}>${(p.amount || 0).toLocaleString()}</td>
                      <td style={{ padding: '12px', fontSize: 13, borderBottom: `1px solid ${T.border}`, color: T.inkMid }}>{p.due_date}</td>
                      <td style={{ padding: '12px', fontSize: 13, borderBottom: `1px solid ${T.border}`, color: T.inkMuted }}>{p.paid_date || '—'}</td>
                      <td style={{ padding: '12px', fontSize: 13, borderBottom: `1px solid ${T.border}`, color: T.inkMuted }}>{p.method || '—'}</td>
                      <td style={{ padding: '12px', borderBottom: `1px solid ${T.border}` }}>
                        <span style={{ ...statusStyle(p.status), padding: '3px 10px', borderRadius: 20, fontSize: 11, fontWeight: 700, textTransform: 'uppercase' as const }}>
                          {p.status}
                        </span>
                      </td>
                      <td style={{ padding: '12px', borderBottom: `1px solid ${T.border}` }}>
                        <div>
                          <div style={{ display: 'flex', gap: 6, marginBottom: p.status !== 'paid' ? 4 : 0 }}>
                            {p.status !== 'paid' && (
                              <button onClick={() => { setSelectedPayment(p); setShowRecord(true); }}
                                style={{ background: T.greenLight, color: T.greenDark, border: 'none', borderRadius: 8, padding: '5px 10px', fontSize: 11, fontWeight: 600, cursor: 'pointer' }}>
                                Mark Paid
                              </button>
                            )}
                            {p.status !== 'paid' && (
                              !onlinePayments ? (
                                <span
                                  onClick={() => window.dispatchEvent(new CustomEvent('kw:navigate', { detail: 'settings' }))}
                                  style={{ fontSize: 10, color: T.teal, fontWeight: 600, cursor: 'pointer', alignSelf: 'center' }}>
                                  Upgrade to collect online
                                </span>
                              ) : landlordStripeConnected ? (
                                <button
                                  onClick={() => openPayNow(p)}
                                  disabled={payNowLoading[p.id]}
                                  style={{ background: '#EEF0FF', color: '#635BFF', border: '1px solid #635BFF33', borderRadius: 8, padding: '5px 10px', fontSize: 11, fontWeight: 600, cursor: payNowLoading[p.id] ? 'default' : 'pointer', opacity: payNowLoading[p.id] ? 0.6 : 1 }}>
                                  {payNowLoading[p.id] ? '…' : `⚡ Pay $${(p.amount || 0).toLocaleString()}`}
                                </button>
                              ) : (
                                <span style={{ fontSize: 10, color: T.inkMuted, fontStyle: 'italic', alignSelf: 'center' }}>
                                  Connect Stripe to enable
                                </span>
                              )
                            )}
                            {p.status !== 'paid' && (
                              <button onClick={() => draftReminder(p)}
                                style={{ background: T.tealLight, color: T.tealDark, border: 'none', borderRadius: 8, padding: '5px 10px', fontSize: 11, fontWeight: 600, cursor: 'pointer' }}>
                                ✦ Remind
                              </button>
                            )}
                          </div>
                          {p.status !== 'paid' && landlordStripeConnected && (
                            <div style={{ fontSize: 10, color: T.inkMuted }}>
                              Tenant pays ${(p.amount || 0).toLocaleString()} · Keywise fee $2.00 absorbed
                            </div>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )
          }
        </div>
      )}

      {/* Schedule Wizard Modal */}
      {showSchedule && selectedLease && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100 }}
          onClick={() => { setShowSchedule(false); setSelectedLease(null); }}>
          <div style={{ background: T.surface, borderRadius: T.radiusLg, padding: 32, width: 580, maxHeight: '90vh', overflowY: 'auto', boxShadow: T.shadowMd }}
            onClick={e => e.stopPropagation()}>
            <div style={{ fontWeight: 700, fontSize: 18, color: T.navy, marginBottom: 4 }}>✦ Payment Schedule</div>
            <div style={{ fontSize: 13, color: T.inkMuted, marginBottom: 24 }}>{selectedLease.tenant_name} · {selectedLease.property}</div>

            {/* Lease info */}
            <div style={{ background: T.bg, borderRadius: T.radiusSm, padding: 16, marginBottom: 20, display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 16 }}>
              {[
                { label: 'Monthly Rent', value: '$' + (selectedLease.rent || 0).toLocaleString() + '/mo' },
                { label: 'Lease Start', value: selectedLease.start_date || '—' },
                { label: 'Lease End', value: selectedLease.end_date || '—' },
              ].map(item => (
                <div key={item.label}>
                  <div style={{ fontSize: 11, color: T.inkMuted, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.4px' }}>{item.label}</div>
                  <div style={{ fontSize: 14, fontWeight: 700, color: T.navy, marginTop: 3 }}>{item.value}</div>
                </div>
              ))}
            </div>

            {/* Contract terms banner */}
            {(selectedLease.late_fee_percent > 0 || selectedLease.lease_terms_raw) && (
              <div style={{ background: T.tealLight, border: `1px solid ${T.teal}33`, borderRadius: T.radiusSm, padding: 14, marginBottom: 20 }}>
                <div style={{ fontSize: 12, fontWeight: 700, color: T.tealDark, textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: 8 }}>
                  ✦ From Your Lease Contract
                </div>
                {selectedLease.lease_terms_raw && (
                  <div style={{ fontSize: 12, color: T.inkMid, fontStyle: 'italic', marginBottom: 10, lineHeight: 1.6, background: T.surface, borderRadius: T.radiusSm, padding: '8px 12px' }}>
                    "{selectedLease.lease_terms_raw}"
                  </div>
                )}
                <div style={{ display: 'flex', gap: 24, fontSize: 13 }}>
                  {selectedLease.late_fee_percent > 0 && (
                    <div>
                      <span style={{ color: T.inkMuted, fontSize: 11, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.4px' }}>Late Fee </span>
                      <span style={{ fontWeight: 700, color: T.navy }}>
                        {selectedLease.late_fee_type === 'fixed' ? '$' + selectedLease.late_fee_percent : selectedLease.late_fee_percent + '%'}
                      </span>
                    </div>
                  )}
                  {selectedLease.late_fee_days > 0 && (
                    <div>
                      <span style={{ color: T.inkMuted, fontSize: 11, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.4px' }}>Grace Period </span>
                      <span style={{ fontWeight: 700, color: T.navy }}>{selectedLease.late_fee_days} days</span>
                    </div>
                  )}
                  {selectedLease.payment_day > 0 && (
                    <div>
                      <span style={{ color: T.inkMuted, fontSize: 11, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.4px' }}>Due </span>
                      <span style={{ fontWeight: 700, color: T.navy }}>{ordinal(selectedLease.payment_day)} of month</span>
                    </div>
                  )}
                </div>
                {!selectedLease.lease_terms_raw && (
                  <div style={{ fontSize: 11, color: T.inkMuted, marginTop: 8 }}>
                    Upload your lease PDF to auto-extract the exact contract language.
                  </div>
                )}
              </div>
            )}

            {/* Schedule settings */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 20 }}>
              <div>
                <label style={label}>Payment Frequency</label>
                <select style={input} value={selectedLease.payment_frequency || 'monthly'}
                  onChange={e => {
                    const updated = { ...selectedLease, payment_frequency: e.target.value };
                    setSelectedLease(updated);
                    setSchedulePreview(generatePaymentDates(updated));
                  }}>
                  <option value="monthly">Monthly</option>
                  <option value="bi-weekly">Bi-weekly</option>
                  <option value="weekly">Weekly</option>
                </select>
              </div>
              <div>
                <label style={label}>Payment Due Day</label>
                <select style={input} value={selectedLease.payment_day || 1}
                  onChange={e => {
                    const updated = { ...selectedLease, payment_day: +e.target.value };
                    setSelectedLease(updated);
                    setSchedulePreview(generatePaymentDates(updated));
                  }}>
                  {Array.from({ length: 28 }, (_, i) => i + 1).map(d => (
                    <option key={d} value={d}>{ordinal(d)} of the month</option>
                  ))}
                </select>
              </div>
              <div>
                <label style={label}>
                  Late Fee {selectedLease.lease_terms_raw ? '— from contract ✓' : ''}
                </label>
                <div style={{ display: 'flex', gap: 8 }}>
                  <select style={{ ...input, width: 80, flexShrink: 0 }} value={selectedLease.late_fee_type || 'percent'}
                    onChange={e => setSelectedLease({ ...selectedLease, late_fee_type: e.target.value })}>
                    <option value="percent">%</option>
                    <option value="fixed">$</option>
                  </select>
                  <input style={input} type="number" value={selectedLease.late_fee_percent || ''}
                    onChange={e => setSelectedLease({ ...selectedLease, late_fee_percent: +e.target.value })}
                    placeholder={selectedLease.late_fee_type === 'fixed' ? '50' : '5'} />
                </div>
                {selectedLease.lease_terms_raw && (
                  <div style={{ fontSize: 11, color: T.tealDark, marginTop: 4 }}>✓ Pre-filled from your lease</div>
                )}
              </div>
              <div>
                <label style={label}>
                  Grace Period (days) {selectedLease.lease_terms_raw ? '— from contract ✓' : ''}
                </label>
                <input style={input} type="number" value={selectedLease.late_fee_days || ''}
                  onChange={e => setSelectedLease({ ...selectedLease, late_fee_days: +e.target.value })}
                  placeholder="3" />
                {selectedLease.lease_terms_raw && (
                  <div style={{ fontSize: 11, color: T.tealDark, marginTop: 4 }}>✓ Pre-filled from your lease</div>
                )}
              </div>
            </div>

            {/* Preview */}
            <div style={{ marginBottom: 20 }}>
              <div style={{ fontSize: 12, fontWeight: 700, color: T.inkMuted, textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: 10 }}>
                Preview — {schedulePreview.length} payments · ${schedulePreview.reduce((s, p) => s + p.amount, 0).toLocaleString()} total
              </div>
              <div style={{ maxHeight: 220, overflowY: 'auto', border: `1px solid ${T.border}`, borderRadius: T.radiusSm }}>
                {schedulePreview.slice(0, 36).map((p, i) => {
                  const isPast = p.date < new Date().toISOString().split('T')[0];
                  const graceDays = selectedLease.late_fee_days || 3;
                  const lateDate = new Date(p.date);
                  lateDate.setDate(lateDate.getDate() + graceDays);
                  return (
                    <div key={i} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 14px', borderBottom: i < schedulePreview.length - 1 ? `1px solid ${T.border}` : 'none', fontSize: 13 }}>
                      <span style={{ color: isPast ? T.inkMuted : T.ink }}>{p.date}</span>
                      <span style={{ fontSize: 11, color: T.inkMuted }}>
                        Late fee after {lateDate.toISOString().split('T')[0]}
                      </span>
                      <span style={{ fontWeight: 600, color: isPast ? T.inkMuted : T.navy }}>${p.amount.toLocaleString()}</span>
                      {isPast && <span style={{ fontSize: 11, color: T.coral, fontWeight: 600 }}>PAST DUE</span>}
                    </div>
                  );
                })}
                {schedulePreview.length > 36 && (
                  <div style={{ padding: '8px 14px', fontSize: 12, color: T.inkMuted, textAlign: 'center' }}>
                    + {schedulePreview.length - 36} more payments…
                  </div>
                )}
              </div>
            </div>

            <div style={{ display: 'flex', gap: 10 }}>
              <button onClick={generateSchedule} disabled={generating || schedulePreview.length === 0}
                style={{ ...btn.primary, flex: 1, justifyContent: 'center' }}>
                {generating ? 'Generating…' : '✦ Generate ' + schedulePreview.length + ' Payments'}
              </button>
              <button onClick={() => { setShowSchedule(false); setSelectedLease(null); }} style={{ ...btn.ghost }}>
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Mark Paid Modal */}
      {showRecord && selectedPayment && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100 }}
          onClick={() => setShowRecord(false)}>
          <div style={{ background: T.surface, borderRadius: T.radiusLg, padding: 32, width: 400, boxShadow: T.shadowMd }}
            onClick={e => e.stopPropagation()}>
            <div style={{ fontWeight: 700, fontSize: 18, color: T.navy, marginBottom: 20 }}>Record Payment</div>
            <div style={{ background: T.bg, borderRadius: T.radiusSm, padding: 14, marginBottom: 20 }}>
              <div style={{ fontWeight: 600, fontSize: 14, color: T.ink }}>{selectedPayment.tenant_name}</div>
              <div style={{ color: T.inkMuted, fontSize: 13, marginTop: 2 }}>{selectedPayment.property}</div>
              <div style={{ fontSize: 24, fontWeight: 700, color: T.navy, marginTop: 8 }}>${selectedPayment.amount?.toLocaleString()}</div>
              <div style={{ fontSize: 12, color: T.inkMuted, marginTop: 4 }}>Due {selectedPayment.due_date}</div>
              {/* Show late fee warning if applicable */}
              {(() => {
                const lease = leases.find(l => l.id === selectedPayment.lease_id);
                const today = new Date().toISOString().split('T')[0];
                const graceDays = lease?.late_fee_days || 3;
                const graceEnd = new Date(selectedPayment.due_date);
                graceEnd.setDate(graceEnd.getDate() + graceDays);
                const isLate = today > graceEnd.toISOString().split('T')[0];
                if (isLate && lease?.late_fee_percent) {
                  const fee = lease.late_fee_type === 'fixed'
                    ? '$' + lease.late_fee_percent
                    : '$' + Math.round(selectedPayment.amount * lease.late_fee_percent / 100) + ' (' + lease.late_fee_percent + '%)';
                  return (
                    <div style={{ background: T.coralLight, borderRadius: T.radiusSm, padding: '8px 10px', marginTop: 10, fontSize: 12, color: T.coral, fontWeight: 600 }}>
                      ⚠ Late fee applies per contract: {fee}
                      {lease.lease_terms_raw && <div style={{ fontWeight: 400, marginTop: 4, fontStyle: 'italic' }}>"{lease.lease_terms_raw.slice(0, 100)}{lease.lease_terms_raw.length > 100 ? '…' : ''}"</div>}
                    </div>
                  );
                }
                return null;
              })()}
            </div>
            <div style={{ marginBottom: 14 }}>
              <label style={label}>Payment Method</label>
              <select value={method} onChange={e => setMethod(e.target.value)} style={input}>
                {['Zelle', 'Check', 'Cash', 'Venmo', 'Bank Transfer', 'Other'].map(m => <option key={m}>{m}</option>)}
              </select>
            </div>
            <div style={{ marginBottom: 24 }}>
              <label style={label}>Date Received</label>
              <input type="date" value={paidDate} onChange={e => setPaidDate(e.target.value)} style={input} />
            </div>
            <div style={{ display: 'flex', gap: 10 }}>
              <button onClick={confirmPayment} style={{ ...btn.primary, flex: 1, justifyContent: 'center' }}>✓ Confirm Payment</button>
              <button onClick={() => setShowRecord(false)} style={{ ...btn.ghost }}>Cancel</button>
            </div>
          </div>
        </div>
      )}

      {/* Request Payment Modal */}
      {showRequest && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100 }}
          onClick={() => setShowRequest(false)}>
          <div style={{ background: T.surface, borderRadius: T.radiusLg, padding: 32, width: 480, boxShadow: T.shadowMd }}
            onClick={e => e.stopPropagation()}>
            <div style={{ fontWeight: 700, fontSize: 18, color: T.navy, marginBottom: 4 }}>Request Payment</div>
            <div style={{ fontSize: 13, color: T.inkMuted, marginBottom: 24 }}>
              Request a one-time payment from a tenant. It will appear in their portal.
            </div>
            <div style={{ marginBottom: 14 }}>
              <label style={label}>Tenant</label>
              <select style={input} value={requestForm.lease_id} onChange={e => {
                const lease = leases.find(l => l.id === e.target.value);
                setRequestForm({ ...requestForm, lease_id: e.target.value, tenant_name: lease?.tenant_name || '', property: lease?.property || '', amount: '' });
              }}>
                <option value="">Select tenant…</option>
                {leases.map(l => <option key={l.id} value={l.id}>{l.tenant_name} — {l.property?.split(',')[0]}</option>)}
              </select>
            </div>
            <div style={{ marginBottom: 14 }}>
              <label style={label}>Description</label>
              <input style={input} type="text" placeholder="e.g. Water bill reimbursement, Parking fee…"
                value={requestForm.description}
                onChange={e => setRequestForm({ ...requestForm, description: e.target.value })} />
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 24 }}>
              <div>
                <label style={label}>Amount ($)</label>
                <input style={input} type="number" min="0" step="0.01" placeholder="0.00"
                  value={requestForm.amount}
                  onChange={e => setRequestForm({ ...requestForm, amount: e.target.value })} />
              </div>
              <div>
                <label style={label}>Due Date</label>
                <input style={input} type="date"
                  value={requestForm.due_date}
                  onChange={e => setRequestForm({ ...requestForm, due_date: e.target.value })} />
              </div>
            </div>
            <div style={{ display: 'flex', gap: 10 }}>
              <button onClick={submitRequest} disabled={requestLoading} style={{ ...btn.primary, flex: 1, justifyContent: 'center' }}>
                {requestLoading ? 'Sending…' : '📤 Send Request'}
              </button>
              <button onClick={() => setShowRequest(false)} style={{ ...btn.ghost }}>Cancel</button>
            </div>
          </div>
        </div>
      )}

      {/* Add Payment Modal */}
      {showAdd && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100 }}
          onClick={() => setShowAdd(false)}>
          <div style={{ background: T.surface, borderRadius: T.radiusLg, padding: 32, width: 480, boxShadow: T.shadowMd }}
            onClick={e => e.stopPropagation()}>
            <div style={{ fontWeight: 700, fontSize: 18, color: T.navy, marginBottom: 20 }}>Add Payment</div>
            <div style={{ marginBottom: 14 }}>
              <label style={label}>Tenant (from lease)</label>
              <select style={input} value={form.lease_id} onChange={e => {
                const lease = leases.find(l => l.id === e.target.value);
                setForm({ ...form, lease_id: e.target.value, tenant_name: lease?.tenant_name || '', property: lease?.property || '', amount: lease?.rent || '' });
              }}>
                <option value="">Select tenant…</option>
                {leases.map(l => <option key={l.id} value={l.id}>{l.tenant_name} — {l.property}</option>)}
              </select>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 14 }}>
              <div>
                <label style={label}>Amount ($)</label>
                <input style={input} type="number" value={form.amount} onChange={e => setForm({ ...form, amount: e.target.value })} />
              </div>
              <div>
                <label style={label}>Due Date</label>
                <input style={input} type="date" value={form.due_date} onChange={e => setForm({ ...form, due_date: e.target.value })} />
              </div>
            </div>
            <div style={{ marginBottom: 24 }}>
              <label style={label}>Status</label>
              <select style={input} value={form.status} onChange={e => setForm({ ...form, status: e.target.value })}>
                <option value="pending">Pending</option>
                <option value="paid">Paid</option>
                <option value="overdue">Overdue</option>
              </select>
            </div>
            <div style={{ display: 'flex', gap: 10 }}>
              <button onClick={addPayment} disabled={saving} style={{ ...btn.primary }}>
                {saving ? 'Saving…' : 'Add Payment'}
              </button>
              <button onClick={() => setShowAdd(false)} style={{ ...btn.ghost }}>Cancel</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}