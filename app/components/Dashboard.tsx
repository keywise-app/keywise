'use client';
import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { T, btn } from '../lib/theme';

export default function Dashboard({ onNavigate }: { onNavigate: (page: string) => void }) {
  const [leases, setLeases] = useState<any[]>([]);
  const [payments, setPayments] = useState<any[]>([]);
  const [maintenance, setMaintenance] = useState<any[]>([]);
  const [expenses, setExpenses] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [insight, setInsight] = useState('');
  const [insightLoading, setInsightLoading] = useState(false);

  useEffect(() => { fetchAll(); }, []);

  const fetchAll = async () => {
    setLoading(true);
    const now = new Date();
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().slice(0, 10);
    const [lRes, pRes, mRes, eRes] = await Promise.all([
      supabase.from('leases').select('*').order('end_date', { ascending: true }),
      supabase.from('payments').select('*').order('due_date', { ascending: false }).limit(60),
      supabase.from('maintenance').select('*').order('created_at', { ascending: false }).limit(20),
      supabase.from('expenses').select('*').gte('date', monthStart).order('date', { ascending: false }),
    ]);
    if (lRes.data) setLeases(lRes.data);
    if (pRes.data) setPayments(pRes.data);
    if (mRes.data) setMaintenance(mRes.data);
    if (eRes.data) setExpenses(eRes.data);
    setLoading(false);
  };

  // --- Derived data ---
  const now = new Date();
  const thisMonth = now.getMonth();
  const thisYear = now.getFullYear();

  const totalRent = leases.reduce((s, l) => s + (l.rent || 0), 0);
  const collectedThisMonth = payments
    .filter(p => p.status === 'paid' && (() => { const d = new Date(p.due_date); return d.getMonth() === thisMonth && d.getFullYear() === thisYear; })())
    .reduce((s, p) => s + (p.amount || 0), 0);
  const totalExpenses = expenses.reduce((s, e) => s + (e.amount || 0), 0);
  const netCashFlow = collectedThisMonth - totalExpenses;

  const overduePayments = payments.filter(p => p.status === 'overdue');
  const expiringLeases = leases.filter(l => {
    if (!l.end_date) return false;
    const days = Math.ceil((new Date(l.end_date).getTime() - now.getTime()) / 86400000);
    return days > 0 && days <= 60;
  });
  const highPrioMaint = maintenance.filter(m => m.priority === 'high' && m.status !== 'resolved');
  const openMaint = maintenance.filter(m => m.status !== 'resolved');

  const recentActivity = [
    ...payments.slice(0, 5).map(p => ({ kind: 'payment' as const, date: p.due_date, data: p })),
    ...maintenance.slice(0, 3).map(m => ({ kind: 'maintenance' as const, date: m.created_at?.slice(0, 10) || '', data: m })),
  ].sort((a, b) => b.date.localeCompare(a.date)).slice(0, 7);

  const getInsight = async () => {
    setInsightLoading(true);
    setInsight('');
    const res = await fetch('/api/claude', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        prompt: `You manage ${leases.length} rental units. $${collectedThisMonth.toLocaleString()} collected this month out of $${totalRent.toLocaleString()} expected. ${overduePayments.length} overdue payments totalling $${overduePayments.reduce((s, p) => s + (p.amount || 0), 0).toLocaleString()}. ${openMaint.length} open maintenance issues (${highPrioMaint.length} high priority). $${totalExpenses.toLocaleString()} in expenses this month. Net cash flow: $${netCashFlow.toLocaleString()}. Expiring leases within 60 days: ${expiringLeases.map(l => l.tenant_name + ' (' + l.end_date + ')').join(', ') || 'none'}. Give me 3 specific, actionable priorities for this week. Be direct and brief. No fluff.`,
      }),
    });
    const data = await res.json();
    setInsight(data.result);
    setInsightLoading(false);
  };

  if (loading) return (
    <div style={{ textAlign: 'center', padding: 60, color: T.inkMuted, fontSize: 13 }}>Loading your portfolio…</div>
  );

  const urgentCount = overduePayments.length + expiringLeases.length + highPrioMaint.length;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 22 }}>

      {/* ── ALERT STRIP ── */}
      {urgentCount > 0 && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {overduePayments.map(p => (
            <div key={p.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: T.coralLight, border: `1px solid ${T.coral}33`, borderRadius: T.radiusSm, padding: '11px 16px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <span style={{ fontSize: 15 }}>⚠</span>
                <div>
                  <span style={{ fontWeight: 700, fontSize: 13, color: T.coral }}>Overdue payment</span>
                  <span style={{ fontSize: 13, color: T.inkMid }}> — {p.tenant_name}{p.property ? ', ' + p.property.split(',')[0] : ''}</span>
                </div>
                <span style={{ fontWeight: 700, fontSize: 13, color: T.coral }}>${(p.amount || 0).toLocaleString()}</span>
              </div>
              <button onClick={() => onNavigate('tenants')} style={{ ...btn.danger, fontSize: 12, padding: '5px 14px' }}>
                View Tenant →
              </button>
            </div>
          ))}

          {expiringLeases.map(l => {
            const days = Math.ceil((new Date(l.end_date).getTime() - now.getTime()) / 86400000);
            return (
              <div key={l.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: T.amberLight, border: `1px solid ${T.amber}44`, borderRadius: T.radiusSm, padding: '11px 16px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <span style={{ fontSize: 15 }}>📅</span>
                  <div>
                    <span style={{ fontWeight: 700, fontSize: 13, color: T.amberDark }}>Lease expiring in {days} days</span>
                    <span style={{ fontSize: 13, color: T.inkMid }}> — {l.tenant_name}, {l.property?.split(',')[0]}</span>
                  </div>
                </div>
                <button onClick={() => onNavigate('tenants')} style={{ background: T.amberLight, color: T.amberDark, border: `1px solid ${T.amber}66`, borderRadius: T.radiusSm, padding: '5px 14px', fontSize: 12, fontWeight: 600, cursor: 'pointer' }}>
                  Renew Lease →
                </button>
              </div>
            );
          })}

          {highPrioMaint.map(m => (
            <div key={m.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: '#FFF4EE', border: `1px solid #F97316${'44'}`, borderRadius: T.radiusSm, padding: '11px 16px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <span style={{ fontSize: 15 }}>🔧</span>
                <div>
                  <span style={{ fontWeight: 700, fontSize: 13, color: '#C2410C' }}>High priority maintenance</span>
                  <span style={{ fontSize: 13, color: T.inkMid }}> — {m.issue || m.title || 'Issue'}{m.property ? ', ' + m.property.split(',')[0] : ''}</span>
                </div>
              </div>
              <button onClick={() => onNavigate('operations')} style={{ background: '#FFF4EE', color: '#C2410C', border: '1px solid #F9731644', borderRadius: T.radiusSm, padding: '5px 14px', fontSize: 12, fontWeight: 600, cursor: 'pointer' }}>
                View Issue →
              </button>
            </div>
          ))}
        </div>
      )}

      {/* ── QUICK ACTIONS ── */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 14 }}>
        {[
          { icon: '💳', label: 'Mark Rent Paid', desc: 'Update payment status', page: 'tenants', teal: false },
          { icon: '🔧', label: 'Log Maintenance', desc: 'Report a new issue', page: 'operations', teal: false },
          { icon: '✦', label: 'Draft Message', desc: 'AI-written tenant notice', page: 'tenants', teal: true },
          { icon: '📋', label: 'View Documents', desc: 'Leases & reports', page: 'operations', teal: false },
        ].map(a => (
          <div key={a.label} onClick={() => onNavigate(a.page)}
            style={{
              background: a.teal ? T.navy : T.surface,
              border: `1px solid ${a.teal ? T.navy : T.border}`,
              borderRadius: T.radius,
              padding: '18px 20px',
              cursor: 'pointer',
              boxShadow: T.shadow,
              transition: 'transform 0.1s, box-shadow 0.1s',
            }}
            onMouseEnter={e => { (e.currentTarget as HTMLDivElement).style.transform = 'translateY(-1px)'; (e.currentTarget as HTMLDivElement).style.boxShadow = T.shadowMd; }}
            onMouseLeave={e => { (e.currentTarget as HTMLDivElement).style.transform = ''; (e.currentTarget as HTMLDivElement).style.boxShadow = T.shadow; }}
          >
            <div style={{ fontSize: 22, marginBottom: 10 }}>{a.icon}</div>
            <div style={{ fontWeight: 700, fontSize: 13, color: a.teal ? '#fff' : T.navy, marginBottom: 3 }}>{a.label}</div>
            <div style={{ fontSize: 12, color: a.teal ? 'rgba(255,255,255,0.6)' : T.inkMuted }}>{a.desc}</div>
          </div>
        ))}
      </div>

      {/* ── FINANCIAL SUMMARY ── */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 14 }}>
        {[
          { label: 'Rent Expected', value: '$' + totalRent.toLocaleString(), sub: leases.length + ' active lease' + (leases.length !== 1 ? 's' : ''), color: T.navy },
          { label: 'Collected', value: '$' + collectedThisMonth.toLocaleString(), sub: totalRent > 0 ? Math.round(collectedThisMonth / totalRent * 100) + '% of expected' : 'this month', color: T.greenDark },
          { label: 'Expenses', value: '$' + totalExpenses.toLocaleString(), sub: 'this month', color: T.inkMid },
          { label: 'Net Cash Flow', value: (netCashFlow >= 0 ? '+$' : '-$') + Math.abs(netCashFlow).toLocaleString(), sub: 'collected minus expenses', color: netCashFlow >= 0 ? T.greenDark : T.coral },
        ].map(s => (
          <div key={s.label} style={{ background: T.surface, border: `1px solid ${T.border}`, borderRadius: T.radius, padding: '18px 20px', boxShadow: T.shadow }}>
            <div style={{ fontSize: 11, fontWeight: 700, color: T.inkMuted, textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: 8 }}>{s.label}</div>
            <div style={{ fontSize: 26, fontWeight: 700, color: s.color, letterSpacing: '-0.5px' }}>{s.value}</div>
            <div style={{ fontSize: 12, color: T.inkMuted, marginTop: 4 }}>{s.sub}</div>
          </div>
        ))}
      </div>

      {/* ── RECENT ACTIVITY + AI BRIEFING (side by side) ── */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20, alignItems: 'start' }}>

        {/* Recent Activity */}
        <div style={{ background: T.surface, border: `1px solid ${T.border}`, borderRadius: T.radius, padding: 22, boxShadow: T.shadow }}>
          <div style={{ fontWeight: 700, fontSize: 14, color: T.navy, marginBottom: 16 }}>Recent Activity</div>
          {recentActivity.length === 0 ? (
            <div style={{ textAlign: 'center', color: T.inkMuted, fontSize: 13, padding: '24px 0' }}>No recent activity yet.</div>
          ) : (
            <div>
              {recentActivity.map((item, i) => (
                <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '10px 0', borderBottom: i < recentActivity.length - 1 ? `1px solid ${T.border}` : 'none' }}>
                  <div style={{
                    width: 34, height: 34, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
                    background: item.kind === 'payment'
                      ? (item.data.status === 'paid' ? T.greenLight : item.data.status === 'overdue' ? T.coralLight : T.amberLight)
                      : '#FFF4EE',
                    fontSize: 15,
                  }}>
                    {item.kind === 'payment' ? '💳' : '🔧'}
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 13, fontWeight: 600, color: T.ink, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {item.kind === 'payment'
                        ? (item.data.tenant_name || 'Unknown') + ' — $' + (item.data.amount || 0).toLocaleString()
                        : (item.data.issue || item.data.title || 'Maintenance issue')}
                    </div>
                    <div style={{ fontSize: 11, color: T.inkMuted, marginTop: 2 }}>
                      {item.kind === 'payment'
                        ? item.data.status + ' · ' + item.date
                        : (item.data.property?.split(',')[0] || '') + ' · ' + (item.data.priority || 'normal') + ' priority'}
                    </div>
                  </div>
                  <span style={{
                    fontSize: 10, fontWeight: 700, padding: '2px 8px', borderRadius: 20, flexShrink: 0, textTransform: 'uppercase',
                    background: item.kind === 'payment'
                      ? (item.data.status === 'paid' ? T.greenLight : item.data.status === 'overdue' ? T.coralLight : T.amberLight)
                      : (item.data.status === 'resolved' ? T.greenLight : '#FFF4EE'),
                    color: item.kind === 'payment'
                      ? (item.data.status === 'paid' ? T.greenDark : item.data.status === 'overdue' ? T.coral : T.amberDark)
                      : (item.data.status === 'resolved' ? T.greenDark : '#C2410C'),
                  }}>
                    {item.kind === 'payment' ? item.data.status : item.data.status || 'open'}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* AI Briefing */}
        <div style={{ background: T.navy, borderRadius: T.radius, padding: 24, boxShadow: T.shadowMd, position: 'relative', overflow: 'hidden' }}>
          <div style={{ position: 'absolute', top: -20, right: -20, width: 120, height: 120, borderRadius: '50%', background: T.teal, opacity: 0.07 }} />
          <div style={{ position: 'absolute', bottom: -30, left: -10, width: 80, height: 80, borderRadius: '50%', background: T.teal, opacity: 0.05 }} />
          <div style={{ position: 'relative' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
              <span style={{ color: T.teal, fontSize: 16 }}>✦</span>
              <div style={{ fontWeight: 700, fontSize: 15, color: '#fff' }}>AI Weekly Briefing</div>
            </div>
            <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.5)', marginBottom: 20 }}>
              Based on your live portfolio data
            </div>

            {insight ? (
              <div style={{ background: 'rgba(0,212,170,0.1)', border: `1px solid ${T.teal}33`, borderRadius: T.radiusSm, padding: 16, fontSize: 13, lineHeight: 1.8, whiteSpace: 'pre-wrap', color: 'rgba(255,255,255,0.9)', marginBottom: 16 }}>
                {insight}
              </div>
            ) : (
              <div style={{ fontSize: 13, color: 'rgba(255,255,255,0.45)', lineHeight: 1.7, marginBottom: 20 }}>
                {leases.length === 0
                  ? 'Add your leases and properties first, then get your AI briefing.'
                  : `${leases.length} leases · ${overduePayments.length} overdue · ${openMaint.length} open issues`
                }
              </div>
            )}

            <button onClick={getInsight} disabled={insightLoading}
              style={{
                background: T.teal, color: T.navy, border: 'none', borderRadius: T.radiusSm,
                padding: '10px 22px', fontSize: 13, fontWeight: 700, cursor: insightLoading ? 'default' : 'pointer',
                opacity: insightLoading ? 0.7 : 1, display: 'inline-flex', alignItems: 'center', gap: 6,
              }}>
              {insightLoading ? '✦ Thinking…' : insight ? '↺ Refresh Briefing' : '✦ Get Priorities'}
            </button>
          </div>
        </div>
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
