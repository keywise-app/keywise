'use client';
import { useState, useEffect } from 'react';

const T = {
  navy: '#0F3460', teal: '#00D4AA', tealLight: '#E0FAF5', tealDark: '#00A886',
  bg: '#F0F4FF', surface: '#fff', border: '#E0E6F0', ink: '#1A1A2E',
  inkMuted: '#8892A4', inkMid: '#4A5068', greenDark: '#00875A', greenLight: '#E8F8F0',
  coral: '#FF6B6B', coralLight: '#FFF0F0', amberDark: '#9A6500', amberLight: '#FFF8E0',
  radius: 12, radiusSm: 10, shadow: '0 1px 4px rgba(15,52,96,0.06)',
};

type Stats = {
  users: { total: number; newToday: number; newWeek: number; newMonth: number; pro: number; free: number; cancelled: number; weeklySignups: { week: string; count: number }[] };
  revenue: { totalPaid: number; totalVolume: number; totalFees: number; monthVolume: number; monthFees: number; mrr: number };
  ai: { documents: number; aiSummaries: number; leasesExtracted: number; inspections: number; totalLeases: number; invited: number };
  system: { buildings: number; units: number; activeLeases: number; pendingPayments: number; overduePayments: number };
  recentSignups: any[];
  feedback: any[];
};

function StatCard({ label, value, color }: { label: string; value: string | number; color?: string }) {
  return (
    <div style={{ background: T.surface, border: `1px solid ${T.border}`, borderRadius: T.radiusSm, padding: '14px 16px' }}>
      <div style={{ fontSize: 22, fontWeight: 700, color: color || T.navy }}>{value}</div>
      <div style={{ fontSize: 11, color: T.inkMuted, textTransform: 'uppercase', letterSpacing: '0.4px', marginTop: 2 }}>{label}</div>
    </div>
  );
}

