'use client';
import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { callClaude } from '../lib/claude';
import { T, btn, card } from '../lib/theme';
import FmvRefineModal, { type FmvContext } from './FmvRefineModal';
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid,
} from 'recharts';

// ── SKELETON ─────────────────────────────────────────────────────────────────
function Skeleton({ w = '100%', h = 16 }: { w?: string | number; h?: number }) {
  return (
    <div style={{
      width: w, height: h, borderRadius: 6,
      background: `linear-gradient(90deg, ${T.border} 25%, ${T.bg} 50%, ${T.border} 75%)`,
      backgroundSize: '200% 100%',
      animation: 'kw-shimmer 1.4s infinite',
    }} />
  );
}

// ── ONBOARDING CHECKLIST ──────────────────────────────────────────────────────
function OnboardingChecklist({ onNavigate }: { onNavigate: (p: string) => void }) {
  const [steps, setSteps] = useState<{ label: string; done: boolean; page: string }[]>([]);
  const [loading, setLoading] = useState(true);
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    if (localStorage.getItem('kw_onboarding_dismissed') === '1') { setDismissed(true); return; }
    (async () => {
      const [prRes, lRes, invRes, payRes, docRes] = await Promise.all([
        supabase.from('properties').select('id', { count: 'exact', head: true }),
        supabase.from('leases').select('id', { count: 'exact', head: true }),
        supabase.from('leases').select('id', { count: 'exact', head: true }).eq('invite_sent', true),
        supabase.from('payments').select('id', { count: 'exact', head: true }),
        supabase.from('documents').select('id', { count: 'exact', head: true }),
      ]);
      setSteps([
        { label: 'Add your first property', done: (prRes.count ?? 0) > 0, page: 'portfolio' },
        { label: 'Upload a lease', done: (lRes.count ?? 0) > 0, page: 'portfolio' },
        { label: 'Invite a tenant', done: (invRes.count ?? 0) > 0, page: 'tenants' },
        { label: 'Set up online payments', done: (payRes.count ?? 0) > 0, page: 'tenants' },
        { label: 'Upload a document', done: (docRes.count ?? 0) > 0, page: 'operations' },
      ]);
      setLoading(false);
    })();
  }, []);

  const dismiss = () => { localStorage.setItem('kw_onboarding_dismissed', '1'); setDismissed(true); };

  if (dismissed) return null;
  if (loading) return (
    <div style={{ ...card, display: 'flex', flexDirection: 'column', gap: 10 }}>
      <Skeleton h={14} w="60%" /><Skeleton h={8} /><Skeleton h={32} /><Skeleton h={32} />
    </div>
  );
  const doneCount = steps.filter(s => s.done).length;
  if (doneCount === 5) return null;

  return (
    <div style={{ ...card, position: 'relative' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 10 }}>
        <div>
          <div style={{ fontWeight: 700, fontSize: 14, color: T.navy }}>Get started with Keywise</div>
          <div style={{ fontSize: 12, color: T.inkMuted, marginTop: 2 }}>{doneCount} of 5 steps complete</div>
        </div>
        <button onClick={dismiss} style={{ background: 'none', border: 'none', color: T.inkMuted, cursor: 'pointer', fontSize: 20, lineHeight: 1, padding: '2px 6px' }}>×</button>
      </div>
      <div style={{ height: 6, background: T.border, borderRadius: 3, marginBottom: 14, overflow: 'hidden' }}>
        <div style={{ height: '100%', width: `${Math.round(doneCount / 5 * 100)}%`, background: T.teal, borderRadius: 3, transition: 'width 0.4s' }} />
      </div>
      {steps.map((s, i) => (
        <div key={i} onClick={() => !s.done && onNavigate(s.page)}
          style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 0',
            borderBottom: i < steps.length - 1 ? `1px solid ${T.border}` : 'none',
            cursor: s.done ? 'default' : 'pointer', opacity: s.done ? 0.55 : 1 }}>
          <div style={{ width: 22, height: 22, borderRadius: '50%', flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center',
            background: s.done ? T.teal : T.surface, border: `2px solid ${s.done ? T.teal : T.border}` }}>
            {s.done && <span style={{ color: '#fff', fontSize: 10, fontWeight: 800, lineHeight: 1 }}>✓</span>}
          </div>
          <span style={{ fontSize: 13, color: s.done ? T.inkMuted : T.ink, textDecoration: s.done ? 'line-through' : 'none', flex: 1 }}>{s.label}</span>
          {!s.done && <span style={{ fontSize: 12, color: T.tealDark, fontWeight: 600 }}>→</span>}
        </div>
      ))}
    </div>
  );
}

