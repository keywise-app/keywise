'use client';
import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { supabase } from './lib/supabase';
import { T } from './lib/theme';
import Auth from './components/Auth';
import Dashboard from './components/Dashboard';
import Portfolio from './components/Portfolio';
import Tenants from './components/Tenants';
import Operations from './components/Operations';
import Profile from './components/Profile';
import Onboarding from './components/Onboarding';
import TenantDashboard from './components/TenantDashboard';
import Landing from './components/Landing';
import TrialBanner from './components/TrialBanner';

const NAV = [
  { id: 'dashboard', label: 'Dashboard', icon: '⊞' },
  { id: 'portfolio', label: 'Portfolio', icon: '⌂' },
  { id: 'tenants', label: 'Tenants', icon: '◈' },
  { id: 'operations', label: 'Operations', icon: '⚙' },
  { id: 'settings', label: 'Settings', icon: '○' },
];

const PAGE_TITLES: Record<string, string> = {
  dashboard: 'Dashboard',
  portfolio: 'Portfolio',
  tenants: 'Tenants',
  operations: 'Operations',
  settings: 'Settings',
};

function KeywiseLogo({ size = 32 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 32 32" fill="none">
      <rect width="32" height="32" rx="8" fill={T.navy} />
      <circle cx="13" cy="16" r="5.5" fill="none" stroke={T.teal} strokeWidth="2.5" />
      <circle cx="13" cy="16" r="2" fill={T.teal} />
      <rect x="17.5" y="14.75" width="8" height="2.5" rx="1.25" fill={T.teal} />
      <rect x="22" y="17.25" width="4" height="2" rx="1" fill={T.teal} />
      <rect x="19" y="17.25" width="2.5" height="2" rx="1" fill={T.teal} />
    </svg>
  );
}

