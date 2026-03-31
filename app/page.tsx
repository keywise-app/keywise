'use client';
import { useState, useEffect, useRef, useCallback } from 'react';
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
  const searchInputRef = useRef<HTMLInputElement>(null);
  const searchDebounce = useRef<ReturnType<typeof setTimeout> | null>(null);

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
    if (params.has('page') || params.has('stripe') || params.has('tenant_preview')) {
      window.history.replaceState({}, '', '/');
    }
  }, []);

  useEffect(() => {
    supabase.auth.getSession().then(async ({ data: { session } }) => {
      setSession(session);
      if (session) {
        const isTenantFlow = new URLSearchParams(window.location.search).get('tenant') === 'true';

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
          .from('profiles').select('full_name, role').eq('id', session.user.id).single();

        if (isTenantFlow && profile?.role !== 'landlord') {
          // First-time tenant login via magic link — only if not already a landlord
          await supabase.from('profiles').upsert(
            { id: session.user.id, email: session.user.email, role: 'tenant' },
            { onConflict: 'id' }
          );
          await linkLeaseByEmail();
          setUserRole('tenant');
          window.history.replaceState({}, '', '/');
        } else if (profile?.role === 'tenant') {
          // Returning tenant — attempt to link in case it wasn't set yet
          await linkLeaseByEmail();
          setUserRole('tenant');
        } else {
          // landlord, null, or isTenantFlow but user is already a landlord
          setUserRole('landlord');
          if (!profile?.full_name) setShowOnboarding(true);
          if (isTenantFlow) window.history.replaceState({}, '', '/');
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
      case 'tenants': return <Tenants />;
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

  if (!session) return <Auth />;
  if (session && previewLeaseId) return <TenantDashboard previewLeaseId={previewLeaseId} />;
  if (session && userRole === 'tenant') return <TenantDashboard />;
  if (showOnboarding) return <Onboarding onComplete={() => setShowOnboarding(false)} />;

  return (
    <div style={{ fontFamily: "'Inter', system-ui, sans-serif", background: T.bg, color: T.ink, minHeight: '100vh', display: 'flex' }}>
      <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap" rel="stylesheet" />
      <style>{`* { box-sizing: border-box; } body { margin: 0; } button, input, select, textarea { font-family: inherit; }`}</style>

      {/* Sidebar */}
      <div style={{ width: 200, background: T.navy, display: 'flex', flexDirection: 'column', flexShrink: 0, position: 'relative' }}>
        <div style={{ position: 'absolute', inset: 0, opacity: 0.04, backgroundImage: 'radial-gradient(circle, #fff 1px, transparent 1px)', backgroundSize: '20px 20px', pointerEvents: 'none' }} />

        {/* Logo */}
        <div style={{ padding: '22px 20px 18px', borderBottom: `1px solid rgba(255,255,255,0.08)`, position: 'relative' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <KeywiseLogo size={28} />
            <div>
              <div style={{ fontSize: 17, fontWeight: 700, color: '#fff', letterSpacing: '-0.3px' }}>Keywise</div>
              <div style={{ fontSize: 9, color: T.teal, letterSpacing: '1.5px', textTransform: 'uppercase', marginTop: 1 }}>Property AI</div>
            </div>
          </div>
        </div>

        {/* Nav */}
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
                  fontWeight: active ? 600 : 400,
                  fontSize: 14,
                  transition: 'all 0.12s',
                  marginBottom: 2,
                }}>
                <span style={{ fontSize: 15, opacity: active ? 1 : 0.7 }}>{item.icon}</span>
                {item.label}
              </div>
            );
          })}
        </div>

        {/* Sign out */}
        <div style={{ padding: '16px 20px', borderTop: `1px solid rgba(255,255,255,0.08)`, position: 'relative' }}>
          <button onClick={() => supabase.auth.signOut()}
            style={{ background: 'none', border: 'none', color: 'rgba(255,255,255,0.3)', fontSize: 12, cursor: 'pointer', padding: 0 }}>
            Sign out
          </button>
        </div>
      </div>

      {/* Main */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
        {/* Topbar */}
        <div style={{ background: T.surface, borderBottom: `1px solid ${T.border}`, padding: '14px 32px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 16 }}>
          <div style={{ fontSize: 20, fontWeight: 700, color: T.navy, letterSpacing: '-0.3px', flexShrink: 0 }}>{PAGE_TITLES[page]}</div>

          {/* Search bar */}
          <button onClick={openSearch}
            style={{
              flex: 1, maxWidth: 360, display: 'flex', alignItems: 'center', gap: 8,
              background: T.bg, border: `1px solid ${T.border}`, borderRadius: 10,
              padding: '8px 14px', cursor: 'text', textAlign: 'left',
            }}>
            <span style={{ color: T.inkMuted, fontSize: 14 }}>⌕</span>
            <span style={{ fontSize: 13, color: T.inkMuted }}>Search tenants, payments, maintenance…</span>
            <span style={{ marginLeft: 'auto', fontSize: 11, color: T.inkMuted, background: T.border, borderRadius: 5, padding: '2px 6px', letterSpacing: '0.3px' }}>⌘K</span>
          </button>

          <div style={{ fontSize: 12, color: T.inkMuted, flexShrink: 0 }}>
            {new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })}
          </div>
        </div>

        {/* Content */}
        <div style={{ flex: 1, padding: '28px 32px', overflowY: 'auto' }}>
          {renderPage()}
        </div>
      </div>

      {/* Stripe success toast */}
      {stripeSuccess && (
        <div style={{ position: 'fixed', top: 20, right: 24, zIndex: 2000, background: T.greenLight, border: `1px solid ${T.green}44`, borderRadius: T.radiusSm, padding: '12px 20px', fontSize: 13, fontWeight: 600, color: T.greenDark, boxShadow: T.shadowMd, display: 'flex', alignItems: 'center', gap: 8 }}>
          ✓ Stripe connected successfully!
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