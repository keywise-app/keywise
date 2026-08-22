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
  users: { total: number; newToday: number; newWeek: number; newMonth: number; trial: number; active: number; cancelled: number };
  trialPipeline: { name: string | null; email: string; created_at: string; trial_ends_at: string | null; daysLeft: number | null }[];
  revenue: { mrr: number; unclassifiedActive: number; rentVolumeTotal: number; rentVolumeMonth: number; platformFeesTotal: number; platformFeesMonth: number; paymentsCompleted: number };
  traffic: { today: number; week: number; byDay: Record<string, number>; topRefs: [string, number][]; funnelViewsToday: number; funnelViewsWeek: number };
  product: { documents: number; inspectionsCompleted: number; totalLeases: number; buildings: number; units: number; activeLeases: number; pendingRentPayments: number; overdueRentPayments: number };
  feedback: any[];
};

function StatCard({ label, value, color, sub }: { label: string; value: string | number; color?: string; sub?: string }) {
  return (
    <div style={{ background: T.surface, border: `1px solid ${T.border}`, borderRadius: T.radiusSm, padding: '14px 16px' }}>
      <div style={{ fontSize: 22, fontWeight: 700, color: color || T.navy }}>{value}</div>
      <div style={{ fontSize: 11, color: T.inkMuted, textTransform: 'uppercase', letterSpacing: '0.4px', marginTop: 2 }}>{label}</div>
      {sub && <div style={{ fontSize: 11, color: T.inkMuted, marginTop: 4 }}>{sub}</div>}
    </div>
  );
}

function SectionHeader({ children }: { children: React.ReactNode }) {
  return <div style={{ fontSize: 15, fontWeight: 700, color: T.navy, marginBottom: 14 }}>{children}</div>;
}

