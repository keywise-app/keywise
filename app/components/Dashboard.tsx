'use client';
import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { T, btn, card } from '../lib/theme';
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
      const res = await fetch('/api/claude', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ prompt }) });
      const data = await res.json();
      if (data.result) { setDigest(data.result); localStorage.setItem(cacheKey, data.result); }
    } catch { /* silent fail */ }
    setLoading(false);
  };

  return (
    <div style={{ background: T.navy, borderRadius: T.radius, padding: 24, boxShadow: T.shadowMd, position: 'relative', overflow: 'hidden', minHeight: 180 }}>
      <div style={{ position: 'absolute', top: -20, right: -20, width: 120, height: 120, borderRadius: '50%', background: T.teal, opacity: 0.07, pointerEvents: 'none' }} />
      <div style={{ position: 'absolute', bottom: -30, left: -10, width: 80, height: 80, borderRadius: '50%', background: T.teal, opacity: 0.05, pointerEvents: 'none' }} />
      <div style={{ position: 'relative' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{ color: T.teal, fontSize: 16 }}>✦</span>
            <div style={{ fontWeight: 700, fontSize: 15, color: '#fff' }}>AI Daily Digest</div>
          </div>
          <button onClick={fetchDigest} disabled={loading}
            style={{ background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.15)', borderRadius: 8, padding: '5px 12px', fontSize: 11, fontWeight: 600, color: 'rgba(255,255,255,0.6)', cursor: loading ? 'default' : 'pointer', opacity: loading ? 0.5 : 1 }}>
            {loading ? '…' : '↺ Refresh'}
          </button>
        </div>
        <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.4)', marginBottom: 16 }}>
          {today} · Based on your live portfolio
        </div>

        {loading ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {[90, 75, 85].map((w, i) => (
              <div key={i} style={{ height: 14, borderRadius: 4, background: 'rgba(255,255,255,0.1)', width: `${w}%` }} />
            ))}
          </div>
        ) : digest ? (
          <div style={{ background: 'rgba(0,212,170,0.08)', border: `1px solid ${T.teal}22`, borderRadius: T.radiusSm, padding: '14px 16px', fontSize: 13, lineHeight: 1.85, whiteSpace: 'pre-wrap', color: 'rgba(255,255,255,0.88)' }}>
            {digest}
          </div>
        ) : (
          <div style={{ fontSize: 13, color: 'rgba(255,255,255,0.4)', lineHeight: 1.7 }}>
            {leases.length === 0
              ? 'Add leases and properties to get your daily digest.'
              : `${leases.length} leases · ${payments.filter(p => p.status === 'overdue').length} overdue · ${maintenance.filter(m => m.status !== 'resolved').length} open issues`}
          </div>
        )}
      </div>
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
    <div style={{ ...card }}>
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
function LeaseTimeline({ leases, onNavigate }: { leases: any[]; onNavigate: (p: string) => void }) {
  const now = new Date();
  const valid = leases.filter(l => l.start_date && l.end_date);
  if (valid.length === 0) return null;

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

// ── MAIN DASHBOARD ────────────────────────────────────────────────────────────
export default function Dashboard({ onNavigate }: { onNavigate: (page: string) => void }) {
  const [leases, setLeases] = useState<any[]>([]);
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
    const now = new Date();
    const sixMonthsAgo = new Date(now.getFullYear(), now.getMonth() - 5, 1).toISOString().slice(0, 10);
    const [lRes, pRes, mRes, eRes] = await Promise.all([
      supabase.from('leases').select('*').order('end_date', { ascending: true }),
      supabase.from('payments').select('*').gte('due_date', sixMonthsAgo).order('due_date', { ascending: false }),
      supabase.from('maintenance').select('*').order('created_at', { ascending: false }).limit(30),
      supabase.from('expenses').select('*').gte('date', sixMonthsAgo).order('date', { ascending: false }),
    ]);
    if (lRes.data) setLeases(lRes.data);
    if (pRes.data) setPayments(pRes.data);
    if (mRes.data) setMaintenance(mRes.data);
    if (eRes.data) setExpenses(eRes.data);
    setLoading(false);
  };

  // ── Derived data ──
  const now = new Date();
  const thisMonth = now.getMonth(), thisYear = now.getFullYear();

  const totalRent = leases.reduce((s, l) => s + (l.rent || 0), 0);
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

  const recentActivity = [
    ...payments.slice(0, 5).map(p => ({ kind: 'payment' as const, date: p.due_date, data: p })),
    ...maintenance.slice(0, 3).map(m => ({ kind: 'maintenance' as const, date: m.created_at?.slice(0, 10) || '', data: m })),
  ].sort((a, b) => b.date.localeCompare(a.date)).slice(0, 7);

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

      {/* ── ROW 2: QUICK ACTIONS ── */}
      <div style={{ display: 'grid', gridTemplateColumns: isMobile ? 'repeat(2,1fr)' : 'repeat(4,1fr)', gap: 14 }}>
        {[
          { icon: '💳', label: 'Mark Rent Paid', desc: 'Update payment status', page: 'tenants', teal: false },
          { icon: '🔧', label: 'Log Maintenance', desc: 'Report a new issue', page: 'operations', teal: false },
          { icon: '✦', label: 'Draft Message', desc: 'AI-written tenant notice', page: 'tenants', teal: true },
          { icon: '📋', label: 'View Documents', desc: 'Leases & reports', page: 'operations', teal: false },
        ].map(a => (
          <div key={a.label} onClick={() => onNavigate(a.page)}
            style={{ background: a.teal ? T.navy : T.surface, border: `1px solid ${a.teal ? T.navy : T.border}`, borderRadius: T.radius, padding: '16px 18px', cursor: 'pointer', boxShadow: T.shadow, transition: 'transform 0.1s, box-shadow 0.1s' }}
            onMouseEnter={e => { (e.currentTarget as HTMLDivElement).style.transform = 'translateY(-1px)'; (e.currentTarget as HTMLDivElement).style.boxShadow = T.shadowMd; }}
            onMouseLeave={e => { (e.currentTarget as HTMLDivElement).style.transform = ''; (e.currentTarget as HTMLDivElement).style.boxShadow = T.shadow; }}>
            <div style={{ fontSize: 20, marginBottom: 8 }}>{a.icon}</div>
            <div style={{ fontWeight: 700, fontSize: 13, color: a.teal ? '#fff' : T.navy, marginBottom: 3 }}>{a.label}</div>
            <div style={{ fontSize: 12, color: a.teal ? 'rgba(255,255,255,0.6)' : T.inkMuted }}>{a.desc}</div>
          </div>
        ))}
      </div>

      {/* ── ROW 3: AI DIGEST + ONBOARDING ── */}
      <div style={{ display: 'grid', gridTemplateColumns: colGrid(3, 2), gap: 20, alignItems: 'start' }}>
        <AIDailyDigest leases={leases} payments={payments} maintenance={maintenance} expenses={expenses} />
        <OnboardingChecklist onNavigate={onNavigate} />
      </div>

      {/* ── ROW 4: CASH FLOW + NOTIFICATIONS ── */}
      <div style={{ display: 'grid', gridTemplateColumns: colGrid(3, 2), gap: 20, alignItems: 'start' }}>
        <CashFlowChart payments={payments} expenses={expenses} />
        <NotificationsWidget overduePayments={overduePayments} expiringLeases={expiringLeases} staleMaint={staleMaint} onNavigate={onNavigate} />
      </div>

      {/* ── ROW 5: LEASE TIMELINE ── */}
      <LeaseTimeline leases={leases} onNavigate={onNavigate} />

      {/* ── ROW 6: RECENT ACTIVITY ── */}
      {recentActivity.length > 0 && (
        <div style={{ background: T.surface, border: `1px solid ${T.border}`, borderRadius: T.radius, padding: 22, boxShadow: T.shadow }}>
          <div style={{ fontWeight: 700, fontSize: 14, color: T.navy, marginBottom: 16 }}>Recent Activity</div>
          {recentActivity.map((item, i) => (
            <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '10px 0', borderBottom: i < recentActivity.length - 1 ? `1px solid ${T.border}` : 'none' }}>
              <div style={{ width: 34, height: 34, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, background: item.kind === 'payment' ? (item.data.status === 'paid' ? T.greenLight : item.data.status === 'overdue' ? T.coralLight : T.amberLight) : '#FFF4EE', fontSize: 15 }}>
                {item.kind === 'payment' ? '💳' : '🔧'}
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 13, fontWeight: 600, color: T.ink, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {item.kind === 'payment' ? (item.data.tenant_name || 'Unknown') + ' — $' + (item.data.amount || 0).toLocaleString() : (item.data.issue || 'Maintenance issue')}
                </div>
                <div style={{ fontSize: 11, color: T.inkMuted, marginTop: 2 }}>
                  {item.kind === 'payment' ? item.data.status + ' · ' + item.date : (item.data.property?.split(',')[0] || '') + ' · ' + (item.data.priority || 'normal') + ' priority'}
                </div>
              </div>
              <span style={{ fontSize: 10, fontWeight: 700, padding: '2px 8px', borderRadius: 20, flexShrink: 0, textTransform: 'uppercase', background: item.kind === 'payment' ? (item.data.status === 'paid' ? T.greenLight : item.data.status === 'overdue' ? T.coralLight : T.amberLight) : (item.data.status === 'resolved' ? T.greenLight : '#FFF4EE'), color: item.kind === 'payment' ? (item.data.status === 'paid' ? T.greenDark : item.data.status === 'overdue' ? T.coral : T.amberDark) : (item.data.status === 'resolved' ? T.greenDark : '#C2410C') }}>
                {item.kind === 'payment' ? item.data.status : item.data.status || 'open'}
              </span>
            </div>
          ))}
        </div>
      )}

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