// ── SMART ACTIONS (proactive AI suggestions) ─────────────────────────────────
function SmartActions({ leases, payments, maintenance, onNavigate, isMobile }: {
  leases: any[]; payments: any[]; maintenance: any[]; onNavigate: (p: string) => void; isMobile?: boolean;
}) {
  const now = new Date();
  const actions: { icon: string; title: string; desc: string; action: string; priority: 'high' | 'medium' | 'low'; page: string }[] = [];

  // Check for leases expiring in 60-90 days (time to send renewal)
  leases.filter(l => l.end_date).forEach(l => {
    const days = Math.ceil((new Date(l.end_date).getTime() - now.getTime()) / 86400000);
    if (days > 30 && days <= 90) {
      actions.push({ icon: '📄', title: `Send renewal offer to ${l.tenant_name}`, desc: `Lease expires in ${days} days. Send a renewal offer now to avoid vacancy.`, action: 'Draft Renewal', priority: 'high', page: 'tenants' });
    }
  });

  // Check for overdue payments with no reminder sent recently
  const overdue = payments.filter(p => p.status === 'overdue');
  if (overdue.length > 0) {
    actions.push({ icon: '💰', title: `${overdue.length} overdue payment${overdue.length > 1 ? 's' : ''} need attention`, desc: `Send a payment reminder or late notice to collect faster.`, action: 'View Payments', priority: 'high', page: 'tenants' });
  }

  // Check for open maintenance issues older than 7 days
  const staleMaint = maintenance.filter(m => m.status !== 'resolved' && m.created_at && (now.getTime() - new Date(m.created_at).getTime()) > 7 * 86400000);
  if (staleMaint.length > 0) {
    actions.push({ icon: '🔧', title: `${staleMaint.length} maintenance issue${staleMaint.length > 1 ? 's' : ''} open > 7 days`, desc: 'Send tenant an update to keep them informed.', action: 'View Issues', priority: 'medium', page: 'operations' });
  }

  // Check for tenants without insurance
  const noInsurance = leases.filter(l => l.status === 'active');
  if (noInsurance.length > 0) {
    actions.push({ icon: '🛡️', title: 'Request renter\'s insurance from tenants', desc: 'Protect yourself — request proof of insurance from all active tenants.', action: 'Request Docs', priority: 'low', page: 'tenants' });
  }

  // Check for vacant units (leases expired or no lease)
  const expired = leases.filter(l => l.end_date && new Date(l.end_date) < now);
  if (expired.length > 0) {
    actions.push({ icon: '🏠', title: `${expired.length} unit${expired.length > 1 ? 's' : ''} may be vacant`, desc: 'Generate a property listing to find your next tenant faster.', action: 'Create Listing', priority: 'medium', page: 'tenants' });
  }

  if (actions.length === 0) return null;

  const priorityColors = { high: { bg: '#FFF0F0', border: '#FF4444', dot: T.coral }, medium: { bg: '#FFF8E0', border: '#FFB347', dot: '#9A6500' }, low: { bg: T.bg, border: T.border, dot: T.inkMuted } };

  return (
    <div style={{ ...card }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 14 }}>
        <span style={{ fontSize: 16 }}>✦</span>
        <div style={{ fontWeight: 700, fontSize: 15, color: T.navy }}>Smart Actions</div>
        <span style={{ fontSize: 11, color: T.tealDark, background: T.tealLight, padding: '2px 8px', borderRadius: 10, fontWeight: 600 }}>AI-powered</span>
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        {actions.slice(0, 5).map((a, i) => {
          const c = priorityColors[a.priority];
          return (
            <div key={i} onClick={() => onNavigate(a.page)}
              style={{ display: 'flex', alignItems: 'flex-start', gap: 12, padding: '12px 14px', background: c.bg, borderLeft: `3px solid ${c.border}`, borderRadius: T.radiusSm, cursor: 'pointer' }}>
              <span style={{ fontSize: 18, flexShrink: 0, marginTop: 1 }}>{a.icon}</span>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontWeight: 600, fontSize: 13, color: T.ink, marginBottom: 2 }}>{a.title}</div>
                <div style={{ fontSize: 12, color: T.inkMid, lineHeight: 1.5 }}>{a.desc}</div>
              </div>
              <span style={{ fontSize: 12, color: T.tealDark, fontWeight: 600, flexShrink: 0, marginTop: 2 }}>{a.action} →</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ── AI DAILY DIGEST ───────────────────────────────────────────────────────────
function AIDailyDigest({ leases, payments, maintenance, expenses }: {
  leases: any[]; payments: any[]; maintenance: any[]; expenses: any[];
}) {
  const [digest, setDigest] = useState('');
  const [loading, setLoading] = useState(false);
  const today = new Date().toISOString().slice(0, 10);
  const cacheKey = `kw_digest_${today}`;

  useEffect(() => {
    const cached = localStorage.getItem(cacheKey);
    if (cached) { setDigest(cached); return; }
    if (leases.length > 0) fetchDigest();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [leases.length]);

  const fetchDigest = async () => {
    if (leases.length === 0) { setLoading(false); return; }
    setLoading(true);
    const now = new Date();
    const overduePayments = payments.filter(p => p.status === 'overdue');
    const expiring = leases.filter(l => {
      if (!l.end_date) return false;
      const days = Math.ceil((new Date(l.end_date).getTime() - now.getTime()) / 86400000);
      return days > 0 && days <= 60;
    });
    const highMaint = maintenance.filter(m => m.priority === 'high' && m.status !== 'resolved');
    const thisMonth = now.getMonth(), thisYear = now.getFullYear();
    const collected = payments
      .filter(p => p.status === 'paid' && (() => { const d = new Date(p.due_date); return d.getMonth() === thisMonth && d.getFullYear() === thisYear; })())
      .reduce((s, p) => s + (p.amount || 0), 0);
    const totalRent = leases.reduce((s, l) => s + (l.rent || 0), 0);

    const prompt = `Today is ${today}. My rental portfolio:
Tenants: ${leases.map(l => `${l.tenant_name} (${l.property?.split(',')[0]}, $${l.rent}/mo, lease ends ${l.end_date})`).join('; ')}.
Rent: $${collected.toLocaleString()} collected of $${totalRent.toLocaleString()} expected this month.
Overdue: ${overduePayments.map(p => `${p.tenant_name} $${p.amount}`).join(', ') || 'none'}.
Leases expiring within 60 days: ${expiring.map(l => `${l.tenant_name} on ${l.end_date}`).join(', ') || 'none'}.
High-priority maintenance: ${highMaint.map(m => m.issue).join(', ') || 'none'}.
Give me exactly 3 specific, actionable priorities for today. Number them 1, 2, 3. Be direct and brief — no preamble, no headers, no bullet points other than the numbers.`;

    try {
      const result = await callClaude(prompt);
      if (result) { setDigest(result); localStorage.setItem(cacheKey, result); }
    } catch { /* silent fail */ }
    setLoading(false);
  };

  return (
    <div style={{ background: T.surface, border: `1px solid ${T.border}`, borderLeft: `4px solid ${T.teal}`, borderRadius: T.radius, padding: 24, boxShadow: T.shadow }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{ color: T.teal, fontSize: 16 }}>✦</span>
          <div style={{ fontWeight: 700, fontSize: 15, color: T.navy }}>AI Daily Digest</div>
        </div>
        <button onClick={fetchDigest} disabled={loading}
          style={{ background: T.bg, border: `1px solid ${T.border}`, borderRadius: 8, padding: '5px 12px', fontSize: 11, fontWeight: 600, color: T.inkMuted, cursor: loading ? 'default' : 'pointer', opacity: loading ? 0.5 : 1 }}>
          {loading ? '…' : '↺ Refresh'}
        </button>
      </div>
      <div style={{ fontSize: 11, color: T.inkMuted, marginBottom: 16 }}>
        {today} · Based on your live portfolio
      </div>

      {loading ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {[90, 75, 85].map((w, i) => <Skeleton key={i} h={14} w={`${w}%`} />)}
        </div>
      ) : digest ? (
        <div style={{ background: T.tealLight, border: `1px solid ${T.teal}33`, borderRadius: T.radiusSm, padding: '14px 16px', fontSize: 13, lineHeight: 1.85, whiteSpace: 'pre-wrap', color: T.ink }}>
          {digest}
        </div>
      ) : (
        <div style={{ fontSize: 13, color: T.inkMuted, lineHeight: 1.7 }}>
          {leases.length === 0
            ? 'Add leases and properties to get your daily digest.'
            : `${leases.length} leases · ${payments.filter(p => p.status === 'overdue').length} overdue · ${maintenance.filter(m => m.status !== 'resolved').length} open issues`}
        </div>
      )}
    </div>
  );
}

// ── CASH FLOW CHART ───────────────────────────────────────────────────────────
function CashFlowChart({ payments, expenses }: { payments: any[]; expenses: any[] }) {
  const now = new Date();
  const months = Array.from({ length: 6 }, (_, i) => {
    const d = new Date(now.getFullYear(), now.getMonth() - 5 + i, 1);
    return {
      key: `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`,
      label: d.toLocaleString('default', { month: 'short' }),
      income: 0,
      expenses: 0,
    };
  });

  payments.forEach(p => {
    if (p.status !== 'paid' || !p.due_date) return;
    const key = p.due_date.slice(0, 7);
    const m = months.find(x => x.key === key);
    if (m) m.income += (p.amount || 0);
  });
  expenses.forEach(e => {
    if (!e.date) return;
    const key = e.date.slice(0, 7);
    const m = months.find(x => x.key === key);
    if (m) m.expenses += (e.amount || 0);
  });

  const netTotal = months.reduce((s, m) => s + m.income - m.expenses, 0);

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (!active || !payload?.length) return null;
    return (
      <div style={{ background: T.surface, border: `1px solid ${T.border}`, borderRadius: 8, padding: '10px 14px', fontSize: 12, boxShadow: T.shadowMd }}>
        <div style={{ fontWeight: 700, color: T.navy, marginBottom: 6 }}>{label}</div>
        {payload.map((p: any) => (
          <div key={p.name} style={{ color: p.color, marginBottom: 2 }}>
            {p.name === 'income' ? 'Income' : 'Expenses'}: ${(p.value || 0).toLocaleString()}
          </div>
        ))}
        <div style={{ borderTop: `1px solid ${T.border}`, marginTop: 6, paddingTop: 6, fontWeight: 700, color: T.navy }}>
          Net: ${(((payload.find((p: any) => p.name === 'income')?.value || 0) - (payload.find((p: any) => p.name === 'expenses')?.value || 0))).toLocaleString()}
        </div>
      </div>
    );
  };

  return (
    <div style={{ ...card, height: '100%', boxSizing: 'border-box' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
        <div style={{ fontWeight: 700, fontSize: 14, color: T.navy }}>Cash Flow — Last 6 Months</div>
        <div style={{ fontSize: 13, fontWeight: 700, color: netTotal >= 0 ? T.greenDark : T.coral }}>
          Net {netTotal >= 0 ? '+' : ''}${netTotal.toLocaleString()}
        </div>
      </div>
      <div style={{ display: 'flex', gap: 16, marginBottom: 12 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <div style={{ width: 10, height: 10, borderRadius: 2, background: T.teal }} />
          <span style={{ fontSize: 11, color: T.inkMuted }}>Income</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <div style={{ width: 10, height: 10, borderRadius: 2, background: T.coral }} />
          <span style={{ fontSize: 11, color: T.inkMuted }}>Expenses</span>
        </div>
      </div>
      <ResponsiveContainer width="100%" height={180}>
        <BarChart data={months} barCategoryGap="30%" barGap={3}>
          <CartesianGrid strokeDasharray="3 3" stroke={T.border} vertical={false} />
          <XAxis dataKey="label" tick={{ fontSize: 11, fill: T.inkMuted }} axisLine={false} tickLine={false} />
          <YAxis tick={{ fontSize: 11, fill: T.inkMuted }} axisLine={false} tickLine={false} tickFormatter={v => `$${v >= 1000 ? Math.round(v / 1000) + 'k' : v}`} />
          <Tooltip content={<CustomTooltip />} cursor={{ fill: `${T.bg}`, radius: 4 }} />
          <Bar dataKey="income" fill={T.teal} radius={[4, 4, 0, 0]} />
          <Bar dataKey="expenses" fill={T.coral} radius={[4, 4, 0, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

// ── LEASE TIMELINE ────────────────────────────────────────────────────────────
function LeaseTimeline({ leases, onNavigate, isMobile }: { leases: any[]; onNavigate: (p: string) => void; isMobile?: boolean }) {
  const now = new Date();
  const valid = leases.filter(l => l.start_date && l.end_date);
  if (valid.length === 0) return null;

  if (isMobile) {
    return (
      <div style={{ ...card }}>
        <div style={{ fontWeight: 700, fontSize: 14, color: T.navy, marginBottom: 12 }}>Lease Timeline</div>
        {valid.map(l => {
          const days = Math.ceil((new Date(l.end_date).getTime() - now.getTime()) / 86400000);
          return (
            <div key={l.id} onClick={() => onNavigate('tenants')}
              style={{ display: 'flex', justifyContent: 'space-between', padding: '10px 0', borderBottom: `1px solid ${T.border}`, cursor: 'pointer' }}>
              <div>
                <div style={{ fontSize: 13, fontWeight: 600, color: T.ink }}>{l.tenant_name}</div>
                <div style={{ fontSize: 11, color: T.inkMuted }}>{l.property?.split(',')[0]}</div>
              </div>
              <div style={{ textAlign: 'right' }}>
                <div style={{ fontSize: 12, color: T.navy, fontWeight: 600 }}>{l.end_date}</div>
                <div style={{ fontSize: 11, color: days < 90 ? T.coral : T.inkMuted }}>
                  {days < 0 ? Math.abs(days) + 'd ago' : days + 'd left'}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    );
  }

  const starts = valid.map(l => new Date(l.start_date).getTime());
  const ends = valid.map(l => new Date(l.end_date).getTime());
  const rangeStart = new Date(Math.min(...starts));
  rangeStart.setDate(1); rangeStart.setMonth(rangeStart.getMonth() - 1);
  const rangeEnd = new Date(Math.max(...ends));
  rangeEnd.setDate(1); rangeEnd.setMonth(rangeEnd.getMonth() + 2);
  const totalMs = rangeEnd.getTime() - rangeStart.getTime();
  const pos = (d: Date) => ((d.getTime() - rangeStart.getTime()) / totalMs * 100);

  const getColor = (l: any) => {
    const daysLeft = (new Date(l.end_date).getTime() - now.getTime()) / 86400000;
    if (daysLeft < 0) return T.coral;
    if (daysLeft < 90) return T.amber;
    return T.teal;
  };

  const todayPct = Math.max(0, Math.min(100, pos(now)));

  // Build month labels
  const labels: { label: string; pct: number }[] = [];
  const cur = new Date(rangeStart.getFullYear(), rangeStart.getMonth(), 1);
  while (cur <= rangeEnd) {
    const p = pos(cur);
    if (p >= 0 && p <= 100) labels.push({ label: cur.toLocaleString('default', { month: 'short', year: '2-digit' }), pct: p });
    cur.setMonth(cur.getMonth() + 1);
  }

  return (
    <div style={{ ...card }}>
      <div style={{ fontWeight: 700, fontSize: 14, color: T.navy, marginBottom: 16 }}>Lease Timeline</div>
      <div style={{ overflowX: 'auto' }}>
        <div style={{ minWidth: Math.max(600, valid.length * 80), position: 'relative', paddingTop: 20, paddingBottom: 28 }}>
          {/* Today line */}
          <div style={{ position: 'absolute', top: 0, bottom: 24, left: `${todayPct}%`, width: 2, background: T.navy, zIndex: 2, borderRadius: 1 }}>
            <div style={{ position: 'absolute', top: 0, left: '50%', transform: 'translateX(-50%)', fontSize: 9, fontWeight: 700, color: T.navy, whiteSpace: 'nowrap', background: T.surface, padding: '2px 6px', borderRadius: 4, border: `1px solid ${T.border}` }}>Today</div>
          </div>
          {/* Lease bars */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginTop: 8 }}>
            {valid.map(l => {
              const left = Math.max(0, pos(new Date(l.start_date)));
              const right = Math.min(100, pos(new Date(l.end_date)));
              const width = right - left;
              const color = getColor(l);
              return (
                <div key={l.id} onClick={() => onNavigate('tenants')}
                  style={{ position: 'relative', height: 34, cursor: 'pointer' }}>
                  <div style={{ position: 'absolute', left: `${left}%`, width: `${Math.max(width, 2)}%`, height: '100%', borderRadius: 6, background: color + '22', border: `1.5px solid ${color}66`, display: 'flex', alignItems: 'center', paddingLeft: 8, overflow: 'hidden' }}>
                    <span style={{ fontSize: 11, fontWeight: 600, color: color, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                      {l.tenant_name}{l.property ? ' · ' + l.property.split(',')[0] : ''}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
          {/* Month labels */}
          <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, height: 20 }}>
            {labels.map((lb, i) => (
              <div key={i} style={{ position: 'absolute', left: `${lb.pct}%`, transform: 'translateX(-50%)', fontSize: 9, color: T.inkMuted, whiteSpace: 'nowrap' }}>
                {lb.label}
              </div>
            ))}
          </div>
        </div>
      </div>
      {/* Legend */}
      <div style={{ display: 'flex', gap: 16, marginTop: 8 }}>
        {[{ color: T.teal, label: 'Active' }, { color: T.amber, label: 'Expiring <90 days' }, { color: T.coral, label: 'Expired' }].map(x => (
          <div key={x.label} style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
            <div style={{ width: 10, height: 10, borderRadius: 2, background: x.color }} />
            <span style={{ fontSize: 11, color: T.inkMuted }}>{x.label}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

// ── NOTIFICATIONS WIDGET ──────────────────────────────────────────────────────
function NotificationsWidget({ overduePayments, expiringLeases, staleMaint, onNavigate }: {
  overduePayments: any[]; expiringLeases: any[]; staleMaint: any[]; onNavigate: (p: string) => void;
}) {
  const now = new Date();
  const items = [
    ...overduePayments.map(p => ({
      icon: '⚠', color: T.coral, bg: T.coralLight,
      msg: `${p.tenant_name} — $${(p.amount || 0).toLocaleString()} overdue`,
      page: 'tenants',
    })),
    ...expiringLeases.map(l => {
      const days = Math.ceil((new Date(l.end_date).getTime() - now.getTime()) / 86400000);
      return { icon: '📅', color: T.amberDark, bg: T.amberLight, msg: `${l.tenant_name}'s lease expires in ${days} days`, page: 'tenants' };
    }),
    ...staleMaint.map(m => {
      const days = Math.floor((now.getTime() - new Date(m.created_at || m.reported_date).getTime()) / 86400000);
      return { icon: '🔧', color: T.inkMid, bg: T.bg, msg: `${m.issue || 'Maintenance'} — open ${days} days`, page: 'operations' };
    }),
  ];

  return (
    <div style={{ ...card, height: '100%' }}>
      <div style={{ fontWeight: 700, fontSize: 14, color: T.navy, marginBottom: 14 }}>
        Alerts
        {items.length > 0 && (
          <span style={{ marginLeft: 8, fontSize: 11, fontWeight: 700, background: T.coral, color: '#fff', borderRadius: 100, padding: '2px 7px' }}>
            {items.length}
          </span>
        )}
      </div>
      {items.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '24px 0', color: T.inkMuted, fontSize: 13 }}>
          <div style={{ fontSize: 28, marginBottom: 8 }}>✓</div>
          All clear — no urgent items.
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {items.slice(0, 6).map((item, i) => (
            <div key={i} onClick={() => onNavigate(item.page)}
              style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '9px 12px', background: item.bg, borderRadius: T.radiusSm, cursor: 'pointer' }}>
              <span style={{ fontSize: 14, flexShrink: 0 }}>{item.icon}</span>
              <span style={{ fontSize: 12, color: item.color, fontWeight: 600, flex: 1, lineHeight: 1.4 }}>{item.msg}</span>
              <span style={{ fontSize: 11, color: item.color }}>→</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ── ACTIVE LEASES TABLE ───────────────────────────────────────────────────────
function ActiveLeasesTable({ leases, onNavigate, isMobile }: { leases: any[]; onNavigate: (p: string) => void; isMobile?: boolean }) {
  if (leases.length === 0) return null;
  const now = new Date();

  const rows = leases.map(l => {
    const daysLeft = l.end_date
      ? Math.ceil((new Date(l.end_date).getTime() - now.getTime()) / 86400000)
      : null;
    const status = daysLeft === null ? 'active' : daysLeft < 0 ? 'expired' : daysLeft <= 60 ? 'expiring' : 'active';
    const unitMatch = l.property?.match(/,\s*(Unit\s+[^,]+)/i);
    const shortAddress = l.property?.split(',')[0] || '—';
    const propertyDisplay = unitMatch ? `${shortAddress} · ${unitMatch[1].trim()}` : shortAddress;
    return { ...l, daysLeft, status, propertyDisplay };
  });

  const statusStyle = (s: string) => {
    if (s === 'expired') return { bg: T.coralLight, color: T.coral };
    if (s === 'expiring') return { bg: T.amberLight, color: T.amberDark };
    return { bg: T.greenLight, color: T.greenDark };
  };

  return (
    <div style={{ ...card, height: '100%', boxSizing: 'border-box' }}>
      <div style={{ fontWeight: 700, fontSize: 14, color: T.navy, marginBottom: 16 }}>Active Leases</div>
      {isMobile ? (
        <div>
          {rows.map((l, i) => {
            const ss = statusStyle(l.status);
            return (
              <div key={l.id} onClick={() => onNavigate('tenants')}
                style={{ padding: '12px 0', borderBottom: i < rows.length - 1 ? `1px solid ${T.border}` : 'none', cursor: 'pointer' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div style={{ fontWeight: 600, fontSize: 14, color: T.ink }}>{l.tenant_name}</div>
                  <span style={{ background: ss.bg, color: ss.color, fontSize: 10, fontWeight: 700, padding: '2px 8px', borderRadius: 20, textTransform: 'capitalize' }}>{l.status}</span>
                </div>
                <div style={{ fontSize: 12, color: T.inkMuted, marginTop: 2 }}>{l.propertyDisplay}</div>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 6 }}>
                  <span style={{ fontWeight: 700, color: T.navy, fontSize: 13 }}>${(l.rent || 0).toLocaleString()}/mo</span>
                  <span style={{ fontSize: 11, color: l.daysLeft !== null && l.daysLeft < 0 ? T.coral : T.inkMuted }}>
                    {l.end_date ? `Ends ${l.end_date}` : ''}
                    {l.daysLeft !== null ? ` · ${l.daysLeft < 0 ? Math.abs(l.daysLeft) + 'd ago' : l.daysLeft + 'd'}` : ''}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
            <thead>
              <tr>
                {['Tenant', 'Property', 'Rent / mo', 'Status', 'Ends', 'Days Left'].map(h => (
                  <th key={h} style={{ textAlign: 'left', fontSize: 11, fontWeight: 700, color: T.inkMuted, textTransform: 'uppercase', letterSpacing: '0.4px', padding: '0 12px 10px 0', whiteSpace: 'nowrap', borderBottom: `1px solid ${T.border}` }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.map((l, i) => {
                const ss = statusStyle(l.status);
                return (
                  <tr key={l.id} onClick={() => onNavigate('tenants')}
                    style={{ cursor: 'pointer', borderBottom: i < rows.length - 1 ? `1px solid ${T.border}` : 'none' }}
                    onMouseEnter={e => (e.currentTarget as HTMLTableRowElement).style.background = T.bg}
                    onMouseLeave={e => (e.currentTarget as HTMLTableRowElement).style.background = ''}>
                    <td style={{ padding: '11px 12px 11px 0', fontWeight: 600, color: T.ink, whiteSpace: 'nowrap' }}>{l.tenant_name || '—'}</td>
                    <td style={{ padding: '11px 12px 11px 0', color: T.inkMid, maxWidth: 180, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{l.propertyDisplay}</td>
                    <td style={{ padding: '11px 12px 11px 0', fontWeight: 600, color: T.navy, whiteSpace: 'nowrap' }}>${(l.rent || 0).toLocaleString()}</td>
                    <td style={{ padding: '11px 12px 11px 0' }}>
                      <span style={{ background: ss.bg, color: ss.color, fontSize: 11, fontWeight: 700, padding: '2px 9px', borderRadius: 20, textTransform: 'capitalize' }}>{l.status}</span>
                    </td>
                    <td style={{ padding: '11px 12px 11px 0', color: T.inkMid, whiteSpace: 'nowrap' }}>{l.end_date || '—'}</td>
                    <td style={{ padding: '11px 0 11px 0', whiteSpace: 'nowrap', color: l.daysLeft !== null && l.daysLeft < 0 ? T.coral : l.daysLeft !== null && l.daysLeft <= 60 ? T.amberDark : T.inkMid, fontWeight: l.daysLeft !== null && l.daysLeft <= 60 ? 700 : 400 }}>
                      {l.daysLeft !== null ? (l.daysLeft < 0 ? `${Math.abs(l.daysLeft)}d ago` : `${l.daysLeft}d`) : '—'}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

// ── MAIN DASHBOARD ────────────────────────────────────────────────────────────
// ── MARKET INSIGHTS ──────────────────────────────────────────────────────────
type UnitItem = {
  id: string; unitId: string; address: string; unitNumber: string | null;
  beds: number | null; baths: number | null; sqft: number | null; differentiators: string | null;
  currentRent: number | null; tenantName: string | null; leaseId: string | null;
  cachedFmv: number | null; fmvCache: any | null; fmvCalculatedAt: string | null; updatedAt: string | null;
};

// Build a unified list of unit items for FMV analysis.
// Each unit gets matched to its active lease (if any) via address.
function buildUnitItems(units: any[], leases: any[], buildings: any[] = []): UnitItem[] {
  const activeLeases = leases.filter(l => l.property && !l.archived);
  const usedLeaseIds = new Set<string>();
  const items: UnitItem[] = [];

  for (const unit of units) {
    const unitAddr = (unit.address || '').toLowerCase().trim();
    const lease = activeLeases.find(l => {
      if (usedLeaseIds.has(l.id)) return false;
      const la = (l.property || '').toLowerCase().trim();
      return la === unitAddr || la.startsWith(unitAddr) || unitAddr.startsWith(la);
    });
    if (lease) usedLeaseIds.add(lease.id);

    items.push({
      id: unit.id,
      unitId: unit.id,
      address: unit.address || '',
      unitNumber: unit.unit_number || null,
      beds: unit.beds ?? null,
      baths: unit.baths ?? null,
      sqft: unit.sqft ?? null,
      differentiators: unit.differentiators ?? null,
      currentRent: lease?.rent ?? unit.current_rent ?? null,
      tenantName: lease?.tenant_name ?? null,
      leaseId: lease?.id ?? null,
      cachedFmv: unit.estimated_market_rent ?? lease?.estimated_market_rent ?? null,
      fmvCache: unit.fmv_cache ?? null,
      fmvCalculatedAt: unit.fmv_calculated_at ?? null,
      updatedAt: unit.updated_at ?? null,
    });
  }

  // Also include leases that didn't match any unit (legacy data / address mismatch)
  for (const lease of activeLeases) {
    if (usedLeaseIds.has(lease.id)) continue;
    if (!lease.rent || !lease.property) continue;
    items.push({
      id: `lease_${lease.id}`,
      unitId: '',
      address: lease.property,
      unitNumber: null,
      beds: null, baths: null, sqft: null, differentiators: null,
      currentRent: lease.rent,
      tenantName: lease.tenant_name,
      leaseId: lease.id,
      cachedFmv: lease.estimated_market_rent ?? null,
      fmvCache: null, fmvCalculatedAt: null, updatedAt: null,
    });
  }

  // Assign unit letters to items at multi-unit buildings that lack unit numbers
  for (const building of buildings) {
    if ((building.num_units || 1) <= 1) continue;
    const addr = (building.address || '').toLowerCase().trim();
    const buildingItems = items.filter(i => {
      if (i.id.startsWith('vacant_')) return false;
      const itemAddr = (i.address || '').toLowerCase().trim();
      return itemAddr === addr || itemAddr.startsWith(addr) || addr.startsWith(itemAddr);
    });
    if (buildingItems.length === 0) continue;
    let letter = 'A'.charCodeAt(0);
    for (const item of buildingItems) {
      if (!item.unitNumber) {
        item.unitNumber = String.fromCharCode(letter);
        item.address = building.address + ', Unit ' + item.unitNumber;
      }
      letter++;
    }
  }

  // Generate placeholder entries for missing units (e.g. vacant units never added to properties table)
  for (const building of buildings) {
    const expected = building.num_units || 1;
    const tracked = units.filter(u => u.building_id === building.id);
    const missing = expected - tracked.length;
    if (missing <= 0) continue;
    const hasUnitNumbers = tracked.some((u: any) => u.unit_number);
    const trackedNumbers = new Set(tracked.map((u: any) => (u.unit_number || '').toUpperCase()));
    let added = 0;
    if (hasUnitNumbers) {
      // Match existing naming scheme (A, B, C… or 1, 2, 3…)
      const firstTracked = tracked.find((u: any) => u.unit_number)?.unit_number || '';
      const useLetters = /^[A-Z]$/i.test(firstTracked);
      let candidate = useLetters ? 'A'.charCodeAt(0) : 1;
      while (added < missing) {
        const label = useLetters ? String.fromCharCode(candidate) : String(candidate);
        if (!trackedNumbers.has(label.toUpperCase())) {
          items.push({
            id: `vacant_${building.id}_${label}`,
            unitId: '',
            address: building.address + ', Unit ' + label,
            unitNumber: label,
            beds: null, baths: null, sqft: null, differentiators: null,
            currentRent: null, tenantName: null, leaseId: null,
            cachedFmv: null, fmvCache: null, fmvCalculatedAt: null, updatedAt: null,
          });
          added++;
        }
        candidate++;
        if (useLetters && candidate > 'Z'.charCodeAt(0)) break;
        if (!useLetters && candidate > 100) break;
      }
    } else {
      // No unit numbers in use — assign letters starting from A
      let candidate = 'A'.charCodeAt(0);
      // Reserve A for the existing tracked unit
      const startLabel = String.fromCharCode(candidate + tracked.length);
      candidate = startLabel.charCodeAt(0);
      for (let i = 0; i < missing; i++) {
        const label = String.fromCharCode(candidate);
        items.push({
          id: `vacant_${building.id}_${label}`,
          unitId: '',
          address: building.address + ', Unit ' + label,
          unitNumber: label,
          beds: null, baths: null, sqft: null, differentiators: null,
          currentRent: null, tenantName: null, leaseId: null,
          cachedFmv: null, fmvCache: null, fmvCalculatedAt: null, updatedAt: null,
        });
        candidate++;
        if (candidate > 'Z'.charCodeAt(0)) break;
      }
    }
  }

  return items;
}

function isStale(item: UnitItem): boolean {
  if (item.id.startsWith('vacant_')) return false; // placeholder units — analyze individually
  if (!item.fmvCalculatedAt) return true;
  if (!item.updatedAt) return false;
  return new Date(item.updatedAt) > new Date(item.fmvCalculatedAt);
}

function timeAgo(dateStr: string): string {
  const days = Math.floor((Date.now() - new Date(dateStr).getTime()) / 86400000);
  if (days === 0) return 'today';
  if (days === 1) return 'yesterday';
  if (days < 30) return `${days} days ago`;
  const months = Math.floor(days / 30);
  return months === 1 ? '1 month ago' : `${months} months ago`;
}

function MarketInsights({ units, leases, buildings, onNavigate, isMobile }: { units: any[]; leases: any[]; buildings: any[]; onNavigate: (p: string) => void; isMobile: boolean }) {
  const [analyses, setAnalyses] = useState<Record<string, any>>({});
  const [analyzing, setAnalyzing] = useState<string | null>(null);
  const [refreshingAll, setRefreshingAll] = useState(false);
  const [refreshProgress, setRefreshProgress] = useState('');
  const [expanded, setExpanded] = useState(false);
  const [refineItemId, setRefineItemId] = useState<string | null>(null);

  const allItems = buildUnitItems(units, leases, buildings);

  // Load cached FMV from DB (fmv_cache column) — no sessionStorage, no AI call
  useEffect(() => {
    const fromDb: Record<string, any> = {};
    for (const item of allItems) {
      if (item.fmvCache && typeof item.fmvCache === 'object') {
        fromDb[item.id] = item.fmvCache;
      }
    }
    if (Object.keys(fromDb).length > 0) {
      setAnalyses(prev => ({ ...fromDb, ...prev }));
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [units, leases]);

  const runAnalysis = async (item: UnitItem, fmvCtx?: FmvContext) => {
    setAnalyzing(item.id);
    const { data: { user } } = await supabase.auth.getUser();
    try {
      const res = await fetch('/api/market-analysis', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          user_id: user?.id,
          property: item.address,
          current_rent: item.currentRent || 0,
          beds: item.beds,
          baths: item.baths,
          sqft: item.sqft,
          differentiators: item.differentiators,
          ...(fmvCtx || {}),
        }),
      });
      if (res.ok) {
        const data = await res.json();
        if (!data.error) {
          setAnalyses(prev => ({ ...prev, [item.id]: data }));
          const now = new Date().toISOString();
          if (item.unitId) {
            await supabase.from('properties').update({
              estimated_market_rent: data.estimated_market_rent,
              market_value_updated_at: now,
              fmv_cache: data,
              fmv_calculated_at: now,
            }).eq('id', item.unitId);
          }
          if (item.leaseId) {
            await supabase.from('leases').update({
              estimated_market_rent: data.estimated_market_rent,
              market_value_updated_at: now,
            }).eq('id', item.leaseId);
          }
        }
      }
    } catch {}
    setAnalyzing(null);
  };

  const staleItems = allItems.filter(isStale);
  const freshCount = allItems.length - staleItems.length;
  const allCurrent = staleItems.length === 0;

  const refreshAll = async () => {
    if (allCurrent) return;
    setRefreshingAll(true);
    for (let i = 0; i < staleItems.length; i++) {
      setRefreshProgress(`Refreshing ${i + 1} of ${allItems.length} units (${freshCount} current)`);
      await runAnalysis(staleItems[i]);
    }
    setRefreshProgress('');
    setRefreshingAll(false);
  };

  if (allItems.length === 0) return null;

  const displayItems = expanded ? allItems : allItems.slice(0, 3);

  const analyzedCount = allItems.filter(item => analyses[item.id] || item.fmvCache).length;
  const leasedItems = allItems.filter(item => item.currentRent);
  const vacantItems = allItems.filter(item => !item.currentRent);
  const expectedUnits = buildings.reduce((s: number, b: any) => s + (b.num_units || 1), 0);
  const missingUnits = Math.max(0, expectedUnits - units.length);
  const totalCurrent = leasedItems.reduce((s, item) => s + (item.currentRent || 0), 0);
  const totalMarket = allItems.reduce((s, item) => s + (analyses[item.id]?.estimated_market_rent || item.cachedFmv || item.currentRent || 0), 0);
  const opportunity = totalMarket - totalCurrent;
  const belowMarket = leasedItems.filter(item => {
    const fmv = analyses[item.id]?.estimated_market_rent || item.cachedFmv;
    return fmv && fmv > (item.currentRent || 0);
  }).length;

  return (
    <div>
      {/* FMV Summary Banner */}
      <div style={{ background: 'linear-gradient(135deg, #0F3460 0%, #1B4F8C 100%)', borderRadius: T.radiusLg, padding: isMobile ? 20 : 24, marginBottom: 16, color: '#fff', position: 'relative', overflow: 'hidden' }}>
        <div style={{ position: 'absolute', right: -40, top: -40, width: 200, height: 200, borderRadius: '50%', background: 'radial-gradient(circle, rgba(0,212,170,0.15) 0%, transparent 70%)' }} />
        <div style={{ position: 'relative', zIndex: 1 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 16, flexWrap: 'wrap', gap: 10 }}>
            <div>
              <div style={{ color: T.teal, fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '1px', marginBottom: 4 }}>📊 Market Intelligence</div>
              <div style={{ fontSize: 20, fontWeight: 700 }}>Fair Market Rent Analysis</div>
              <div style={{ fontSize: 11, opacity: 0.6, marginTop: 4 }}>{allItems.length} unit{allItems.length !== 1 ? 's' : ''}{vacantItems.length > 0 ? ` · ${vacantItems.length} vacant` : ''}</div>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 4 }}>
              <button onClick={refreshAll} disabled={refreshingAll || allCurrent}
                style={{ background: allCurrent ? 'rgba(255,255,255,0.15)' : T.teal, color: allCurrent ? 'rgba(255,255,255,0.6)' : T.navy, border: 'none', padding: '8px 16px', borderRadius: 8, fontSize: 12, fontWeight: 700, cursor: allCurrent ? 'default' : 'pointer', fontFamily: 'inherit', opacity: refreshingAll ? 0.7 : 1, whiteSpace: 'nowrap' as const }}>
                {refreshingAll ? '⟳ Analyzing...' : allCurrent ? '✓ All up to date' : `🔄 Refresh ${staleItems.length} stale`}
              </button>
              {refreshingAll && refreshProgress && (
                <div style={{ fontSize: 10, opacity: 0.6 }}>{refreshProgress}</div>
              )}
            </div>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: isMobile ? 'repeat(2, 1fr)' : 'repeat(4, 1fr)', gap: 14 }}>
            <div>
              <div style={{ fontSize: 10, opacity: 0.6, marginBottom: 4 }}>CURRENT RENT</div>
              <div style={{ fontSize: 20, fontWeight: 800 }}>${totalCurrent.toLocaleString()}<span style={{ fontSize: 12, opacity: 0.5 }}>/mo</span></div>
            </div>
            <div>
              <div style={{ fontSize: 10, opacity: 0.6, marginBottom: 4 }}>PORTFOLIO FMV</div>
              <div style={{ fontSize: 20, fontWeight: 800, color: T.teal }}>${totalMarket.toLocaleString()}<span style={{ fontSize: 12, opacity: 0.5 }}>/mo</span></div>
            </div>
            <div>
              <div style={{ fontSize: 10, opacity: 0.6, marginBottom: 4 }}>OPPORTUNITY</div>
              <div style={{ fontSize: 20, fontWeight: 800, color: opportunity > 0 ? '#FFB347' : '#fff' }}>{opportunity > 0 ? '+' : ''}${opportunity.toLocaleString()}<span style={{ fontSize: 12, opacity: 0.5 }}>/mo</span></div>
            </div>
            <div>
              <div style={{ fontSize: 10, opacity: 0.6, marginBottom: 4 }}>ANNUAL POTENTIAL</div>
              <div style={{ fontSize: 20, fontWeight: 800, color: opportunity > 0 ? '#FFB347' : '#fff' }}>${(opportunity * 12).toLocaleString()}</div>
            </div>
          </div>
          {belowMarket > 0 && (
            <div style={{ marginTop: 14, fontSize: 12, background: 'rgba(255,179,71,0.15)', borderRadius: 8, padding: '10px 14px' }}>
              💡 <strong>{belowMarket}</strong> of your {leasedItems.length} leased units are below market rate. Consider increases at next renewal.
            </div>
          )}
          {vacantItems.length > 0 && analyzedCount > 0 && (
            <div style={{ marginTop: belowMarket > 0 ? 8 : 14, fontSize: 12, background: 'rgba(0,212,170,0.12)', borderRadius: 8, padding: '10px 14px' }}>
              🏠 <strong>{vacantItems.length}</strong> vacant unit{vacantItems.length !== 1 ? 's' : ''} — FMV estimates help you price listings competitively.
            </div>
          )}
          {missingUnits > 0 && (
            <div style={{ marginTop: (belowMarket > 0 || vacantItems.length > 0) ? 8 : 14, fontSize: 12, background: 'rgba(255,179,71,0.15)', borderRadius: 8, padding: '10px 14px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 8 }}>
              <span>⚠ Your buildings have <strong>{expectedUnits}</strong> units but only <strong>{units.length}</strong> are tracked. Add missing units for complete FMV analysis.</span>
              <button onClick={() => onNavigate('portfolio')} style={{ background: T.navy, color: '#fff', border: 'none', borderRadius: 6, padding: '5px 12px', fontSize: 11, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit', whiteSpace: 'nowrap' as const }}>+ Add Units</button>
            </div>
          )}
          {analyzedCount === 0 && missingUnits === 0 && (
            <div style={{ marginTop: 14, fontSize: 12, opacity: 0.7 }}>Click "Refresh All" to analyze fair market rent for all your units.</div>
          )}
        </div>
      </div>

      {/* Per-unit details */}
      <div style={{ ...card }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <div style={{ fontWeight: 700, fontSize: 14, color: T.navy }}>Per-Unit Analysis</div>
          <span style={{ fontSize: 11, color: T.inkMuted }}>{analyzedCount}/{allItems.length} analyzed</span>
        </div>
        {allItems.length > 3 && (
          <button onClick={() => setExpanded(!expanded)} style={{ background: 'none', border: 'none', color: T.tealDark, fontSize: 12, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit' }}>
            {expanded ? 'Show less' : `Show all ${allItems.length}`}
          </button>
        )}
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        {displayItems.map(item => {
          const a = analyses[item.id];
          const isVacant = !item.leaseId && !item.currentRent;
          const calcAt = item.fmvCalculatedAt || (a ? new Date().toISOString() : null);
          const baseAddr = item.address?.replace(/,?\s*(unit|apt|#)\s*\w+/gi, '').split(',')[0]?.trim() || item.address;
          const unitLabel = baseAddr + (item.unitNumber ? ' — Unit ' + item.unitNumber : '');
          return (
            <div key={item.id} style={{ background: T.bg, borderRadius: T.radiusSm, padding: 14 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: a ? 10 : 0 }}>
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    <div style={{ fontWeight: 600, fontSize: 13, color: T.navy }}>{unitLabel}</div>
                    {isVacant && (
                      <span style={{ fontSize: 10, fontWeight: 700, color: T.inkMuted, background: T.border, borderRadius: 4, padding: '1px 6px', letterSpacing: '0.3px' }}>VACANT</span>
                    )}
                  </div>
                  <div style={{ fontSize: 12, color: T.inkMuted }}>
                    {item.currentRent ? `Current: $${item.currentRent.toLocaleString()}/mo` : 'No active lease'}
                    {item.tenantName ? ` · ${item.tenantName}` : ''}
                    {item.beds || item.baths ? ` · ${item.beds || '?'}bd/${item.baths || '?'}ba` : ''}
                  </div>
                </div>
                <button onClick={() => setRefineItemId(item.id)} disabled={analyzing === item.id}
                  style={{ background: a ? 'none' : T.navy, color: a ? T.tealDark : '#fff', border: a ? `1px solid ${T.border}` : 'none', borderRadius: T.radiusSm, padding: '5px 12px', fontSize: 11, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit', opacity: analyzing === item.id ? 0.6 : 1, whiteSpace: 'nowrap' as const, flexShrink: 0 }}>
                  {analyzing === item.id ? '✦ Analyzing...' : a ? '↻ Refine' : '✦ Analyze'}
                </button>
              </div>

              {a && (
                <div>
                  <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr 1fr' : isVacant ? '1fr 1fr' : 'repeat(3, 1fr)', gap: 8, marginBottom: 8 }}>
                    <div>
                      <div style={{ fontSize: 10, color: T.inkMuted, textTransform: 'uppercase', letterSpacing: '0.3px' }}>Market Rent</div>
                      <div style={{ fontWeight: 700, fontSize: 16, color: T.tealDark }}>${(a.estimated_market_rent || 0).toLocaleString()}</div>
                    </div>
                    <div>
                      <div style={{ fontSize: 10, color: T.inkMuted, textTransform: 'uppercase', letterSpacing: '0.3px' }}>Range</div>
                      <div style={{ fontWeight: 600, fontSize: 13, color: T.navy }}>${(a.market_rent_low || 0).toLocaleString()}–${(a.market_rent_high || 0).toLocaleString()}</div>
                    </div>
                    {!isVacant && !isMobile && (
                      <div>
                        <div style={{ fontSize: 10, color: T.inkMuted, textTransform: 'uppercase', letterSpacing: '0.3px' }}>Difference</div>
                        <div style={{ fontWeight: 700, fontSize: 13, color: (a.rent_difference || 0) > 0 ? T.greenDark : (a.rent_difference || 0) < 0 ? T.coral : T.navy }}>
                          {(a.rent_difference || 0) > 0 ? '+' : ''}{(a.rent_difference ?? (a.estimated_market_rent - (item.currentRent || 0)))?.toLocaleString()}/mo
                        </div>
                      </div>
                    )}
                  </div>
                  {a.recommendations && (
                    <div style={{ fontSize: 12, color: T.inkMid, fontStyle: 'italic' }}>💡 {a.recommendations}</div>
                  )}
                  {a.neighborhood_trends && (
                    <div style={{ fontSize: 11, color: T.inkMuted, marginTop: 4 }}>{a.neighborhood_trends}</div>
                  )}
                  <div style={{ display: 'flex', gap: 12, marginTop: 6, alignItems: 'center', flexWrap: 'wrap' }}>
                    {a.demand_indicator && (
                      <span style={{ fontSize: 10, color: T.inkMuted }}>Demand: <strong style={{ color: a.demand_indicator === 'high' ? T.greenDark : a.demand_indicator === 'low' ? T.coral : T.navy, textTransform: 'capitalize' }}>{a.demand_indicator}</strong></span>
                    )}
                    {a.data_confidence && (
                      <span style={{ fontSize: 10, color: T.inkMuted }}>Confidence: {a.data_confidence}</span>
                    )}
                    {calcAt && (
                      <span style={{ fontSize: 10, color: T.inkMuted }}>Calculated {timeAgo(calcAt)}</span>
                    )}
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>

    {/* FMV Refine Modal */}
    {refineItemId && (() => {
      const item = allItems.find(i => i.id === refineItemId);
      if (!item) return null;
      return (
        <FmvRefineModal
          onClose={() => setRefineItemId(null)}
          onRun={async (ctx) => {
            setRefineItemId(null);
            await runAnalysis(item, ctx);
          }}
        />
      );
    })()}
    </div>
  );
}

export default function Dashboard({ onNavigate }: { onNavigate: (page: string) => void }) {
  const [leases, setLeases] = useState<any[]>([]);
  const [units, setUnits] = useState<any[]>([]);
  const [buildings, setBuildings] = useState<any[]>([]);
  const [payments, setPayments] = useState<any[]>([]);
  const [maintenance, setMaintenance] = useState<any[]>([]);
  const [expenses, setExpenses] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth < 768);
    check();
    window.addEventListener('resize', check);
    return () => window.removeEventListener('resize', check);
  }, []);

  useEffect(() => { fetchAll(); }, []);

  const fetchAll = async () => {
    setLoading(true);
    try {
      const now = new Date();
      const sixMonthsAgo = new Date(now.getFullYear(), now.getMonth() - 5, 1).toISOString().slice(0, 10);
      const [lRes, pRes, mRes, eRes, uRes, bRes] = await Promise.all([
        supabase.from('leases').select('*').order('end_date', { ascending: true }),
        supabase.from('payments').select('*').gte('due_date', sixMonthsAgo).order('due_date', { ascending: false }),
        supabase.from('maintenance').select('*').order('created_at', { ascending: false }).limit(30),
        supabase.from('expenses').select('*').gte('date', sixMonthsAgo).order('date', { ascending: false }),
        supabase.from('properties').select('id, address, unit_number, building_id, beds, baths, sqft, current_rent, differentiators, estimated_market_rent, market_value_updated_at, fmv_cache, fmv_calculated_at, updated_at').eq('is_unit', true).order('address'),
        supabase.from('buildings').select('id, address, num_units').order('address'),
      ]);
      if (lRes.data) setLeases(lRes.data);
      if (pRes.data) setPayments(pRes.data);
      if (mRes.data) setMaintenance(mRes.data);
      if (eRes.data) setExpenses(eRes.data);
      if (uRes.data) setUnits(uRes.data);
      if (bRes.data) setBuildings(bRes.data);
    } catch (err) {
      console.error('[dashboard] fetchAll error:', err);
    } finally {
      setLoading(false);
    }
  };

  // ── Derived data ──
  const now = new Date();
  const thisMonth = now.getMonth(), thisYear = now.getFullYear();
  const nonArchivedLeases = leases.filter(l => !l.archived);

  const totalRent = nonArchivedLeases.reduce((s, l) => s + (l.rent || 0), 0);
  const collectedThisMonth = payments
    .filter(p => p.status === 'paid' && (() => { const d = new Date(p.due_date); return d.getMonth() === thisMonth && d.getFullYear() === thisYear; })())
    .reduce((s, p) => s + (p.amount || 0), 0);
  const totalExpenses = expenses
    .filter(e => { const d = new Date(e.date); return d.getMonth() === thisMonth && d.getFullYear() === thisYear; })
    .reduce((s, e) => s + (e.amount || 0), 0);
  const netCashFlow = collectedThisMonth - totalExpenses;

  const overduePayments = payments.filter(p => p.status === 'overdue');
  const expiringLeases = leases.filter(l => {
    if (!l.end_date) return false;
    const days = Math.ceil((new Date(l.end_date).getTime() - now.getTime()) / 86400000);
    return days > 0 && days <= 60;
  });
  const highPrioMaint = maintenance.filter(m => m.priority === 'high' && m.status !== 'resolved');
  const openMaint = maintenance.filter(m => m.status !== 'resolved');
  const staleMaint = maintenance.filter(m => {
    if (m.status === 'resolved' || !m.created_at) return false;
    return (now.getTime() - new Date(m.created_at).getTime()) > 7 * 86400000;
  });

  const urgentCount = overduePayments.length + expiringLeases.length + highPrioMaint.length;

  if (loading) return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 14 }}>
        {[1,2,3,4].map(i => <div key={i} style={{ ...card, height: 88 }}><Skeleton h={14} w="60%" /><Skeleton h={28} /><Skeleton h={10} w="50%" /></div>)}
      </div>
    </div>
  );

  const colGrid = (a: number, b: number) => isMobile ? '1fr' : `${a}fr ${b}fr`;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      <style>{`@keyframes kw-shimmer{0%{background-position:200% 0}100%{background-position:-200% 0}}`}</style>

      {/* ── ALERT STRIPS ── */}
      {urgentCount > 0 && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {overduePayments.map(p => (
            <div key={p.id} style={{ display: 'flex', alignItems: isMobile ? 'flex-start' : 'center', justifyContent: 'space-between', flexDirection: isMobile ? 'column' : 'row', background: T.coralLight, border: `1px solid ${T.coral}33`, borderRadius: T.radiusSm, padding: '11px 16px', gap: isMobile ? 10 : 0 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <span style={{ fontSize: 15 }}>⚠</span>
                <span style={{ fontWeight: 700, fontSize: 13, color: T.coral }}>Overdue:</span>
                <span style={{ fontSize: 13, color: T.inkMid }}>{p.tenant_name}{p.property ? ', ' + p.property.split(',')[0] : ''} — <b>${(p.amount || 0).toLocaleString()}</b></span>
              </div>
              <button onClick={() => onNavigate('tenants')} style={{ ...btn.danger, fontSize: 12, padding: '5px 14px' }}>View Tenant →</button>
            </div>
          ))}
          {expiringLeases.map(l => {
            const days = Math.ceil((new Date(l.end_date).getTime() - now.getTime()) / 86400000);
            return (
              <div key={l.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: T.amberLight, border: `1px solid ${T.amber}44`, borderRadius: T.radiusSm, padding: '11px 16px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <span style={{ fontSize: 15 }}>📅</span>
                  <span style={{ fontWeight: 700, fontSize: 13, color: T.amberDark }}>Lease expiring in {days} days</span>
                  <span style={{ fontSize: 13, color: T.inkMid }}> — {l.tenant_name}, {l.property?.split(',')[0]}</span>
                </div>
                <button onClick={() => onNavigate('tenants')} style={{ background: T.amberLight, color: T.amberDark, border: `1px solid ${T.amber}66`, borderRadius: T.radiusSm, padding: '5px 14px', fontSize: 12, fontWeight: 600, cursor: 'pointer' }}>Renew Lease →</button>
              </div>
            );
          })}
          {highPrioMaint.map(m => (
            <div key={m.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: '#FFF4EE', border: '1px solid #F9731644', borderRadius: T.radiusSm, padding: '11px 16px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <span style={{ fontSize: 15 }}>🔧</span>
                <span style={{ fontWeight: 700, fontSize: 13, color: '#C2410C' }}>High priority maintenance</span>
                <span style={{ fontSize: 13, color: T.inkMid }}> — {m.issue || 'Issue'}{m.property ? ', ' + m.property.split(',')[0] : ''}</span>
              </div>
              <button onClick={() => onNavigate('operations')} style={{ background: '#FFF4EE', color: '#C2410C', border: '1px solid #F9731644', borderRadius: T.radiusSm, padding: '5px 14px', fontSize: 12, fontWeight: 600, cursor: 'pointer' }}>View Issue →</button>
            </div>
          ))}
        </div>
      )}

      {/* ── ROW 1: STATS ── */}
      <div style={{ display: 'grid', gridTemplateColumns: isMobile ? 'repeat(2,1fr)' : 'repeat(4,1fr)', gap: 14 }}>
        {[
          { label: 'Rent Expected', value: '$' + totalRent.toLocaleString(), sub: leases.length + ' active lease' + (leases.length !== 1 ? 's' : ''), color: T.navy },
          { label: 'Collected', value: '$' + collectedThisMonth.toLocaleString(), sub: totalRent > 0 ? Math.round(collectedThisMonth / totalRent * 100) + '% of expected' : 'this month', color: T.greenDark },
          { label: 'Expenses', value: '$' + totalExpenses.toLocaleString(), sub: 'this month', color: T.inkMid },
          { label: 'Net Cash Flow', value: (netCashFlow >= 0 ? '+$' : '-$') + Math.abs(netCashFlow).toLocaleString(), sub: 'income minus expenses', color: netCashFlow >= 0 ? T.greenDark : T.coral },
        ].map(s => (
          <div key={s.label} style={{ background: T.surface, border: `1px solid ${T.border}`, borderRadius: T.radius, padding: '18px 20px', boxShadow: T.shadow }}>
            <div style={{ fontSize: 11, fontWeight: 700, color: T.inkMuted, textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: 8 }}>{s.label}</div>
            <div style={{ fontSize: 26, fontWeight: 700, color: s.color, letterSpacing: '-0.5px' }}>{s.value}</div>
            <div style={{ fontSize: 12, color: T.inkMuted, marginTop: 4 }}>{s.sub}</div>
          </div>
        ))}
      </div>

      {/* ── ROW 2: SMART ACTIONS (proactive AI) ── */}
      <SmartActions leases={leases} payments={payments} maintenance={maintenance} onNavigate={onNavigate} isMobile={isMobile} />

      {/* ── MARKET INSIGHTS ── */}
      <MarketInsights units={units} leases={leases.filter(l => !l.archived)} buildings={buildings} onNavigate={onNavigate} isMobile={isMobile} />

      {/* ── ROW 3: AI DAILY DIGEST (full width) ── */}
      <AIDailyDigest leases={leases} payments={payments} maintenance={maintenance} expenses={expenses} />

      {/* ── ROW 3: LEASE TIMELINE (full width) ── */}
      <LeaseTimeline leases={leases} onNavigate={onNavigate} isMobile={isMobile} />

      {/* ── ROW 4: CASH FLOW + ACTIVE LEASES (50/50) ── */}
      <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr', gap: 20, alignItems: 'stretch' }}>
        <CashFlowChart payments={payments} expenses={expenses} />
        <ActiveLeasesTable leases={leases} onNavigate={onNavigate} isMobile={isMobile} />
      </div>

      {/* ── EMPTY STATE ── */}
      {leases.length === 0 && (
        <div style={{ background: T.surface, border: `1px solid ${T.border}`, borderRadius: T.radius, padding: 40, textAlign: 'center', boxShadow: T.shadow }}>
          <div style={{ fontSize: 40, marginBottom: 12 }}>🏠</div>
          <div style={{ fontWeight: 700, fontSize: 16, color: T.navy, marginBottom: 6 }}>Your portfolio is empty</div>
          <div style={{ fontSize: 13, color: T.inkMuted, marginBottom: 20 }}>Add properties and leases to see your dashboard come to life.</div>
          <div style={{ display: 'flex', gap: 10, justifyContent: 'center' }}>
            <button onClick={() => onNavigate('portfolio')} style={{ ...btn.primary }}>+ Add a Property</button>
            <button onClick={() => onNavigate('portfolio')} style={{ background: T.tealLight, color: T.tealDark, border: `1px solid ${T.teal}33`, borderRadius: T.radiusSm, padding: '9px 18px', fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>
              ✦ Import Documents
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