export default function AdminPage() {
  const [password, setPassword] = useState('');
  const [authed, setAuthed] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [stats, setStats] = useState<Stats | null>(null);
  const [feedbackFilter, setFeedbackFilter] = useState<'all' | 'bug' | 'feature' | 'general'>('all');
  const [statusFilter, setStatusFilter] = useState<'all' | 'new' | 'reviewed' | 'planned' | 'done'>('all');
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth < 768);
    check();
    window.addEventListener('resize', check);
    return () => window.removeEventListener('resize', check);
  }, []);

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
    // Also drop a cookie so proxy.ts can gate /admin/agents/* and /api/agents/*
    // server-side (sessionStorage is browser-only and doesn't reach the server).
    document.cookie = `kw_admin=${encodeURIComponent(password)}; path=/; max-age=${7 * 24 * 60 * 60}; samesite=lax${typeof window !== 'undefined' && window.location.protocol === 'https:' ? '; secure' : ''}`;
    setAuthed(true);
    setStats(data);
  };

  const fetchStats = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/admin', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password, action: 'stats' }),
      });
      const data = await res.json();
      if (!data.error) setStats(data);
    } catch (err) {
      console.error('[admin] Refresh error:', err);
    } finally {
      setLoading(false);
    }
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
      <div style={{ background: T.navy, padding: isMobile ? '12px 16px' : '16px 24px', display: 'flex', justifyContent: 'space-between', alignItems: isMobile ? 'flex-start' : 'center', flexDirection: isMobile ? 'column' : 'row', gap: isMobile ? 8 : 0, position: 'sticky', top: 0, zIndex: 10 }}>
        <div>
          <span style={{ fontSize: isMobile ? 16 : 18, fontWeight: 700, color: '#fff' }}>Keywise Admin</span>
          {!isMobile && <span style={{ fontSize: 12, color: T.teal, marginLeft: 12 }}>{new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })}</span>}
        </div>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          <a href="/admin/tools"
            style={{ background: 'rgba(255,255,255,0.1)', color: '#fff', padding: '6px 12px', borderRadius: T.radiusSm, fontSize: 11, fontWeight: 700, textDecoration: 'none', minHeight: 36, display: 'inline-flex', alignItems: 'center' }}>
            🛠 Tools
          </a>
          <a href="/admin/agents"
            style={{ background: T.teal, color: T.navy, padding: '6px 12px', borderRadius: T.radiusSm, fontSize: 11, fontWeight: 700, textDecoration: 'none', minHeight: 36, display: 'inline-flex', alignItems: 'center' }}>
            🤖 Agents →
          </a>
          <button onClick={fetchStats} disabled={loading} style={{ background: 'rgba(255,255,255,0.1)', border: 'none', color: '#fff', padding: '6px 12px', borderRadius: T.radiusSm, fontSize: 11, cursor: loading ? 'default' : 'pointer', minHeight: 36, opacity: loading ? 0.6 : 1, fontFamily: 'inherit' }}>
            {loading ? '⟳ Refreshing...' : '↻ Refresh'}
          </button>
          <button onClick={() => { sessionStorage.removeItem('kw_admin'); document.cookie = 'kw_admin=; path=/; max-age=0'; setAuthed(false); setStats(null); }}
            style={{ background: 'rgba(255,255,255,0.1)', border: 'none', color: '#fff', padding: '6px 12px', borderRadius: T.radiusSm, fontSize: 11, cursor: 'pointer', minHeight: 36 }}>
            Sign Out
          </button>
        </div>
      </div>

      <div style={{ maxWidth: 1000, margin: '0 auto', padding: '24px 16px' }}>

        {/* USERS & TRIAL PIPELINE */}
        <div style={{ marginBottom: 32 }}>
          <SectionHeader>Customers</SectionHeader>
          <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr 1fr' : 'repeat(auto-fit, minmax(120px, 1fr))', gap: 10, marginBottom: 16 }}>
            <StatCard label="Total Signups" value={stats.users.total} />
            <StatCard label="New This Week" value={stats.users.newWeek} color={T.teal} />
            <StatCard label="In Trial" value={stats.users.trial} color={T.amberDark} />
            <StatCard label="Paying" value={stats.users.active} color={T.greenDark} />
            <StatCard label="Churned" value={stats.users.cancelled} color={T.coral} />
          </div>

          <div style={{ background: T.surface, border: `1px solid ${T.border}`, borderRadius: T.radiusSm, padding: 16 }}>
            <div style={{ fontSize: 12, fontWeight: 600, color: T.inkMuted, marginBottom: 12 }}>Trial Pipeline — who's about to decide</div>
            {stats.trialPipeline.length === 0 ? (
              <div style={{ fontSize: 13, color: T.inkMuted, textAlign: 'center', padding: 12 }}>No one currently in trial.</div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                {stats.trialPipeline.map((t) => (
                  <div key={t.email} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 0', borderBottom: `1px solid ${T.border}`, fontSize: 13 }}>
                    <div>
                      <div style={{ fontWeight: 600, color: T.ink }}>{t.name || t.email}</div>
                      {t.name && <div style={{ fontSize: 11, color: T.inkMuted }}>{t.email}</div>}
                    </div>
                    <span style={{
                      fontSize: 11, fontWeight: 700, padding: '3px 10px', borderRadius: 20,
                      background: t.daysLeft === null ? T.bg : t.daysLeft <= 2 ? T.coralLight : t.daysLeft <= 7 ? T.amberLight : T.tealLight,
                      color: t.daysLeft === null ? T.inkMuted : t.daysLeft <= 2 ? T.coral : t.daysLeft <= 7 ? T.amberDark : T.tealDark,
                    }}>
                      {t.daysLeft === null ? 'no trial end set' : t.daysLeft < 0 ? 'trial ended' : `${t.daysLeft}d left`}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* REVENUE */}
        <div style={{ marginBottom: 32 }}>
          <SectionHeader>Revenue</SectionHeader>
          <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr 1fr' : 'repeat(auto-fit, minmax(150px, 1fr))', gap: 10 }}>
            <StatCard label="MRR (Keywise Pro)" value={'$' + stats.revenue.mrr.toLocaleString()} color={T.greenDark}
              sub={stats.revenue.unclassifiedActive > 0 ? `${stats.revenue.unclassifiedActive} active w/ unknown tier` : undefined} />
            <StatCard label="Platform Fees (total)" value={'$' + stats.revenue.platformFeesTotal.toLocaleString()} color={T.greenDark} />
            <StatCard label="Platform Fees (mo.)" value={'$' + stats.revenue.platformFeesMonth.toLocaleString()} />
          </div>
          <div style={{ fontSize: 11, color: T.inkMuted, marginTop: 10, marginBottom: 10 }}>
            Rent payment volume flowing through landlord accounts (not Keywise revenue):
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr 1fr' : 'repeat(auto-fit, minmax(150px, 1fr))', gap: 10 }}>
            <StatCard label="Rent Volume (total)" value={'$' + stats.revenue.rentVolumeTotal.toLocaleString()} />
            <StatCard label="Rent Volume (mo.)" value={'$' + stats.revenue.rentVolumeMonth.toLocaleString()} />
            <StatCard label="Rent Payments Completed" value={stats.revenue.paymentsCompleted} />
          </div>
        </div>

        {/* TRAFFIC */}
        <div style={{ marginBottom: 32 }}>
          <SectionHeader>Site Traffic <span style={{ fontWeight: 400, fontSize: 11, color: T.inkMuted, textTransform: 'none' }}>(bot/crawler traffic filtered out)</span></SectionHeader>
          <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr 1fr' : 'repeat(4, 1fr)', gap: 10, marginBottom: 16 }}>
            <StatCard label="Today" value={stats.traffic.today} color={T.teal} />
            <StatCard label="This Week" value={stats.traffic.week} />
            <StatCard label="Funnel Views Today" value={stats.traffic.funnelViewsToday} color={T.tealDark} sub="calculator + eviction tool + compliance" />
            <StatCard label="Funnel Views (wk)" value={stats.traffic.funnelViewsWeek} sub="calculator + eviction tool + compliance" />
          </div>
          <div style={{ background: T.surface, border: `1px solid ${T.border}`, borderRadius: T.radiusSm, padding: 16, marginBottom: 16 }}>
            <div style={{ fontSize: 12, fontWeight: 600, color: T.inkMuted, marginBottom: 12 }}>Visits by Day</div>
            <div style={{ display: 'flex', alignItems: 'flex-end', gap: 8, height: 80 }}>
              {(() => {
                const days: [string, number][] = [];
                for (let i = 6; i >= 0; i--) {
                  const d = new Date(Date.now() - i * 86400000).toISOString().split('T')[0];
                  days.push([d, stats.traffic.byDay[d] || 0]);
                }
                const max = Math.max(...days.map(d => d[1]), 1);
                return days.map(([d, c]) => (
                  <div key={d} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4 }}>
                    <span style={{ fontSize: 10, fontWeight: 600, color: T.navy }}>{c}</span>
                    <div style={{ width: '100%', height: Math.max(4, (c / max) * 60), background: T.teal, borderRadius: 4 }} />
                    <span style={{ fontSize: 9, color: T.inkMuted }}>{d.slice(5)}</span>
                  </div>
                ));
              })()}
            </div>
          </div>
          {stats.traffic.topRefs.length > 0 && (
            <div style={{ background: T.surface, border: `1px solid ${T.border}`, borderRadius: T.radiusSm, padding: 16 }}>
              <div style={{ fontSize: 12, fontWeight: 600, color: T.inkMuted, marginBottom: 10 }}>Top Referrers (7 days)</div>
              {stats.traffic.topRefs.map(([ref, count]) => (
                <div key={ref} style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 0', borderBottom: `1px solid ${T.border}`, fontSize: 13 }}>
                  <span style={{ color: T.ink, fontWeight: 500 }}>{ref}</span>
                  <span style={{ color: T.navy, fontWeight: 700 }}>{count}</span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* PRODUCT USAGE */}
        <div style={{ marginBottom: 32 }}>
          <SectionHeader>Product Usage</SectionHeader>
          <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr 1fr' : 'repeat(auto-fit, minmax(120px, 1fr))', gap: 10 }}>
            <StatCard label="Buildings" value={stats.product.buildings} />
            <StatCard label="Units" value={stats.product.units} />
            <StatCard label="Active Leases" value={stats.product.activeLeases} color={T.greenDark} />
            <StatCard label="Documents" value={stats.product.documents} />
            <StatCard label="Inspections Done" value={stats.product.inspectionsCompleted} />
            <StatCard label="Pending Rent" value={stats.product.pendingRentPayments} color={T.amberDark} />
            <StatCard label="Overdue Rent" value={stats.product.overdueRentPayments} color={T.coral} />
          </div>
        </div>

        {/* FEEDBACK */}
        <div style={{ marginBottom: 32 }}>
          <div style={{ marginBottom: 14 }}>
            <div style={{ fontSize: 15, fontWeight: 700, color: T.navy, marginBottom: isMobile ? 10 : 0 }}>User Feedback ({stats.feedback.length})</div>
            <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginTop: 8 }}>
              {(['all', 'bug', 'feature', 'general'] as const).map(f => (
                <button key={f} onClick={() => setFeedbackFilter(f)}
                  style={{ padding: isMobile ? '6px 12px' : '4px 10px', fontSize: 11, fontWeight: 600, borderRadius: 20, cursor: 'pointer', border: 'none', minHeight: isMobile ? 36 : 'auto',
                    background: feedbackFilter === f ? T.navy : T.bg, color: feedbackFilter === f ? '#fff' : T.inkMuted }}>
                  {f === 'all' ? 'All' : f === 'bug' ? '🐛 Bug' : f === 'feature' ? '💡 Feature' : '💬 General'}
                </button>
              ))}
              {(['all', 'new', 'reviewed', 'planned', 'done'] as const).map(s => (
                <button key={s} onClick={() => setStatusFilter(s)}
                  style={{ padding: isMobile ? '6px 12px' : '4px 10px', fontSize: 11, fontWeight: 600, borderRadius: 20, cursor: 'pointer', border: 'none', minHeight: isMobile ? 36 : 'auto',
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
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6, flexWrap: 'wrap' }}>
                          <span>{FEEDBACK_ICONS[f.type] || '💬'}</span>
                          {!isMobile && <span style={{ fontSize: 12, color: T.inkMuted }}>{f.user_email || 'Anonymous'}</span>}
                          {!isMobile && <span style={{ fontSize: 10, color: T.inkMuted }}>{new Date(f.created_at).toLocaleDateString()}</span>}
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
      </div>
    </div>
  );
}