export default function AdminPage() {
  const [password, setPassword] = useState('');
  const [authed, setAuthed] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [stats, setStats] = useState<Stats | null>(null);
  const [feedbackFilter, setFeedbackFilter] = useState<'all' | 'bug' | 'feature' | 'general'>('all');
  const [statusFilter, setStatusFilter] = useState<'all' | 'new' | 'reviewed' | 'planned' | 'done'>('all');

  useEffect(() => {
    const saved = sessionStorage.getItem('kw_admin');
    if (saved) { setPassword(saved); setAuthed(true); }
  }, []);

  useEffect(() => { if (authed) fetchStats(); }, [authed]);

  const login = async () => {
    setError('');
    setLoading(true);
    const res = await fetch('/api/admin', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ password, action: 'stats' }),
    });
    const data = await res.json();
    setLoading(false);
    if (data.error) { setError('Access denied'); return; }
    sessionStorage.setItem('kw_admin', password);
    setAuthed(true);
    setStats(data);
  };

  const fetchStats = async () => {
    setLoading(true);
    const res = await fetch('/api/admin', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ password, action: 'stats' }),
    });
    const data = await res.json();
    if (!data.error) setStats(data);
    setLoading(false);
  };

  const updateFeedback = async (id: string, status: string, admin_notes: string) => {
    await fetch('/api/admin', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ password, action: 'update_feedback', payload: { id, status, admin_notes } }),
    });
    fetchStats();
  };

  if (!authed) {
    return (
      <div style={{ minHeight: '100vh', background: T.bg, display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: "'Inter', system-ui, sans-serif" }}>
        <div style={{ background: T.surface, borderRadius: T.radius, padding: 40, width: 360, boxShadow: '0 4px 24px rgba(15,52,96,0.1)', textAlign: 'center' }}>
          <div style={{ fontSize: 24, fontWeight: 700, color: T.navy, marginBottom: 4 }}>Keywise Admin</div>
          <div style={{ fontSize: 13, color: T.inkMuted, marginBottom: 24 }}>Enter admin password to continue</div>
          <input type="password" value={password} onChange={e => setPassword(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && login()}
            placeholder="Password"
            style={{ width: '100%', padding: '12px 16px', border: `1px solid ${T.border}`, borderRadius: T.radiusSm, fontSize: 14, marginBottom: 12, outline: 'none', boxSizing: 'border-box' }} />
          {error && <div style={{ color: T.coral, fontSize: 13, marginBottom: 12 }}>{error}</div>}
          <button onClick={login} disabled={loading}
            style={{ width: '100%', padding: '12px', background: T.navy, color: '#fff', border: 'none', borderRadius: T.radiusSm, fontSize: 14, fontWeight: 600, cursor: 'pointer' }}>
            {loading ? 'Checking...' : 'Sign In'}
          </button>
        </div>
      </div>
    );
  }

  if (!stats) return <div style={{ minHeight: '100vh', background: T.bg, display: 'flex', alignItems: 'center', justifyContent: 'center', color: T.inkMuted }}>Loading dashboard...</div>;

  const maxWeekly = Math.max(...stats.users.weeklySignups.map(w => w.count), 1);
  const filteredFeedback = stats.feedback.filter(f =>
    (feedbackFilter === 'all' || f.type === feedbackFilter) &&
    (statusFilter === 'all' || f.status === statusFilter)
  );

  const FEEDBACK_ICONS: Record<string, string> = { bug: '🐛', feature: '💡', general: '💬' };
  const STATUS_COLORS: Record<string, { bg: string; color: string }> = {
    new: { bg: T.amberLight, color: T.amberDark },
    reviewed: { bg: T.bg, color: T.inkMid },
    planned: { bg: T.tealLight, color: T.tealDark },
    done: { bg: T.greenLight, color: T.greenDark },
  };

  return (
    <div style={{ minHeight: '100vh', background: T.bg, fontFamily: "'Inter', system-ui, sans-serif" }}>
      <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap" rel="stylesheet" />

      {/* Header */}
      <div style={{ background: T.navy, padding: '16px 24px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', position: 'sticky', top: 0, zIndex: 10 }}>
        <div>
          <span style={{ fontSize: 18, fontWeight: 700, color: '#fff' }}>Keywise Admin</span>
          <span style={{ fontSize: 12, color: T.teal, marginLeft: 12 }}>{new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })}</span>
        </div>
        <div style={{ display: 'flex', gap: 10 }}>
          <button onClick={fetchStats} style={{ background: 'rgba(255,255,255,0.1)', border: 'none', color: '#fff', padding: '6px 14px', borderRadius: T.radiusSm, fontSize: 12, cursor: 'pointer' }}>
            ↻ Refresh
          </button>
          <button onClick={() => { sessionStorage.removeItem('kw_admin'); setAuthed(false); setStats(null); }}
            style={{ background: 'rgba(255,255,255,0.1)', border: 'none', color: '#fff', padding: '6px 14px', borderRadius: T.radiusSm, fontSize: 12, cursor: 'pointer' }}>
            Sign Out
          </button>
        </div>
      </div>

      <div style={{ maxWidth: 1100, margin: '0 auto', padding: '24px 16px' }}>

        {/* USER GROWTH */}
        <div style={{ marginBottom: 32 }}>
          <div style={{ fontSize: 16, fontWeight: 700, color: T.navy, marginBottom: 14 }}>User Growth</div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(120px, 1fr))', gap: 10, marginBottom: 16 }}>
            <StatCard label="Total Users" value={stats.users.total} />
            <StatCard label="New Today" value={stats.users.newToday} color={T.teal} />
            <StatCard label="This Week" value={stats.users.newWeek} color={T.teal} />
            <StatCard label="This Month" value={stats.users.newMonth} color={T.teal} />
            <StatCard label="Pro Users" value={stats.users.pro} color={T.greenDark} />
            <StatCard label="Free Users" value={stats.users.free} />
            <StatCard label="Churned" value={stats.users.cancelled} color={T.coral} />
          </div>
          {/* Weekly bar chart */}
          <div style={{ background: T.surface, border: `1px solid ${T.border}`, borderRadius: T.radiusSm, padding: 16 }}>
            <div style={{ fontSize: 12, fontWeight: 600, color: T.inkMuted, marginBottom: 12 }}>Signups by Week</div>
            <div style={{ display: 'flex', alignItems: 'flex-end', gap: 8, height: 100 }}>
              {stats.users.weeklySignups.map((w, i) => (
                <div key={i} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4 }}>
                  <span style={{ fontSize: 10, fontWeight: 600, color: T.navy }}>{w.count}</span>
                  <div style={{ width: '100%', height: Math.max(4, (w.count / maxWeekly) * 80), background: T.teal, borderRadius: 4 }} />
                  <span style={{ fontSize: 9, color: T.inkMuted }}>{w.week}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* REVENUE */}
        <div style={{ marginBottom: 32 }}>
          <div style={{ fontSize: 16, fontWeight: 700, color: T.navy, marginBottom: 14 }}>Revenue</div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: 10 }}>
            <StatCard label="MRR" value={'$' + stats.revenue.mrr.toLocaleString()} color={T.greenDark} />
            <StatCard label="Total Volume" value={'$' + stats.revenue.totalVolume.toLocaleString()} />
            <StatCard label="This Month" value={'$' + stats.revenue.monthVolume.toLocaleString()} color={T.teal} />
            <StatCard label="Total Fees" value={'$' + stats.revenue.totalFees.toLocaleString()} color={T.greenDark} />
            <StatCard label="Month Fees" value={'$' + stats.revenue.monthFees.toLocaleString()} />
            <StatCard label="Payments Processed" value={stats.revenue.totalPaid} />
          </div>
        </div>

        {/* AI USAGE + SYSTEM */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20, marginBottom: 32 }}>
          <div>
            <div style={{ fontSize: 16, fontWeight: 700, color: T.navy, marginBottom: 14 }}>AI & Documents</div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
              <StatCard label="Documents" value={stats.ai.documents} />
              <StatCard label="AI Summaries" value={stats.ai.aiSummaries} color={T.teal} />
              <StatCard label="Leases Extracted" value={stats.ai.leasesExtracted} />
              <StatCard label="Inspections" value={stats.ai.inspections} />
              <StatCard label="Total Leases" value={stats.ai.totalLeases} />
              <StatCard label="Tenants Invited" value={stats.ai.invited} color={T.tealDark} />
            </div>
          </div>
          <div>
            <div style={{ fontSize: 16, fontWeight: 700, color: T.navy, marginBottom: 14 }}>System Health</div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
              <StatCard label="Buildings" value={stats.system.buildings} />
              <StatCard label="Units" value={stats.system.units} />
              <StatCard label="Active Leases" value={stats.system.activeLeases} color={T.greenDark} />
              <StatCard label="Pending Payments" value={stats.system.pendingPayments} color={T.amberDark} />
              <StatCard label="Overdue" value={stats.system.overduePayments} color={T.coral} />
            </div>
          </div>
        </div>

        {/* FEEDBACK */}
        <div style={{ marginBottom: 32 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
            <div style={{ fontSize: 16, fontWeight: 700, color: T.navy }}>User Feedback ({stats.feedback.length})</div>
            <div style={{ display: 'flex', gap: 6 }}>
              {(['all', 'bug', 'feature', 'general'] as const).map(f => (
                <button key={f} onClick={() => setFeedbackFilter(f)}
                  style={{ padding: '4px 10px', fontSize: 11, fontWeight: 600, borderRadius: 20, cursor: 'pointer', border: 'none',
                    background: feedbackFilter === f ? T.navy : T.bg, color: feedbackFilter === f ? '#fff' : T.inkMuted }}>
                  {f === 'all' ? 'All' : f === 'bug' ? '🐛 Bug' : f === 'feature' ? '💡 Feature' : '💬 General'}
                </button>
              ))}
              {(['all', 'new', 'reviewed', 'planned', 'done'] as const).map(s => (
                <button key={s} onClick={() => setStatusFilter(s)}
                  style={{ padding: '4px 10px', fontSize: 11, fontWeight: 600, borderRadius: 20, cursor: 'pointer', border: 'none',
                    background: statusFilter === s ? T.navy : T.bg, color: statusFilter === s ? '#fff' : T.inkMuted }}>
                  {s.charAt(0).toUpperCase() + s.slice(1)}
                </button>
              ))}
            </div>
          </div>
          {filteredFeedback.length === 0 ? (
            <div style={{ textAlign: 'center', padding: 32, color: T.inkMuted, fontSize: 13, background: T.surface, borderRadius: T.radiusSm, border: `1px solid ${T.border}` }}>No feedback yet</div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {filteredFeedback.map((f: any) => {
                const sc = STATUS_COLORS[f.status] || STATUS_COLORS.new;
                return (
                  <div key={f.id} style={{ background: T.surface, border: `1px solid ${T.border}`, borderRadius: T.radiusSm, padding: 14 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 12 }}>
                      <div style={{ flex: 1 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
                          <span>{FEEDBACK_ICONS[f.type] || '💬'}</span>
                          <span style={{ fontSize: 12, color: T.inkMuted }}>{f.user_email || 'Anonymous'}</span>
                          <span style={{ fontSize: 10, color: T.inkMuted }}>{new Date(f.created_at).toLocaleDateString()}</span>
                        </div>
                        <div style={{ fontSize: 13, color: T.ink, lineHeight: 1.6 }}>{f.message}</div>
                      </div>
                      <select value={f.status || 'new'} onChange={e => updateFeedback(f.id, e.target.value, f.admin_notes || '')}
                        style={{ padding: '4px 8px', fontSize: 11, fontWeight: 600, borderRadius: 6, border: `1px solid ${T.border}`, background: sc.bg, color: sc.color, cursor: 'pointer' }}>
                        <option value="new">New</option>
                        <option value="reviewed">Reviewed</option>
                        <option value="planned">Planned</option>
                        <option value="done">Done</option>
                      </select>
                    </div>
                    {f.admin_notes && (
                      <div style={{ fontSize: 12, color: T.tealDark, background: T.tealLight, borderRadius: 6, padding: '6px 10px', marginTop: 8 }}>
                        Admin: {f.admin_notes}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* RECENT SIGNUPS */}
        <div style={{ marginBottom: 32 }}>
          <div style={{ fontSize: 16, fontWeight: 700, color: T.navy, marginBottom: 14 }}>Recent Signups</div>
          <div style={{ background: T.surface, border: `1px solid ${T.border}`, borderRadius: T.radiusSm, overflow: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
              <thead>
                <tr>
                  {['Name', 'Email', 'Signed Up', 'Plan'].map(h => (
                    <th key={h} style={{ textAlign: 'left', padding: '10px 14px', fontSize: 11, fontWeight: 700, color: T.inkMuted, textTransform: 'uppercase', letterSpacing: '0.4px', borderBottom: `1px solid ${T.border}` }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {stats.recentSignups.map((u: any) => (
                  <tr key={u.id} style={{ borderBottom: `1px solid ${T.border}` }}>
                    <td style={{ padding: '10px 14px', fontWeight: 600, color: T.ink }}>{u.full_name || '—'}</td>
                    <td style={{ padding: '10px 14px', color: T.inkMid }}>{u.email || '—'}</td>
                    <td style={{ padding: '10px 14px', color: T.inkMuted }}>{u.created_at ? new Date(u.created_at).toLocaleDateString() : '—'}</td>
                    <td style={{ padding: '10px 14px' }}>
                      <span style={{ fontSize: 10, fontWeight: 700, padding: '2px 8px', borderRadius: 20,
                        background: u.subscription_status === 'active' ? T.greenLight : u.subscription_status === 'cancelled' ? T.coralLight : T.bg,
                        color: u.subscription_status === 'active' ? T.greenDark : u.subscription_status === 'cancelled' ? T.coral : T.inkMuted,
                        textTransform: 'capitalize' }}>
                        {u.subscription_status || 'free'}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