export default function Home() {
  const [session, setSession] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState('dashboard');
  const [showOnboarding, setShowOnboarding] = useState(false);
  const [stripeSuccess, setStripeSuccess] = useState(false);
  const [userRole, setUserRole] = useState<string | null>(null);
  const [previewLeaseId, setPreviewLeaseId] = useState<string | null>(null);
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<{ category: string; icon: string; items: { label: string; sub: string; page: string }[] }[]>([]);
  const [searchLoading, setSearchLoading] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const [subscriptionStatus, setSubscriptionStatus] = useState<string | null>(null);
  const [trialEndsAt, setTrialEndsAt] = useState<string | null>(null);
  const [showUpgradedBanner, setShowUpgradedBanner] = useState(false);
  const [showPaymentBanner, setShowPaymentBanner] = useState(false);
  const [showFeedback, setShowFeedback] = useState(false);
  const [feedbackType, setFeedbackType] = useState<'bug' | 'feature' | 'general'>('general');
  const [feedbackMsg, setFeedbackMsg] = useState('');
  const [feedbackSending, setFeedbackSending] = useState(false);
  const [feedbackSent, setFeedbackSent] = useState(false);

  // ── Notifications bell ──
  const [notifOpen, setNotifOpen] = useState(false);
  const [notifications, setNotifications] = useState<{ id: string; icon: string; type: string; msg: string; page: string }[]>([]);
  const [readIds, setReadIds] = useState<Set<string>>(new Set());
  const notifRef = useRef<HTMLDivElement>(null);

  // ── Quick Actions FAB ──
  const [fabOpen, setFabOpen] = useState(false);
  const [openWizardOnTenants, setOpenWizardOnTenants] = useState(false);
  const fabRef = useRef<HTMLDivElement>(null);

  const searchInputRef = useRef<HTMLInputElement>(null);
  const searchDebounce = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth < 768);
    check();
    window.addEventListener('resize', check);
    return () => window.removeEventListener('resize', check);
  }, []);

  // Allow child components to navigate via custom event
  useEffect(() => {
    const handler = (e: Event) => setPage((e as CustomEvent).detail);
    window.addEventListener('kw:navigate', handler);
    return () => window.removeEventListener('kw:navigate', handler);
  }, []);

  // Load read IDs from localStorage on mount
  useEffect(() => {
    const stored = localStorage.getItem('kw_notif_read');
    if (stored) { try { setReadIds(new Set(JSON.parse(stored))); } catch { /* ignore */ } }
  }, []);

  const fetchNotifications = useCallback(async () => {
    const now = new Date();
    const today = now.toISOString().slice(0, 10);
    const in3Days = new Date(now.getTime() + 3 * 86400000).toISOString().slice(0, 10);
    const in60Days = new Date(now.getTime() + 60 * 86400000).toISOString().slice(0, 10);
    const sevenDaysAgo = new Date(now.getTime() - 7 * 86400000).toISOString().slice(0, 10);

    const [payRes, leaseRes, maintRes] = await Promise.all([
      supabase.from('payments').select('id,tenant_name,amount,due_date,status')
        .or(`status.eq.overdue,and(status.eq.pending,due_date.lte.${in3Days},due_date.gte.${today})`).limit(15),
      supabase.from('leases').select('id,tenant_name,end_date')
        .lte('end_date', in60Days).gte('end_date', today).limit(10),
      supabase.from('maintenance').select('id,issue,created_at')
        .neq('status', 'resolved').lte('created_at', sevenDaysAgo + 'T23:59:59').limit(10),
    ]);

    const notifs: { id: string; icon: string; type: string; msg: string; page: string }[] = [];
    payRes.data?.forEach(p => {
      const daysUntil = Math.ceil((new Date(p.due_date).getTime() - now.getTime()) / 86400000);
      notifs.push({ id: `pay_${p.id}`, icon: p.status === 'overdue' ? '⚠' : '💳', type: p.status === 'overdue' ? 'danger' : 'warning', msg: p.status === 'overdue' ? `${p.tenant_name} — $${(p.amount||0).toLocaleString()} overdue` : `${p.tenant_name} — $${(p.amount||0).toLocaleString()} due in ${daysUntil}d`, page: 'tenants' });
    });
    leaseRes.data?.forEach(l => {
      const days = Math.ceil((new Date(l.end_date).getTime() - now.getTime()) / 86400000);
      notifs.push({ id: `lease_${l.id}`, icon: '📅', type: 'warning', msg: `${l.tenant_name}'s lease expires in ${days} days`, page: 'tenants' });
    });
    maintRes.data?.forEach(m => {
      const daysOpen = Math.floor((now.getTime() - new Date(m.created_at).getTime()) / 86400000);
      notifs.push({ id: `maint_${m.id}`, icon: '🔧', type: 'info', msg: `${m.issue || 'Maintenance issue'} — open ${daysOpen}d`, page: 'operations' });
    });

    const order: Record<string, number> = { danger: 0, warning: 1, info: 2 };
    notifs.sort((a, b) => (order[a.type] ?? 3) - (order[b.type] ?? 3));
    setNotifications(notifs);
  }, []);

  useEffect(() => {
    fetchNotifications();
    const iv = setInterval(fetchNotifications, 5 * 60 * 1000);
    return () => clearInterval(iv);
  }, [fetchNotifications]);

  // Close notification panel on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => { if (notifRef.current && !notifRef.current.contains(e.target as Node)) setNotifOpen(false); };
    if (notifOpen) document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [notifOpen]);

  // Close FAB on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => { if (fabRef.current && !fabRef.current.contains(e.target as Node)) setFabOpen(false); };
    if (fabOpen) document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [fabOpen]);

  const unreadCount = useMemo(() => notifications.filter(n => !readIds.has(n.id)).length, [notifications, readIds]);

  const markAllRead = () => {
    const all = new Set(notifications.map(n => n.id));
    setReadIds(all);
    localStorage.setItem('kw_notif_read', JSON.stringify([...all]));
  };

  const notifTypeColor = (type: string) => type === 'danger' ? { color: '#C2410C', bg: '#FFF4EE' } : type === 'warning' ? { color: '#9A6500', bg: '#FFF8E0' } : { color: '#4A5068', bg: '#F0F4FF' };

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') { e.preventDefault(); openSearch(); }
      if (e.key === 'Escape') closeSearch();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get('page') === 'settings') setPage('settings');
    if (params.get('stripe') === 'connected') {
      setStripeSuccess(true);
      setTimeout(() => setStripeSuccess(false), 5000);
      const accountId = params.get('account_id');
      if (accountId) {
        supabase.auth.getUser().then(({ data: { user } }) => {
          if (user) {
            supabase.from('profiles')
              .upsert({ id: user.id, stripe_account_id: accountId }, { onConflict: 'id' })
              .then(({ error }) => {
                if (error) console.error('Client-side stripe_account_id save failed:', error.message);
                else console.log('Client-side stripe_account_id saved:', accountId);
              });
          }
        });
      }
    }
    if (params.get('tenant_preview') === 'true' && params.get('lease_id')) {
      setPreviewLeaseId(params.get('lease_id'));
    }
    if (params.get('upgraded') === 'true') {
      setShowUpgradedBanner(true);
      setTimeout(() => setShowUpgradedBanner(false), 5000);
    }
    if (params.get('payment_success') === 'true') {
      const leaseId = params.get('lease_id');
      const dueDate = params.get('due_date');
      if (leaseId) {
        // Mark the matching pending payment as paid
        const query = supabase
          .from('payments')
          .update({ status: 'paid', paid_date: new Date().toISOString().split('T')[0], method: 'Online (Stripe)' })
          .eq('lease_id', leaseId)
          .eq('status', 'pending');
        if (dueDate) query.eq('due_date', dueDate);
        query.then(async ({ error }) => {
          if (error) { console.error('[payment_success] update error:', error); return; }
          console.log('[payment_success] Marked payment as paid');

          try {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) return;
            const [{ data: prof }, { data: pmt }, { data: lease }] = await Promise.all([
              supabase.from('profiles').select('email, full_name, notify_payment').eq('id', user.id).single(),
              supabase.from('payments').select('*').eq('lease_id', leaseId).eq('status', 'paid').order('paid_date', { ascending: false }).limit(1).single(),
              supabase.from('leases').select('*').eq('id', leaseId).single(),
            ]);
            if (!pmt) return;
            const today = new Date().toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });
            const amt = (pmt.amount || 0).toLocaleString();
            const ref = (pmt.id || '').slice(0, 8).toUpperCase();
            const prop = pmt.property || '';
            const tenant = pmt.tenant_name || '';

            // Send landlord notification
            if (prof?.email && prof.notify_payment !== false) {
              fetch('/api/send-email', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                  to: prof.email,
                  subject: `Payment received — ${tenant}`,
                  from_name: 'Keywise',
                  html: `<html><body style="font-family:Arial,sans-serif;background:#F0F4FF;padding:40px 20px;"><div style="max-width:500px;margin:0 auto;background:white;border-radius:12px;padding:32px;"><div style="color:#0F3460;font-size:20px;font-weight:700;margin-bottom:4px;">Keywise</div><div style="color:#00D4AA;font-size:11px;letter-spacing:1px;text-transform:uppercase;margin-bottom:24px;">Property AI</div><div style="background:#E8F8F0;border-radius:10px;padding:20px;text-align:center;margin-bottom:24px;"><div style="font-size:28px;margin-bottom:6px;">&#10003;</div><div style="font-size:20px;font-weight:700;color:#0F7040;">Payment Received</div><div style="font-size:26px;font-weight:700;color:#0F3460;margin-top:8px;">$${amt}</div></div><table style="width:100%;font-size:13px;color:#4A5068;"><tr><td style="padding:8px 0;border-bottom:1px solid #E0E6F0;">Tenant</td><td style="text-align:right;font-weight:600;color:#1A1A2E;">${tenant}</td></tr><tr><td style="padding:8px 0;border-bottom:1px solid #E0E6F0;">Property</td><td style="text-align:right;font-weight:600;color:#1A1A2E;">${prop}</td></tr><tr><td style="padding:8px 0;border-bottom:1px solid #E0E6F0;">Date</td><td style="text-align:right;font-weight:600;color:#1A1A2E;">${today}</td></tr><tr><td style="padding:8px 0;">Method</td><td style="text-align:right;font-weight:600;color:#1A1A2E;">Online (Stripe)</td></tr></table><div style="text-align:center;margin-top:24px;"><a href="https://keywise.app" style="background:#0F3460;color:white;padding:12px 28px;border-radius:8px;text-decoration:none;font-weight:600;font-size:14px;">View Dashboard &rarr;</a></div><p style="color:#8892A4;font-size:12px;text-align:center;margin-top:24px;">Powered by Keywise &middot; keywise.app</p></div></body></html>`,
                }),
              });
            }

            // Send tenant receipt
            if (lease?.email) {
              fetch('/api/send-email', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                  to: lease.email,
                  subject: `Payment Receipt — $${amt} for ${prop}`,
                  from_name: 'Keywise',
                  html: `<html><body style="font-family:Arial,sans-serif;background:#F0F4FF;padding:40px 20px;"><div style="max-width:500px;margin:0 auto;background:white;border-radius:12px;padding:32px;"><div style="color:#0F3460;font-size:20px;font-weight:700;margin-bottom:4px;">Keywise</div><div style="color:#00D4AA;font-size:11px;letter-spacing:1px;text-transform:uppercase;margin-bottom:24px;">Property AI</div><div style="background:#E8F8F0;border-radius:10px;padding:20px;text-align:center;margin-bottom:24px;"><div style="font-size:28px;margin-bottom:6px;">&#10003;</div><div style="font-size:20px;font-weight:700;color:#0F7040;">Payment Confirmed</div><div style="font-size:26px;font-weight:700;color:#0F3460;margin-top:8px;">$${amt}</div></div><p style="color:#4A5068;font-size:14px;margin-bottom:20px;">Hi ${lease.tenant_name || 'there'}, your payment has been received. Here is your receipt.</p><table style="width:100%;font-size:13px;color:#4A5068;"><tr><td style="padding:8px 0;border-bottom:1px solid #E0E6F0;">Property</td><td style="text-align:right;font-weight:600;color:#1A1A2E;">${prop}</td></tr><tr><td style="padding:8px 0;border-bottom:1px solid #E0E6F0;">Amount Paid</td><td style="text-align:right;font-weight:600;color:#1A1A2E;">$${amt}</td></tr><tr><td style="padding:8px 0;border-bottom:1px solid #E0E6F0;">Date</td><td style="text-align:right;font-weight:600;color:#1A1A2E;">${today}</td></tr><tr><td style="padding:8px 0;border-bottom:1px solid #E0E6F0;">Method</td><td style="text-align:right;font-weight:600;color:#1A1A2E;">Online (Stripe)</td></tr><tr><td style="padding:8px 0;">Reference</td><td style="text-align:right;font-weight:600;color:#1A1A2E;">${ref}</td></tr></table><p style="color:#8892A4;font-size:12px;text-align:center;margin-top:24px;">Keep this email as your payment confirmation.<br/>Powered by Keywise &middot; keywise.app</p></div></body></html>`,
                }),
              });
            }
          } catch (e) {
            console.error('[payment_success] email error:', e);
          }
        });
      }
      setShowPaymentBanner(true);
      setPage('tenants');
      setTimeout(() => setShowPaymentBanner(false), 5000);
    }
    if (params.has('page') || params.has('stripe') || params.has('tenant_preview') || params.has('upgraded') || params.has('payment_success')) {
      window.history.replaceState({}, '', '/');
    }
  }, []);

  useEffect(() => {
    // Clean auth hash fragments from URL (left by Supabase redirects)
    if (window.location.hash && window.location.hash.includes('access_token')) {
      window.history.replaceState({}, '', window.location.pathname);
    }

    supabase.auth.getSession().then(async ({ data: { session } }) => {
      setSession(session);
      if (session) {
        // Only treat as tenant flow if explicitly ?tenant=true AND not from a password reset
        const params = new URLSearchParams(window.location.search);
        const isTenantFlow = params.get('tenant') === 'true';
        if (isTenantFlow) window.history.replaceState({}, '', '/');

        const linkLeaseByEmail = async () => {
          // Link this user's ID to their lease by email — but never link leases
          // that this user owns as a landlord (user_id = this user)
          await supabase
            .from('leases')
            .update({ tenant_user_id: session.user.id })
            .eq('email', session.user.email)
            .neq('user_id', session.user.id)
            .is('tenant_user_id', null);
        };

        // Always fetch profile first — role is the source of truth
        const { data: profile } = await supabase
          .from('profiles').select('full_name, role, subscription_status, trial_ends_at').eq('id', session.user.id).single();
        if (profile?.subscription_status) setSubscriptionStatus(profile.subscription_status);
        if (profile?.trial_ends_at) setTrialEndsAt(profile.trial_ends_at);

        if (isTenantFlow && profile?.role !== 'landlord') {
          // First-time tenant login via magic link — only if not already a landlord
          await supabase.from('profiles').upsert(
            { id: session.user.id, email: session.user.email, role: 'tenant' },
            { onConflict: 'id' }
          );
          await linkLeaseByEmail();
          setUserRole('tenant');
        } else if (profile?.role === 'tenant') {
          // Returning tenant — attempt to link in case it wasn't set yet
          await linkLeaseByEmail();
          setUserRole('tenant');
        } else {
          // landlord, null, or isTenantFlow but user is already a landlord
          setUserRole('landlord');
          if (!profile?.full_name) setShowOnboarding(true);
        }
      }
      setLoading(false);
    });
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
    });
    return () => subscription.unsubscribe();
  }, []);

  const openSearch = () => {
    setSearchOpen(true);
    setSearchQuery('');
    setSearchResults([]);
    setTimeout(() => searchInputRef.current?.focus(), 40);
  };

  const closeSearch = () => {
    setSearchOpen(false);
    setSearchQuery('');
    setSearchResults([]);
  };

  const runSearch = useCallback(async (q: string) => {
    if (q.trim().length < 2) { setSearchResults([]); setSearchLoading(false); return; }
    setSearchLoading(true);
    const like = `%${q}%`;
    const [lRes, pRes, mRes, dRes] = await Promise.all([
      supabase.from('leases').select('tenant_name, property').or(`tenant_name.ilike.${like},property.ilike.${like}`).limit(5),
      supabase.from('payments').select('tenant_name, status, amount').or(`tenant_name.ilike.${like},status.ilike.${like}`).limit(5),
      supabase.from('maintenance').select('issue, property, status').or(`issue.ilike.${like},property.ilike.${like}`).limit(5),
      supabase.from('documents').select('name, type, summary').or(`name.ilike.${like},type.ilike.${like},summary.ilike.${like}`).limit(5),
    ]);
    const groups: { category: string; icon: string; items: { label: string; sub: string; page: string }[] }[] = [];
    if (lRes.data?.length) groups.push({ category: 'Tenants', icon: '◈', items: lRes.data.map(r => ({ label: r.tenant_name || '—', sub: r.property || '', page: 'tenants' })) });
    if (pRes.data?.length) groups.push({ category: 'Payments', icon: '💳', items: pRes.data.map(r => ({ label: r.tenant_name || '—', sub: r.status + (r.amount ? ' · $' + r.amount.toLocaleString() : ''), page: 'tenants' })) });
    if (mRes.data?.length) groups.push({ category: 'Maintenance', icon: '🔧', items: mRes.data.map(r => ({ label: r.issue || 'Issue', sub: (r.property?.split(',')[0] || '') + (r.status ? ' · ' + r.status : ''), page: 'operations' })) });
    if (dRes.data?.length) groups.push({ category: 'Documents', icon: '📋', items: dRes.data.map(r => ({ label: r.name || 'Document', sub: r.type || '', page: 'operations' })) });
    setSearchResults(groups);
    setSearchLoading(false);
  }, []);

  const handleSearchInput = (q: string) => {
    setSearchQuery(q);
    if (searchDebounce.current) clearTimeout(searchDebounce.current);
    searchDebounce.current = setTimeout(() => runSearch(q), 280);
  };

  const navigateToResult = (targetPage: string) => {
    setPage(targetPage);
    closeSearch();
  };

  const renderPage = () => {
    switch (page) {
      case 'dashboard': return <Dashboard onNavigate={setPage} />;
      case 'portfolio': return <Portfolio />;
      case 'tenants': return <Tenants autoOpenWizard={openWizardOnTenants} onWizardOpen={() => setOpenWizardOnTenants(false)} />;
      case 'operations': return <Operations />;
      case 'settings': return <Profile onImport={() => setShowOnboarding(true)} />;
      default: return <Dashboard onNavigate={setPage} />;
    }
  };

  if (loading) return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '100vh', background: T.bg }}>
      <div style={{ textAlign: 'center' }}>
        <KeywiseLogo size={40} />
        <p style={{ color: T.inkMuted, fontSize: 13, marginTop: 16 }}>Loading…</p>
      </div>
    </div>
  );

  if (!session) return <Landing />;
  if (session && previewLeaseId) return <TenantDashboard previewLeaseId={previewLeaseId} />;
  if (session && userRole === 'tenant') return <TenantDashboard />;
  if (showOnboarding) return <Onboarding onComplete={() => setShowOnboarding(false)} />;

  return (
    <div style={{ fontFamily: "'Inter', system-ui, sans-serif", background: T.bg, color: T.ink, minHeight: '100vh', display: 'flex' }}>
      <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap" rel="stylesheet" />
      <style>{`* { box-sizing: border-box; } body { margin: 0; } button, input, select, textarea { font-family: inherit; }`}</style>

      {/* Sidebar — desktop only */}
      {!isMobile && (
        <div style={{ width: 200, background: T.navy, display: 'flex', flexDirection: 'column', flexShrink: 0, position: 'relative' }}>
          <div style={{ position: 'absolute', inset: 0, opacity: 0.04, backgroundImage: 'radial-gradient(circle, #fff 1px, transparent 1px)', backgroundSize: '20px 20px', pointerEvents: 'none' }} />
          <div style={{ padding: '22px 20px 18px', borderBottom: `1px solid rgba(255,255,255,0.08)`, position: 'relative' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <KeywiseLogo size={28} />
              <div>
                <div style={{ fontSize: 17, fontWeight: 700, color: '#fff', letterSpacing: '-0.3px' }}>Keywise</div>
                <div style={{ fontSize: 9, color: T.teal, letterSpacing: '1.5px', textTransform: 'uppercase', marginTop: 1 }}>Property AI</div>
              </div>
            </div>
          </div>
          <div style={{ flex: 1, padding: '16px 0', position: 'relative' }}>
            {NAV.map(item => {
              const active = page === item.id;
              return (
                <div key={item.id} onClick={() => setPage(item.id)}
                  style={{
                    display: 'flex', alignItems: 'center', gap: 10,
                    padding: '10px 20px', cursor: 'pointer',
                    background: active ? 'rgba(0,212,170,0.12)' : 'transparent',
                    borderLeft: active ? `2px solid ${T.teal}` : '2px solid transparent',
                    color: active ? '#fff' : 'rgba(255,255,255,0.5)',
                    fontWeight: active ? 600 : 400, fontSize: 14,
                    transition: 'all 0.12s', marginBottom: 2,
                  }}>
                  <span style={{ fontSize: 15, opacity: active ? 1 : 0.7 }}>{item.icon}</span>
                  {item.label}
                </div>
              );
            })}
          </div>
          <div style={{ padding: '16px 20px', borderTop: `1px solid rgba(255,255,255,0.08)`, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <button onClick={() => setShowFeedback(true)}
              style={{ background: 'none', border: 'none', color: 'rgba(255,255,255,0.5)', fontSize: 12, cursor: 'pointer', padding: 0 }}>
              💡 Feedback
            </button>
            <button onClick={() => supabase.auth.signOut()}
              style={{ background: 'none', border: 'none', color: 'rgba(255,255,255,0.3)', fontSize: 12, cursor: 'pointer', padding: 0 }}>
              Sign out
            </button>
          </div>
        </div>
      )}

      {/* Main */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden', minWidth: 0 }}>
        {/* Topbar */}
        <div style={{ background: T.surface, borderBottom: `1px solid ${T.border}`, padding: isMobile ? '12px 16px' : '14px 32px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, flexShrink: 0 }}>
          {isMobile ? (
            <>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <KeywiseLogo size={24} />
              </div>
              <div style={{ fontSize: 16, fontWeight: 700, color: T.navy, letterSpacing: '-0.3px' }}>{PAGE_TITLES[page]}</div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                {/* Bell — mobile */}
                <button onClick={() => setNotifOpen(o => !o)} style={{ position: 'relative', background: 'transparent', border: 'none', padding: '6px 8px', cursor: 'pointer' }}>
                  <span style={{ fontSize: 18, lineHeight: 1 }}>🔔</span>
                  {unreadCount > 0 && <span style={{ position: 'absolute', top: 2, right: 2, width: 14, height: 14, borderRadius: '50%', background: '#EF4444', color: '#fff', fontSize: 8, fontWeight: 800, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>{unreadCount > 9 ? '9+' : unreadCount}</span>}
                </button>
                <button onClick={() => supabase.auth.signOut()}
                  style={{ background: T.bg, border: `1px solid ${T.border}`, borderRadius: 8, padding: '6px 12px', fontSize: 12, fontWeight: 600, color: T.inkMuted, cursor: 'pointer' }}>
                  Sign out
                </button>
              </div>
            </>
          ) : (
            <>
              <div style={{ fontSize: 20, fontWeight: 700, color: T.navy, letterSpacing: '-0.3px', flexShrink: 0 }}>{PAGE_TITLES[page]}</div>
              <button onClick={openSearch}
                style={{ flex: 1, maxWidth: 360, display: 'flex', alignItems: 'center', gap: 8, background: T.bg, border: `1px solid ${T.border}`, borderRadius: 10, padding: '8px 14px', cursor: 'text', textAlign: 'left' }}>
                <span style={{ color: T.inkMuted, fontSize: 14 }}>⌕</span>
                <span style={{ fontSize: 13, color: T.inkMuted }}>Search tenants, payments, maintenance…</span>
                <span style={{ marginLeft: 'auto', fontSize: 11, color: T.inkMuted, background: T.border, borderRadius: 5, padding: '2px 6px', letterSpacing: '0.3px' }}>⌘K</span>
              </button>
              <div style={{ fontSize: 12, color: T.inkMuted, flexShrink: 0 }}>
                {new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })}
              </div>
              {/* Bell — desktop */}
              <div ref={notifRef} style={{ position: 'relative', flexShrink: 0 }}>
                <button onClick={() => setNotifOpen(o => !o)}
                  style={{ position: 'relative', background: notifOpen ? T.bg : 'transparent', border: `1px solid ${notifOpen ? T.border : 'transparent'}`, borderRadius: 10, padding: '7px 10px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <span style={{ fontSize: 17, lineHeight: 1 }}>🔔</span>
                  {unreadCount > 0 && (
                    <span style={{ position: 'absolute', top: 2, right: 2, width: 16, height: 16, borderRadius: '50%', background: '#EF4444', color: '#fff', fontSize: 9, fontWeight: 800, display: 'flex', alignItems: 'center', justifyContent: 'center', lineHeight: 1 }}>{unreadCount > 9 ? '9+' : unreadCount}</span>
                  )}
                </button>
                {notifOpen && (
                  <div style={{ position: 'absolute', top: 'calc(100% + 8px)', right: 0, width: 340, background: T.surface, border: `1px solid ${T.border}`, borderRadius: T.radius, boxShadow: '0 8px 32px rgba(15,52,96,0.14)', zIndex: 300, overflow: 'hidden' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '14px 16px', borderBottom: `1px solid ${T.border}` }}>
                      <div style={{ fontWeight: 700, fontSize: 13, color: T.navy }}>Notifications {unreadCount > 0 && <span style={{ fontSize: 11, background: '#EF4444', color: '#fff', borderRadius: 100, padding: '1px 6px', marginLeft: 4 }}>{unreadCount}</span>}</div>
                      {unreadCount > 0 && <button onClick={markAllRead} style={{ background: 'none', border: 'none', fontSize: 11, color: T.tealDark, fontWeight: 600, cursor: 'pointer' }}>Mark all read</button>}
                    </div>
                    <div style={{ maxHeight: 360, overflowY: 'auto' }}>
                      {notifications.length === 0 ? (
                        <div style={{ padding: '28px 16px', textAlign: 'center', color: T.inkMuted, fontSize: 13 }}>All clear — no alerts.</div>
                      ) : notifications.map(n => {
                        const isRead = readIds.has(n.id);
                        const tc = notifTypeColor(n.type);
                        return (
                          <div key={n.id} onClick={() => { setPage(n.page); setNotifOpen(false); const next = new Set(readIds); next.add(n.id); setReadIds(next); localStorage.setItem('kw_notif_read', JSON.stringify([...next])); }}
                            style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '11px 16px', borderBottom: `1px solid ${T.border}`, cursor: 'pointer', background: isRead ? 'transparent' : tc.bg, opacity: isRead ? 0.65 : 1 }}
                            onMouseEnter={e => (e.currentTarget as HTMLDivElement).style.background = T.bg}
                            onMouseLeave={e => (e.currentTarget as HTMLDivElement).style.background = isRead ? 'transparent' : tc.bg}>
                            <span style={{ fontSize: 16, flexShrink: 0 }}>{n.icon}</span>
                            <span style={{ fontSize: 12, color: isRead ? T.inkMuted : tc.color, flex: 1, fontWeight: isRead ? 400 : 600, lineHeight: 1.4 }}>{n.msg}</span>
                            {!isRead && <div style={{ width: 7, height: 7, borderRadius: '50%', background: '#EF4444', flexShrink: 0 }} />}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>
            </>
          )}
        </div>

        {/* Trial Banner */}
        {userRole === 'landlord' && (
          <TrialBanner
            subscriptionStatus={subscriptionStatus}
            trialEndsAt={trialEndsAt}
            userId={session?.user?.id || ''}
          />
        )}

        {/* Content */}
        <div style={{ flex: 1, padding: isMobile ? '16px' : '28px 32px', overflowY: 'auto', paddingBottom: isMobile ? 88 : undefined }}>
          {renderPage()}
        </div>
      </div>

      {/* Bottom tab bar — mobile only */}
      {isMobile && (
        <div style={{ position: 'fixed', bottom: 0, left: 0, right: 0, zIndex: 200, background: T.surface, borderTop: `1px solid ${T.border}`, display: 'flex', boxShadow: '0 -2px 12px rgba(15,52,96,0.08)' }}>
          {NAV.map(item => {
            const active = page === item.id;
            return (
              <button key={item.id} onClick={() => setPage(item.id)}
                style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 3, padding: '10px 4px 8px', border: 'none', background: 'transparent', cursor: 'pointer', borderTop: active ? `2px solid ${T.navy}` : '2px solid transparent' }}>
                <span style={{ fontSize: 18, lineHeight: 1 }}>{item.icon}</span>
                <span style={{ fontSize: 10, fontWeight: active ? 700 : 500, color: active ? T.navy : T.inkMuted, letterSpacing: '0.1px' }}>{item.label}</span>
              </button>
            );
          })}
        </div>
      )}

      {/* ── MOBILE NOTIFICATIONS PANEL ── */}
      {isMobile && notifOpen && (
        <div onClick={() => setNotifOpen(false)} style={{ position: 'fixed', inset: 0, background: 'rgba(15,52,96,0.4)', zIndex: 300, display: 'flex', flexDirection: 'column', justifyContent: 'flex-end' }}>
          <div onClick={e => e.stopPropagation()} style={{ background: T.surface, borderRadius: `${T.radius}px ${T.radius}px 0 0`, maxHeight: '70vh', overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '16px 20px', borderBottom: `1px solid ${T.border}` }}>
              <div style={{ fontWeight: 700, fontSize: 14, color: T.navy }}>Notifications {unreadCount > 0 && <span style={{ fontSize: 11, background: '#EF4444', color: '#fff', borderRadius: 100, padding: '1px 6px', marginLeft: 4 }}>{unreadCount}</span>}</div>
              {unreadCount > 0 && <button onClick={markAllRead} style={{ background: 'none', border: 'none', fontSize: 12, color: T.tealDark, fontWeight: 600, cursor: 'pointer' }}>Mark all read</button>}
            </div>
            <div style={{ overflowY: 'auto' }}>
              {notifications.length === 0 ? (
                <div style={{ padding: '32px 20px', textAlign: 'center', color: T.inkMuted, fontSize: 13 }}>All clear — no alerts.</div>
              ) : notifications.map(n => {
                const isRead = readIds.has(n.id);
                const tc = notifTypeColor(n.type);
                return (
                  <div key={n.id} onClick={() => { setPage(n.page); setNotifOpen(false); const next = new Set(readIds); next.add(n.id); setReadIds(next); localStorage.setItem('kw_notif_read', JSON.stringify([...next])); }}
                    style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '14px 20px', borderBottom: `1px solid ${T.border}`, cursor: 'pointer', background: isRead ? 'transparent' : tc.bg }}>
                    <span style={{ fontSize: 18, flexShrink: 0 }}>{n.icon}</span>
                    <span style={{ fontSize: 13, color: isRead ? T.inkMuted : tc.color, flex: 1, fontWeight: isRead ? 400 : 600, lineHeight: 1.4 }}>{n.msg}</span>
                    {!isRead && <div style={{ width: 8, height: 8, borderRadius: '50%', background: '#EF4444', flexShrink: 0 }} />}
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* ── QUICK ACTIONS FAB ── */}
      {userRole === 'landlord' && (
        <div ref={fabRef} style={{ position: 'fixed', bottom: isMobile ? 96 : 32, right: 24, zIndex: 180, display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 10 }}>
          {fabOpen && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8, alignItems: 'flex-end' }}>
              {[
                { icon: '👤', label: 'Add Tenant', page: 'tenants', wizard: true },
                { icon: '🔧', label: 'Log Maintenance', page: 'operations', wizard: false },
                { icon: '💬', label: 'Send Message', page: 'tenants', wizard: false },
                { icon: '💳', label: 'Request Payment', page: 'tenants', wizard: false },
                { icon: '📁', label: 'Upload Document', page: 'operations', wizard: false },
              ].map(action => (
                <button key={action.label} onClick={() => { setPage(action.page); if (action.wizard) setOpenWizardOnTenants(true); setFabOpen(false); }}
                  style={{ display: 'flex', alignItems: 'center', gap: 10, background: T.surface, border: `1px solid ${T.border}`, borderRadius: T.radiusSm, padding: '9px 16px', fontSize: 13, fontWeight: 600, color: T.navy, cursor: 'pointer', boxShadow: T.shadowMd, whiteSpace: 'nowrap' as const }}>
                  <span style={{ fontSize: 16 }}>{action.icon}</span> {action.label}
                </button>
              ))}
            </div>
          )}
          <button onClick={() => setFabOpen(o => !o)}
            style={{ width: 52, height: 52, borderRadius: '50%', background: T.navy, border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 4px 20px rgba(15,52,96,0.3)', fontSize: 26, color: T.teal, transition: 'transform 0.2s', transform: fabOpen ? 'rotate(45deg)' : 'none', fontFamily: 'inherit' }}>
            +
          </button>
        </div>
      )}

      {/* Stripe success toast */}
      {stripeSuccess && (
        <div style={{ position: 'fixed', top: 20, right: 24, zIndex: 2000, background: T.greenLight, border: `1px solid ${T.green}44`, borderRadius: T.radiusSm, padding: '12px 20px', fontSize: 13, fontWeight: 600, color: T.greenDark, boxShadow: T.shadowMd, display: 'flex', alignItems: 'center', gap: 8 }}>
          ✓ Stripe connected successfully!
        </div>
      )}

      {showUpgradedBanner && (
        <div style={{ position: 'fixed', top: 20, left: '50%', transform: 'translateX(-50%)', zIndex: 2000, background: T.teal, borderRadius: T.radiusSm, padding: '13px 24px', fontSize: 14, fontWeight: 600, color: '#fff', boxShadow: T.shadowMd, display: 'flex', alignItems: 'center', gap: 10, whiteSpace: 'nowrap' }}>
          🎉 Welcome to Keywise Pro! You now have unlimited units and online rent collection.
          <span onClick={() => setShowUpgradedBanner(false)} style={{ marginLeft: 8, cursor: 'pointer', opacity: 0.7, fontSize: 18, lineHeight: 1 }}>×</span>
        </div>
      )}

      {showPaymentBanner && (
        <div style={{ position: 'fixed', top: 20, left: '50%', transform: 'translateX(-50%)', zIndex: 2000, background: T.greenLight, border: `1px solid ${T.greenDark}33`, borderRadius: T.radiusSm, padding: '13px 24px', fontSize: 14, fontWeight: 600, color: T.greenDark, boxShadow: T.shadowMd, display: 'flex', alignItems: 'center', gap: 10, whiteSpace: 'nowrap' }}>
          Payment received successfully!
          <span onClick={() => setShowPaymentBanner(false)} style={{ marginLeft: 8, cursor: 'pointer', opacity: 0.7, fontSize: 18, lineHeight: 1 }}>×</span>
        </div>
      )}

      {/* Feedback modal */}
      {showFeedback && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 2000 }}
          onClick={() => { setShowFeedback(false); setFeedbackSent(false); }}>
          <div style={{ background: T.surface, borderRadius: 16, padding: 28, width: isMobile ? '90%' : 420, maxWidth: 420 }}
            onClick={e => e.stopPropagation()}>
            {feedbackSent ? (
              <div style={{ textAlign: 'center', padding: '16px 0' }}>
                <div style={{ fontSize: 32, marginBottom: 12 }}>✓</div>
                <div style={{ fontWeight: 700, fontSize: 16, color: T.navy, marginBottom: 4 }}>Thanks for your feedback!</div>
                <div style={{ fontSize: 13, color: T.inkMuted }}>We read every message and use it to improve Keywise.</div>
              </div>
            ) : (
              <>
                <div style={{ fontWeight: 700, fontSize: 16, color: T.navy, marginBottom: 16 }}>Share Feedback</div>
                <div style={{ display: 'flex', gap: 8, marginBottom: 14 }}>
                  {([['bug', '🐛 Bug'], ['feature', '💡 Feature'], ['general', '💬 General']] as const).map(([val, lbl]) => (
                    <button key={val} onClick={() => setFeedbackType(val)}
                      style={{ flex: 1, padding: '8px', borderRadius: T.radiusSm, border: `1.5px solid ${feedbackType === val ? T.navy : T.border}`, background: feedbackType === val ? T.bg : T.surface, cursor: 'pointer', fontSize: 12, fontWeight: 600, color: feedbackType === val ? T.navy : T.inkMuted, fontFamily: 'inherit' }}>
                      {lbl}
                    </button>
                  ))}
                </div>
                <textarea value={feedbackMsg} onChange={e => setFeedbackMsg(e.target.value)}
                  placeholder="What's on your mind?"
                  style={{ width: '100%', padding: '12px 14px', border: `1px solid ${T.border}`, borderRadius: T.radiusSm, fontSize: 13, minHeight: 100, resize: 'vertical', fontFamily: 'inherit', boxSizing: 'border-box', outline: 'none' }} />
                <button onClick={async () => {
                  if (!feedbackMsg.trim()) return;
                  setFeedbackSending(true);
                  const { data: { user } } = await supabase.auth.getUser();
                  await supabase.from('feedback').insert({ user_id: user?.id, user_email: user?.email, type: feedbackType, message: feedbackMsg.trim() });
                  setFeedbackSending(false);
                  setFeedbackMsg('');
                  setFeedbackSent(true);
                }} disabled={feedbackSending || !feedbackMsg.trim()}
                  style={{ width: '100%', padding: '12px', background: T.navy, color: '#fff', border: 'none', borderRadius: T.radiusSm, fontSize: 14, fontWeight: 600, cursor: 'pointer', marginTop: 12, opacity: !feedbackMsg.trim() ? 0.5 : 1 }}>
                  {feedbackSending ? 'Sending...' : 'Submit Feedback'}
                </button>
              </>
            )}
          </div>
        </div>
      )}

      {/* Search overlay */}
      {searchOpen && (
        <div
          onClick={closeSearch}
          style={{ position: 'fixed', inset: 0, background: 'rgba(15,52,96,0.45)', zIndex: 1000, display: 'flex', alignItems: 'flex-start', justifyContent: 'center', paddingTop: 80 }}>
          <div
            onClick={e => e.stopPropagation()}
            style={{ width: '100%', maxWidth: 560, background: T.surface, borderRadius: 16, boxShadow: '0 8px 40px rgba(15,52,96,0.22)', overflow: 'hidden' }}>

            {/* Input */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '14px 18px', borderBottom: `1px solid ${T.border}` }}>
              <span style={{ color: T.inkMuted, fontSize: 18, lineHeight: 1 }}>⌕</span>
              <input
                ref={searchInputRef}
                value={searchQuery}
                onChange={e => handleSearchInput(e.target.value)}
                placeholder="Search tenants, payments, maintenance, documents…"
                style={{ flex: 1, border: 'none', outline: 'none', fontSize: 15, color: T.ink, background: 'transparent', fontFamily: 'inherit' }}
              />
              {searchLoading && <span style={{ fontSize: 12, color: T.tealDark }}>searching…</span>}
              <button onClick={closeSearch} style={{ background: 'none', border: 'none', color: T.inkMuted, cursor: 'pointer', fontSize: 18, lineHeight: 1, padding: 0 }}>×</button>
            </div>

            {/* Results */}
            <div style={{ maxHeight: 440, overflowY: 'auto' }}>
              {searchQuery.length >= 2 && !searchLoading && searchResults.length === 0 && (
                <div style={{ padding: '28px 18px', textAlign: 'center', color: T.inkMuted, fontSize: 13 }}>
                  No results for "{searchQuery}"
                </div>
              )}
              {searchQuery.length < 2 && (
                <div style={{ padding: '24px 18px', color: T.inkMuted, fontSize: 13 }}>
                  Type to search across your tenants, payments, maintenance issues, and documents.
                </div>
              )}
              {searchResults.map(group => (
                <div key={group.category}>
                  <div style={{ padding: '10px 18px 6px', fontSize: 10, fontWeight: 700, color: T.inkMuted, textTransform: 'uppercase', letterSpacing: '0.6px', display: 'flex', alignItems: 'center', gap: 6 }}>
                    <span>{group.icon}</span> {group.category}
                  </div>
                  {group.items.map((item, i) => (
                    <div key={i} onClick={() => navigateToResult(item.page)}
                      style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '10px 18px', cursor: 'pointer', borderRadius: 0 }}
                      onMouseEnter={e => (e.currentTarget as HTMLDivElement).style.background = T.bg}
                      onMouseLeave={e => (e.currentTarget as HTMLDivElement).style.background = 'transparent'}>
                      <div style={{ width: 32, height: 32, borderRadius: 8, background: T.bg, border: `1px solid ${T.border}`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 15, flexShrink: 0 }}>
                        {group.icon}
                      </div>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontSize: 13, fontWeight: 600, color: T.ink, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{item.label}</div>
                        {item.sub && <div style={{ fontSize: 12, color: T.inkMuted, marginTop: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{item.sub}</div>}
                      </div>
                      <span style={{ fontSize: 12, color: T.inkMuted, background: T.bg, border: `1px solid ${T.border}`, borderRadius: 6, padding: '2px 8px', flexShrink: 0 }}>
                        {PAGE_TITLES[item.page]}
                      </span>
                    </div>
                  ))}
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}