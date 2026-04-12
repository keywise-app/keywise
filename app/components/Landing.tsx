'use client';
import { useState, useEffect, useRef } from 'react';
import { supabase } from '../lib/supabase';

const N = '#0F3460';
const TEAL = '#00D4AA';
const TEAL_DARK = '#00A886';
const TEAL_LIGHT = '#E0FAF5';
const BG = '#F0F4FF';
const SURFACE = '#FFFFFF';
const BORDER = '#E0E6F0';
const INK = '#1A1A2E';
const INK_MID = '#4A5068';
const INK_MUTED = '#8892A4';
const CORAL = '#FF6B6B';
const CORAL_LIGHT = '#FFF0F0';

function Logo({ size = 32, dark = false }: { size?: number; dark?: boolean }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
      <svg width={size} height={size} viewBox="0 0 32 32" fill="none">
        <rect width="32" height="32" rx="8" fill={dark ? SURFACE : N} />
        <circle cx="13" cy="16" r="5.5" fill="none" stroke={TEAL} strokeWidth="2.5" />
        <circle cx="13" cy="16" r="2" fill={TEAL} />
        <rect x="17.5" y="14.75" width="8" height="2.5" rx="1.25" fill={TEAL} />
        <rect x="22" y="17.25" width="4" height="2" rx="1" fill={TEAL} />
        <rect x="19" y="17.25" width="2.5" height="2" rx="1" fill={TEAL} />
      </svg>
      <span style={{ fontSize: size * 0.56, fontWeight: 700, color: dark ? SURFACE : N, letterSpacing: '-0.4px' }}>
        keywise
      </span>
    </div>
  );
}

function DashboardMockup() {
  return (
    <div className="landing-mockup" style={{
      width: '100%', maxWidth: 620, borderRadius: 16,
      boxShadow: '0 32px 80px rgba(15,52,96,0.28), 0 8px 24px rgba(15,52,96,0.15)',
      overflow: 'hidden', border: `1px solid ${BORDER}`,
      transform: 'perspective(1200px) rotateY(-4deg) rotateX(2deg)',
      transformOrigin: 'center center',
    }}>
      <div style={{ background: '#1a1a2e', padding: '10px 16px', display: 'flex', alignItems: 'center', gap: 6 }}>
        <div style={{ width: 11, height: 11, borderRadius: '50%', background: '#FF5F57' }} />
        <div style={{ width: 11, height: 11, borderRadius: '50%', background: '#FEBC2E' }} />
        <div style={{ width: 11, height: 11, borderRadius: '50%', background: '#28C840' }} />
        <div style={{ flex: 1, height: 20, background: 'rgba(255,255,255,0.06)', borderRadius: 6, marginLeft: 8 }} />
      </div>
      <div style={{ display: 'flex', height: 380, background: BG }}>
        <div style={{ width: 148, background: N, padding: '16px 0', flexShrink: 0, position: 'relative', overflow: 'hidden' }}>
          <div style={{ position: 'absolute', inset: 0, opacity: 0.04, backgroundImage: 'radial-gradient(circle, #fff 1px, transparent 1px)', backgroundSize: '16px 16px' }} />
          <div style={{ padding: '0 14px 16px', borderBottom: '1px solid rgba(255,255,255,0.08)', marginBottom: 12, position: 'relative' }}>
            <Logo size={22} />
          </div>
          {[
            { icon: '⊞', label: 'Dashboard', active: true },
            { icon: '⌂', label: 'Portfolio', active: false },
            { icon: '◈', label: 'Tenants', active: false },
            { icon: '⚙', label: 'Operations', active: false },
            { icon: '○', label: 'Settings', active: false },
          ].map(item => (
            <div key={item.label} style={{
              display: 'flex', alignItems: 'center', gap: 8, padding: '8px 14px',
              background: item.active ? 'rgba(0,212,170,0.12)' : 'transparent',
              borderLeft: item.active ? `2px solid ${TEAL}` : '2px solid transparent',
              marginBottom: 2, position: 'relative',
            }}>
              <span style={{ fontSize: 12, color: item.active ? '#fff' : 'rgba(255,255,255,0.4)' }}>{item.icon}</span>
              <span style={{ fontSize: 11, color: item.active ? '#fff' : 'rgba(255,255,255,0.4)', fontWeight: item.active ? 600 : 400 }}>{item.label}</span>
            </div>
          ))}
        </div>
        <div style={{ flex: 1, padding: '16px', overflowY: 'hidden' }}>
          <div style={{ fontSize: 13, fontWeight: 700, color: N, marginBottom: 12 }}>Dashboard</div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8, marginBottom: 12 }}>
            {[
              { label: 'Monthly Revenue', value: '$8,400', color: N },
              { label: 'Collected', value: '$6,200', color: '#0F7040' },
              { label: 'Pending', value: '$2,200', color: '#9A6500' },
            ].map(s => (
              <div key={s.label} style={{ background: SURFACE, borderRadius: 10, padding: '10px 12px', border: `1px solid ${BORDER}`, boxShadow: '0 1px 4px rgba(15,52,96,0.06)' }}>
                <div style={{ fontSize: 16, fontWeight: 700, color: s.color, letterSpacing: '-0.5px' }}>{s.value}</div>
                <div style={{ fontSize: 9, color: INK_MUTED, marginTop: 1, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.4px' }}>{s.label}</div>
              </div>
            ))}
          </div>
          <div style={{ background: SURFACE, borderRadius: 10, border: `1px solid ${BORDER}`, overflow: 'hidden', boxShadow: '0 1px 4px rgba(15,52,96,0.06)' }}>
            <div style={{ padding: '8px 12px', borderBottom: `1px solid ${BORDER}`, fontSize: 10, fontWeight: 700, color: INK_MUTED, textTransform: 'uppercase', letterSpacing: '0.5px' }}>Tenants</div>
            {[
              { name: 'Alex Johnson', prop: '142 Oak St', amount: '$2,100', status: 'Paid', sc: '#0F7040', sb: '#E8F8F0' },
              { name: 'Maria Garcia', prop: '88 Maple Ave', amount: '$1,800', status: 'Due Today', sc: '#9A6500', sb: '#FFF8E0' },
              { name: 'David Kim', prop: '31 Pine Rd #4', amount: '$2,200', status: 'Paid', sc: '#0F7040', sb: '#E8F8F0' },
              { name: 'Sarah Chen', prop: '7 Elm Court', amount: '$2,300', status: 'Overdue', sc: CORAL, sb: CORAL_LIGHT },
            ].map((t, i) => (
              <div key={t.name} style={{ display: 'flex', alignItems: 'center', padding: '7px 12px', borderBottom: i < 3 ? `1px solid ${BORDER}` : 'none', gap: 8 }}>
                <div style={{ width: 24, height: 24, borderRadius: '50%', background: BG, border: `1px solid ${BORDER}`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 9, fontWeight: 700, color: N, flexShrink: 0 }}>
                  {t.name.split(' ').map(w => w[0]).join('')}
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 10, fontWeight: 600, color: INK }}>{t.name}</div>
                  <div style={{ fontSize: 9, color: INK_MUTED }}>{t.prop}</div>
                </div>
                <div style={{ fontSize: 11, fontWeight: 700, color: N }}>{t.amount}</div>
                <div style={{ fontSize: 8, fontWeight: 700, padding: '2px 6px', borderRadius: 20, background: t.sb, color: t.sc, textTransform: 'uppercase', letterSpacing: '0.3px' }}>{t.status}</div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

function AuthModal({ mode: initialMode, onClose }: { mode: 'login' | 'signup'; onClose: () => void }) {
  const [mode, setMode] = useState<'login' | 'signup' | 'forgot'>(initialMode);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [resetSent, setResetSent] = useState(false);

  useEffect(() => { setMode(initialMode); }, [initialMode]);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [onClose]);

  const handleSubmit = async () => {
    setLoading(true);
    setError('');
    if (mode === 'forgot') {
      if (!email) { setError('Please enter your email address.'); setLoading(false); return; }
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: 'https://keywise.app/reset-password',
      });
      setLoading(false);
      if (error) { setError(error.message); return; }
      setResetSent(true);
      return;
    }
    if (mode === 'signup') {
      const { error } = await supabase.auth.signUp({ email, password });
      if (error) setError(error.message);
      else {
        if (typeof window !== 'undefined' && (window as any).gtag) {
          (window as any).gtag('event', 'conversion', {
            send_to: 'AW-18070985639/_8rLCMetnZccEKrJ5_ID',
            value: 1.0,
            currency: 'USD',
          });
        }
        if (typeof window !== 'undefined') {
          window.history.replaceState({}, '', '/?signup=complete');
        }
      }
    } else {
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) setError(error.message);
    }
    setLoading(false);
  };

  const subtitle = mode === 'forgot'
    ? 'Enter your email to receive a reset link.'
    : mode === 'login'
    ? 'Welcome back. Sign in to your portfolio.'
    : 'Start managing your properties smarter.';

  return (
    <div
      style={{ position: 'fixed', inset: 0, background: 'rgba(15,52,96,0.6)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20, backdropFilter: 'blur(4px)' }}
      onClick={e => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div style={{ width: '100%', maxWidth: 420, background: SURFACE, borderRadius: 20, padding: 36, boxShadow: '0 24px 80px rgba(15,52,96,0.25)', position: 'relative', fontFamily: "'Inter', system-ui, sans-serif" }}>
        <button onClick={onClose} style={{ position: 'absolute', top: 16, right: 16, background: 'none', border: 'none', fontSize: 22, cursor: 'pointer', color: INK_MUTED, lineHeight: 1, padding: 4 }}>×</button>

        <div style={{ textAlign: 'center', marginBottom: 28 }}>
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: 10, marginBottom: 12 }}>
            <Logo size={36} />
          </div>
          <p style={{ fontSize: 13, color: INK_MUTED, margin: 0 }}>{subtitle}</p>
        </div>

        {mode === 'forgot' ? (
          resetSent ? (
            <>
              <div style={{ background: '#F0FDF4', border: '1px solid #86EFAC', borderRadius: 10, padding: '14px 16px', fontSize: 13, color: '#166534', lineHeight: 1.6, marginBottom: 20 }}>
                ✓ Check your email for a reset link. It may take a minute to arrive.
              </div>
              <div style={{ textAlign: 'center' }}>
                <span onClick={() => { setMode('login'); setResetSent(false); setError(''); }}
                  style={{ fontSize: 13, color: TEAL, fontWeight: 600, cursor: 'pointer' }}>
                  ← Back to login
                </span>
              </div>
            </>
          ) : (
            <>
              <div style={{ marginBottom: 16 }}>
                <label style={{ fontSize: 11, color: INK_MUTED, fontWeight: 700, textTransform: 'uppercase' as const, letterSpacing: '0.4px', display: 'block', marginBottom: 6 }}>Email</label>
                <input type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="you@email.com"
                  style={{ width: '100%', background: BG, border: `1px solid ${BORDER}`, borderRadius: 10, padding: '11px 14px', fontSize: 14, outline: 'none', boxSizing: 'border-box' as const, fontFamily: 'inherit', color: INK }}
                  onKeyDown={e => e.key === 'Enter' && handleSubmit()} autoFocus />
              </div>
              {error && (
                <div style={{ background: CORAL_LIGHT, border: `1px solid ${CORAL}33`, borderRadius: 10, padding: '10px 14px', fontSize: 13, color: CORAL, marginBottom: 16 }}>
                  {error}
                </div>
              )}
              <button onClick={handleSubmit} disabled={loading}
                style={{ width: '100%', background: N, color: '#fff', border: 'none', borderRadius: 10, padding: '13px', fontSize: 14, fontWeight: 700, cursor: loading ? 'default' : 'pointer', opacity: loading ? 0.7 : 1, fontFamily: 'inherit', marginBottom: 16 }}>
                {loading ? 'Sending…' : 'Send Reset Link'}
              </button>
              <div style={{ textAlign: 'center' }}>
                <span onClick={() => { setMode('login'); setError(''); }}
                  style={{ fontSize: 13, color: TEAL, fontWeight: 600, cursor: 'pointer' }}>
                  ← Back to login
                </span>
              </div>
            </>
          )
        ) : (
          <>
            <div style={{ display: 'flex', background: BG, borderRadius: 10, padding: 4, marginBottom: 22 }}>
              {(['login', 'signup'] as const).map(m => (
                <button key={m} onClick={() => { setMode(m); setError(''); }}
                  style={{
                    flex: 1, padding: '8px', borderRadius: 8, border: 'none', cursor: 'pointer',
                    background: mode === m ? SURFACE : 'transparent',
                    fontWeight: mode === m ? 700 : 400, fontSize: 13,
                    color: mode === m ? N : INK_MUTED,
                    boxShadow: mode === m ? '0 1px 3px rgba(15,52,96,0.08)' : 'none',
                    fontFamily: 'inherit', transition: 'all 0.15s',
                  }}>
                  {m === 'login' ? 'Log In' : 'Sign Up'}
                </button>
              ))}
            </div>

            <div style={{ marginBottom: 14 }}>
              <label style={{ fontSize: 11, color: INK_MUTED, fontWeight: 700, textTransform: 'uppercase' as const, letterSpacing: '0.4px', display: 'block', marginBottom: 6 }}>Email</label>
              <input type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="you@email.com"
                style={{ width: '100%', background: BG, border: `1px solid ${BORDER}`, borderRadius: 10, padding: '11px 14px', fontSize: 14, outline: 'none', boxSizing: 'border-box' as const, fontFamily: 'inherit', color: INK }} />
            </div>

            <div style={{ marginBottom: 6 }}>
              <label style={{ fontSize: 11, color: INK_MUTED, fontWeight: 700, textTransform: 'uppercase' as const, letterSpacing: '0.4px', display: 'block', marginBottom: 6 }}>Password</label>
              <input type="password" value={password} onChange={e => setPassword(e.target.value)} placeholder="••••••••"
                style={{ width: '100%', background: BG, border: `1px solid ${BORDER}`, borderRadius: 10, padding: '11px 14px', fontSize: 14, outline: 'none', boxSizing: 'border-box' as const, fontFamily: 'inherit', color: INK }}
                onKeyDown={e => e.key === 'Enter' && handleSubmit()} />
            </div>

            {mode === 'login' && (
              <div style={{ textAlign: 'right', marginTop: 6, marginBottom: 16 }}>
                <button type="button" onClick={() => { setMode('forgot'); setError(''); }}
                  style={{ background: 'none', border: 'none', color: TEAL, fontSize: 12, fontWeight: 600, cursor: 'pointer', padding: 0, textDecoration: 'underline', fontFamily: 'inherit' }}>
                  Forgot password?
                </button>
              </div>
            )}

            {error && (
              <div style={{ background: CORAL_LIGHT, border: `1px solid ${CORAL}33`, borderRadius: 10, padding: '10px 14px', fontSize: 13, color: CORAL, marginBottom: 16 }}>
                {error}
              </div>
            )}

            <button onClick={handleSubmit} disabled={loading}
              style={{ width: '100%', background: N, color: '#fff', border: 'none', borderRadius: 10, padding: '13px', fontSize: 14, fontWeight: 700, cursor: loading ? 'default' : 'pointer', opacity: loading ? 0.7 : 1, fontFamily: 'inherit', marginTop: mode === 'signup' ? 20 : 0 }}>
              {loading ? 'Please wait…' : mode === 'login' ? 'Log In' : 'Create Account'}
            </button>

            <div style={{ textAlign: 'center', fontSize: 13, color: INK_MUTED, marginTop: 18 }}>
              {mode === 'login' ? "Don't have an account? " : 'Already have an account? '}
              <span onClick={() => { setMode(mode === 'login' ? 'signup' : 'login'); setError(''); }}
                style={{ color: N, fontWeight: 600, cursor: 'pointer' }}>
                {mode === 'login' ? 'Sign up free' : 'Log In'}
              </span>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

export default function Landing() {
  const [authMode, setAuthMode] = useState<'login' | 'signup' | null>(null);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [waitlistEmail, setWaitlistEmail] = useState('');
  const [waitlistLoading, setWaitlistLoading] = useState(false);
  const [waitlistSuccess, setWaitlistSuccess] = useState(false);
  const featuresRef = useRef<HTMLDivElement>(null);

  // Read URL params on mount
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get('signup') === 'true') setAuthMode('signup');
    else if (params.get('login') === 'true') setAuthMode('login');
  }, []);

  // Track page visit
  useEffect(() => {
    fetch('/api/track-visit', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ page: '/', referrer: document.referrer || 'direct', user_agent: navigator.userAgent }),
    }).catch(() => {});
  }, []);

  // Sync URL when auth modal opens/closes
  useEffect(() => {
    if (authMode === 'signup') window.history.replaceState({}, '', '/?signup=true');
    else if (authMode === 'login') window.history.replaceState({}, '', '/?login=true');
    else window.history.replaceState({}, '', '/');
  }, [authMode]);

  const openSignup = () => { setAuthMode('signup'); setMobileMenuOpen(false); };
  const openLogin = () => { setAuthMode('login'); setMobileMenuOpen(false); };
  const closeAuth = () => setAuthMode(null);

  const scrollToFeatures = () => {
    featuresRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  const handleWaitlist = async () => {
    if (!waitlistEmail || waitlistLoading) return;
    setWaitlistLoading(true);
    try {
      await fetch('/api/waitlist', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: waitlistEmail }),
      });
      setWaitlistSuccess(true);
    } catch {
      setWaitlistSuccess(true); // Show success regardless — don't block on network errors
    }
    setWaitlistLoading(false);
  };

  return (
    <div style={{ fontFamily: "'Inter', system-ui, sans-serif", background: SURFACE, color: INK, overflowX: 'hidden' }}>
      <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap" rel="stylesheet" />
      <style>{`
        * { box-sizing: border-box; }
        body { margin: 0; }
        html { scroll-behavior: smooth; }
        .landing-btn-primary:hover { opacity: 0.88; }
        .landing-btn-ghost:hover { background: ${BG} !important; }
        .landing-btn-teal:hover { opacity: 0.88; }
        .landing-pain-card:hover { transform: translateY(-2px); box-shadow: 0 8px 28px rgba(15,52,96,0.12); }
        .landing-feature-card:hover { transform: translateY(-3px); box-shadow: 0 12px 32px rgba(15,52,96,0.12); border-color: ${TEAL}66; }
        .landing-pricing-card:hover { transform: translateY(-4px); }
        .landing-hamburger { display: none; }
        .landing-nav-buttons { display: flex; }
        .landing-mobile-menu { display: none; }

        @media (max-width: 768px) {
          .landing-hero-grid { grid-template-columns: 1fr !important; gap: 40px !important; }
          .landing-mockup { display: none !important; }
          .landing-grid-3 { grid-template-columns: 1fr !important; }
          .landing-grid-2 { grid-template-columns: 1fr !important; max-width: 400px !important; margin-left: auto !important; margin-right: auto !important; }
          .landing-pain-grid { grid-template-columns: 1fr !important; }
          .landing-steps-grid { grid-template-columns: 1fr !important; gap: 32px !important; }
          .landing-steps-connector { display: none !important; }
          .landing-h1 { font-size: 36px !important; letter-spacing: -0.5px !important; line-height: 1.12 !important; }
          .landing-h2 { font-size: 28px !important; letter-spacing: -0.3px !important; }
          .landing-h2-br { display: none; }
          .landing-hero-p { font-size: 15px !important; }
          .landing-section { padding: 60px 20px !important; }
          .landing-nav-inner { padding: 0 20px !important; }
          .landing-footer-inner { flex-direction: column !important; align-items: flex-start !important; }
          .landing-hero-ctas { flex-direction: column !important; align-items: flex-start !important; }
          .landing-hero-ctas button { width: 100% !important; justify-content: center !important; }
          .landing-hamburger { display: flex !important; }
          .landing-nav-buttons { display: none !important; }
          .landing-mobile-menu { display: block; }
          .landing-waitlist-form { flex-direction: column !important; }
          .landing-waitlist-form input { width: 100% !important; }
          .landing-waitlist-form button { width: 100% !important; }
          .landing-final-h2 { font-size: 32px !important; }
        }

        @media (min-width: 769px) and (max-width: 1024px) {
          .landing-grid-3 { grid-template-columns: repeat(2, 1fr) !important; }
          .landing-h1 { font-size: 42px !important; }
          .landing-hero-grid { gap: 32px !important; }
        }
      `}</style>

      {/* NAVBAR */}
      <nav style={{ position: 'sticky', top: 0, zIndex: 100, background: 'rgba(255,255,255,0.95)', backdropFilter: 'blur(12px)', borderBottom: `1px solid ${BORDER}` }}>
        <div className="landing-nav-inner" style={{ maxWidth: 1100, margin: '0 auto', padding: '0 40px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', height: 64 }}>
          <Logo size={30} />
          {/* Desktop buttons */}
          <div className="landing-nav-buttons" style={{ gap: 10, alignItems: 'center' }}>
            <a href="/blog" style={{ color: INK_MID, fontSize: 14, textDecoration: 'none', fontWeight: 500, marginRight: 8 }}>
              Blog
            </a>
            <button onClick={openLogin} className="landing-btn-ghost"
              style={{ background: 'transparent', color: INK_MID, border: `1px solid ${BORDER}`, borderRadius: 10, padding: '8px 18px', fontSize: 13, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit', transition: 'all 0.15s' }}>
              Log In
            </button>
            <button onClick={openSignup} className="landing-btn-primary"
              style={{ background: N, color: '#fff', border: 'none', borderRadius: 10, padding: '8px 20px', fontSize: 13, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit', transition: 'all 0.15s' }}>
              Start Free
            </button>
          </div>
          {/* Hamburger */}
          <button className="landing-hamburger"
            onClick={() => setMobileMenuOpen(o => !o)}
            style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 8, display: 'flex', flexDirection: 'column', gap: 4 }}>
            <span style={{ width: 22, height: 2, background: N, borderRadius: 2, transition: 'all 0.2s', transform: mobileMenuOpen ? 'rotate(45deg) translate(4px, 4px)' : 'none' }} />
            <span style={{ width: 22, height: 2, background: N, borderRadius: 2, transition: 'all 0.2s', opacity: mobileMenuOpen ? 0 : 1 }} />
            <span style={{ width: 22, height: 2, background: N, borderRadius: 2, transition: 'all 0.2s', transform: mobileMenuOpen ? 'rotate(-45deg) translate(4px, -4px)' : 'none' }} />
          </button>
        </div>
        {/* Mobile menu */}
        {mobileMenuOpen && (
          <div className="landing-mobile-menu" style={{ background: SURFACE, borderTop: `1px solid ${BORDER}`, padding: '16px 20px', display: 'flex', flexDirection: 'column', gap: 10 }}>
            <button onClick={openLogin}
              style={{ background: 'transparent', color: N, border: `1px solid ${BORDER}`, borderRadius: 10, padding: '12px', fontSize: 14, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit', width: '100%' }}>
              Log In
            </button>
            <button onClick={openSignup}
              style={{ background: N, color: '#fff', border: 'none', borderRadius: 10, padding: '12px', fontSize: 14, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit', width: '100%' }}>
              Start Free
            </button>
          </div>
        )}
      </nav>

      {/* HERO */}
      <section className="landing-section" style={{ background: `linear-gradient(160deg, ${BG} 0%, #e8f0ff 50%, ${TEAL_LIGHT} 100%)`, padding: '80px 40px 60px', overflow: 'hidden' }}>
        <div className="landing-hero-grid" style={{ maxWidth: 1100, margin: '0 auto', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 60, alignItems: 'center' }}>
          <div>
            <div style={{ display: 'inline-flex', alignItems: 'center', gap: 8, background: TEAL_LIGHT, border: `1px solid ${TEAL}44`, borderRadius: 100, padding: '5px 14px', marginBottom: 24 }}>
              <span style={{ width: 6, height: 6, borderRadius: '50%', background: TEAL, display: 'inline-block' }} />
              <span style={{ fontSize: 12, fontWeight: 600, color: TEAL_DARK }}>Built for independent landlords</span>
            </div>
            <h1 className="landing-h1" style={{ fontSize: 52, fontWeight: 800, color: N, lineHeight: 1.08, letterSpacing: '-1.5px', margin: '0 0 20px' }}>
              Property management,<br />
              <span style={{ color: TEAL_DARK }}>made intelligent.</span>
            </h1>
            <p className="landing-hero-p" style={{ fontSize: 17, color: INK_MID, lineHeight: 1.65, margin: '0 0 36px', maxWidth: 460 }}>
              Keywise uses AI to handle the time-consuming parts of being a landlord — lease tracking, rent collection, tenant communications, and maintenance. All in one place.
            </p>
            <div className="landing-hero-ctas" style={{ display: 'flex', gap: 12, alignItems: 'center', marginBottom: 12, flexWrap: 'wrap' }}>
              <button onClick={openSignup} className="landing-btn-primary"
                style={{ background: N, color: '#fff', border: 'none', borderRadius: 12, padding: '14px 28px', fontSize: 15, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit', transition: 'all 0.15s', display: 'flex', alignItems: 'center', gap: 6 }}>
                Start for free →
              </button>
              <button onClick={scrollToFeatures} className="landing-btn-ghost"
                style={{ background: 'transparent', color: N, border: `1.5px solid ${BORDER}`, borderRadius: 12, padding: '13px 24px', fontSize: 15, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit', transition: 'all 0.15s' }}>
                See how it works
              </button>
            </div>
            <div style={{ fontSize: 12, color: INK_MUTED, marginBottom: 20, fontWeight: 500 }}>
              Free forever · Pro $19/month · Cancel anytime
            </div>

            {/* Early access capture */}
            {!waitlistSuccess ? (
              <div style={{ marginBottom: 20 }}>
                <div style={{ fontSize: 12, color: INK_MUTED, marginBottom: 8, fontWeight: 500 }}>Or get early access — no account needed</div>
                <div className="landing-waitlist-form" style={{ display: 'flex', gap: 8, maxWidth: 380 }}>
                  <input
                    type="email"
                    placeholder="your@email.com"
                    value={waitlistEmail}
                    onChange={e => setWaitlistEmail(e.target.value)}
                    onKeyDown={e => e.key === 'Enter' && handleWaitlist()}
                    style={{ flex: 1, background: SURFACE, border: `1.5px solid ${BORDER}`, borderRadius: 10, padding: '10px 14px', fontSize: 13, outline: 'none', fontFamily: 'inherit', color: INK }}
                  />
                  <button onClick={handleWaitlist} disabled={waitlistLoading || !waitlistEmail}
                    style={{ background: TEAL, color: N, border: 'none', borderRadius: 10, padding: '10px 16px', fontSize: 13, fontWeight: 700, cursor: !waitlistEmail || waitlistLoading ? 'default' : 'pointer', opacity: !waitlistEmail || waitlistLoading ? 0.6 : 1, fontFamily: 'inherit', whiteSpace: 'nowrap' as const }}>
                    {waitlistLoading ? '…' : 'Get early access'}
                  </button>
                </div>
              </div>
            ) : (
              <div style={{ marginBottom: 20, display: 'flex', alignItems: 'center', gap: 8 }}>
                <span style={{ width: 20, height: 20, borderRadius: '50%', background: TEAL_LIGHT, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, color: TEAL_DARK, fontWeight: 700 }}>✓</span>
                <span style={{ fontSize: 14, color: TEAL_DARK, fontWeight: 600 }}>You're on the list! We'll be in touch soon.</span>
              </div>
            )}

            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <div style={{ display: 'flex' }}>
                {['#FF8A65', '#42A5F5', '#66BB6A', '#AB47BC'].map((c, i) => (
                  <div key={i} style={{ width: 28, height: 28, borderRadius: '50%', background: c, border: '2px solid white', marginLeft: i > 0 ? -8 : 0, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 10, fontWeight: 700, color: 'white' }}>
                    {['AJ', 'MG', 'DK', 'SC'][i]}
                  </div>
                ))}
              </div>
              <span style={{ fontSize: 13, color: INK_MUTED }}>Managing 1–50 units · No credit card required</span>
            </div>
          </div>
          <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
            <DashboardMockup />
          </div>
        </div>
      </section>

      {/* PROBLEM */}
      <section className="landing-section" style={{ background: SURFACE, padding: '80px 40px' }}>
        <div style={{ maxWidth: 1100, margin: '0 auto' }}>
          <div style={{ textAlign: 'center', marginBottom: 52 }}>
            <h2 className="landing-h2" style={{ fontSize: 38, fontWeight: 800, color: N, letterSpacing: '-0.8px', margin: '0 0 12px' }}>
              Managing rentals shouldn't feel<br className="landing-h2-br" />like a second job.
            </h2>
            <p style={{ fontSize: 16, color: INK_MUTED, margin: 0 }}>Sound familiar?</p>
          </div>
          <div className="landing-pain-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 20 }}>
            {[
              { icon: '💸', title: 'Chasing rent payments every month', desc: "Texting tenants, logging into bank accounts, manually tracking who has and hasn't paid." },
              { icon: '📝', title: 'Drafting the same letters over and over', desc: 'Late notices, lease renewals, entry notices — all written from scratch, every time.' },
              { icon: '🗂️', title: 'Losing track of leases and documents', desc: 'Lease terms buried in PDFs, maintenance history in text threads, docs scattered across folders.' },
            ].map(card => (
              <div key={card.title} className="landing-pain-card"
                style={{ background: BG, borderRadius: 16, padding: '28px 24px', border: `1px solid ${BORDER}`, transition: 'all 0.2s' }}>
                <div style={{ fontSize: 36, marginBottom: 16 }}>{card.icon}</div>
                <div style={{ fontSize: 16, fontWeight: 700, color: N, marginBottom: 10, lineHeight: 1.3 }}>{card.title}</div>
                <div style={{ fontSize: 14, color: INK_MID, lineHeight: 1.6 }}>{card.desc}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* FEATURES */}
      <section ref={featuresRef} className="landing-section" style={{ background: BG, padding: '80px 40px' }}>
        <div style={{ maxWidth: 1100, margin: '0 auto' }}>
          <div style={{ textAlign: 'center', marginBottom: 52 }}>
            <div style={{ display: 'inline-block', background: TEAL_LIGHT, border: `1px solid ${TEAL}44`, borderRadius: 100, padding: '4px 14px', marginBottom: 16 }}>
              <span style={{ fontSize: 12, fontWeight: 700, color: TEAL_DARK, textTransform: 'uppercase' as const, letterSpacing: '0.8px' }}>Features</span>
            </div>
            <h2 className="landing-h2" style={{ fontSize: 38, fontWeight: 800, color: N, letterSpacing: '-0.8px', margin: '0 0 12px' }}>
              Everything you need.<br className="landing-h2-br" />Nothing you don't.
            </h2>
          </div>
          <div className="landing-grid-3" style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 16 }}>
            {[
              { icon: '✦', title: 'AI Lease Extraction', desc: 'Drop a PDF. Keywise extracts every term — including late fees, payment dates, and clauses — automatically.', accent: true },
              { icon: '💳', title: 'Online Rent Collection', desc: 'Tenants pay online. You get paid faster. Automatic reminders handle the follow-ups.', accent: false },
              { icon: '✦', title: 'Smart Communications', desc: 'Late notices, renewals, entry notices — drafted in seconds with AI, ready to send in one click.', accent: true },
              { icon: '🔧', title: 'Maintenance Tracking', desc: 'Log issues, assign contractors, and track every repair from open to resolved.', accent: false },
              { icon: '📁', title: 'Document Storage', desc: 'Leases, insurance certificates, inspection reports — organized, searchable, always accessible.', accent: false },
              { icon: '🏘️', title: 'Portfolio Overview', desc: 'Buildings, units, cash flow, occupancy — see your whole portfolio at a glance.', accent: false },
            ].map(f => (
              <div key={f.title} className="landing-feature-card"
                style={{ background: SURFACE, borderRadius: 14, padding: '24px', border: `1px solid ${BORDER}`, transition: 'all 0.2s', boxShadow: '0 1px 4px rgba(15,52,96,0.06)' }}>
                <div style={{ width: 44, height: 44, borderRadius: 12, background: f.accent ? `linear-gradient(135deg, ${N}, #1a4a7a)` : BG, display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 16, fontSize: f.accent ? 18 : 22, color: f.accent ? TEAL : N }}>
                  {f.icon}
                </div>
                <div style={{ fontSize: 15, fontWeight: 700, color: N, marginBottom: 8 }}>{f.title}</div>
                <div style={{ fontSize: 13, color: INK_MID, lineHeight: 1.6 }}>{f.desc}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* HOW IT WORKS */}
      <section className="landing-section" style={{ background: SURFACE, padding: '80px 40px' }}>
        <div style={{ maxWidth: 1100, margin: '0 auto' }}>
          <div style={{ textAlign: 'center', marginBottom: 56 }}>
            <h2 className="landing-h2" style={{ fontSize: 38, fontWeight: 800, color: N, letterSpacing: '-0.8px', margin: '0 0 12px' }}>
              Up and running in minutes.
            </h2>
            <p style={{ fontSize: 16, color: INK_MUTED, margin: 0 }}>No setup calls. No migration headaches. Just sign up and go.</p>
          </div>
          <div className="landing-steps-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 0, position: 'relative' }}>
            <div className="landing-steps-connector" style={{ position: 'absolute', top: 36, left: '16.67%', right: '16.67%', height: 2, background: `linear-gradient(90deg, ${TEAL}44, ${TEAL}, ${TEAL}44)`, zIndex: 0 }} />
            {[
              { num: '1', title: 'Import your documents', desc: 'Drop your existing leases and documents. Keywise reads them and sets everything up — tenant names, rent amounts, lease dates, late fees.' },
              { num: '2', title: 'Invite your tenants', desc: 'Send a magic link in one click. Tenants get access to their portal where they can view their lease and pay rent online.' },
              { num: '3', title: 'Manage everything in one place', desc: 'Dashboard, communications, maintenance, payments — all connected, all organized, no more scattered apps.' },
            ].map(step => (
              <div key={step.num} style={{ textAlign: 'center', padding: '0 28px', position: 'relative', zIndex: 1 }}>
                <div style={{ width: 72, height: 72, borderRadius: '50%', background: N, display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 20px', boxShadow: `0 0 0 6px ${TEAL_LIGHT}, 0 8px 24px rgba(15,52,96,0.2)` }}>
                  <span style={{ fontSize: 24, fontWeight: 800, color: TEAL }}>{step.num}</span>
                </div>
                <div style={{ fontSize: 17, fontWeight: 700, color: N, marginBottom: 10 }}>{step.title}</div>
                <div style={{ fontSize: 14, color: INK_MID, lineHeight: 1.65 }}>{step.desc}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* COMPARISON */}
      <section className="landing-section" style={{ padding: '80px 40px', background: '#fff' }}>
        <div style={{ maxWidth: 900, margin: '0 auto' }}>
          <div style={{ textAlign: 'center', marginBottom: 48 }}>
            <h2 className="landing-h2" style={{ fontSize: 36, fontWeight: 800, color: N, marginBottom: 12, letterSpacing: '-0.8px' }}>
              Why landlords choose Keywise
            </h2>
            <p style={{ color: INK_MUTED, fontSize: 16, maxWidth: 500, margin: '0 auto' }}>
              Professional property management tools at a fraction of the cost.
            </p>
          </div>

          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 14 }}>
              <thead>
                <tr>
                  <th style={{ padding: '16px', textAlign: 'left', color: INK_MUTED, fontWeight: 600, borderBottom: `2px solid ${BORDER}`, minWidth: 160 }}>Feature</th>
                  <th style={{ padding: '16px', textAlign: 'center', background: N, color: '#fff', fontWeight: 700, borderRadius: '12px 12px 0 0', minWidth: 120 }}>
                    Keywise
                    <div style={{ fontSize: 11, fontWeight: 400, color: TEAL, marginTop: 2 }}>$19/mo</div>
                  </th>
                  <th style={{ padding: '16px', textAlign: 'center', color: INK_MUTED, fontWeight: 600, borderBottom: `2px solid ${BORDER}`, minWidth: 120 }}>
                    Buildium
                    <div style={{ fontSize: 11, fontWeight: 400, marginTop: 2 }}>$50+/mo</div>
                  </th>
                  <th style={{ padding: '16px', textAlign: 'center', color: INK_MUTED, fontWeight: 600, borderBottom: `2px solid ${BORDER}`, minWidth: 120 }}>
                    AppFolio
                    <div style={{ fontSize: 11, fontWeight: 400, marginTop: 2 }}>$280+/mo</div>
                  </th>
                  <th style={{ padding: '16px', textAlign: 'center', color: INK_MUTED, fontWeight: 600, borderBottom: `2px solid ${BORDER}`, minWidth: 120 }}>
                    Innago
                    <div style={{ fontSize: 11, fontWeight: 400, marginTop: 2 }}>Free*</div>
                  </th>
                </tr>
              </thead>
              <tbody>
                {[
                  { feature: 'AI Lease PDF Extraction', keywise: true, buildium: false, appfolio: false, innago: false },
                  { feature: 'AI Smart Actions (proactive)', keywise: true, buildium: false, appfolio: false, innago: false },
                  { feature: 'AI Transparency (shows its work)', keywise: true, buildium: false, appfolio: false, innago: false },
                  { feature: 'Free for 1-2 Units', keywise: true, buildium: false, appfolio: false, innago: true },
                  { feature: 'Online Rent Collection', keywise: true, buildium: true, appfolio: true, innago: true },
                  { feature: 'Native Document Signing', keywise: true, buildium: false, appfolio: false, innago: false },
                  { feature: 'Move-In/Out Inspections', keywise: true, buildium: true, appfolio: true, innago: false },
                  { feature: 'Tenant Auto-Pay', keywise: true, buildium: true, appfolio: true, innago: true },
                  { feature: 'AI Communications', keywise: true, buildium: false, appfolio: false, innago: false },
                  { feature: 'Tenant Portal', keywise: true, buildium: true, appfolio: true, innago: true },
                  { feature: 'Maintenance Tracking', keywise: true, buildium: true, appfolio: true, innago: true },
                  { feature: 'No Per-Unit Fees', keywise: true, buildium: false, appfolio: false, innago: false },
                ].map((row, i) => {
                  const Check = () => <span style={{ color: '#00A86B', fontSize: 18, fontWeight: 700 }}>✓</span>;
                  const X = () => <span style={{ color: '#FF6B6B', fontSize: 18 }}>✗</span>;
                  return (
                    <tr key={i} style={{ background: i % 2 === 0 ? BG : '#fff' }}>
                      <td style={{ padding: '14px 16px', color: INK, fontWeight: 500 }}>{row.feature}</td>
                      <td style={{ padding: '14px 16px', textAlign: 'center', background: i % 2 === 0 ? '#E8F0FF' : '#F0F4FF' }}>{row.keywise ? <Check /> : <X />}</td>
                      <td style={{ padding: '14px 16px', textAlign: 'center' }}>{row.buildium ? <Check /> : <X />}</td>
                      <td style={{ padding: '14px 16px', textAlign: 'center' }}>{row.appfolio ? <Check /> : <X />}</td>
                      <td style={{ padding: '14px 16px', textAlign: 'center' }}>{row.innago ? <Check /> : <X />}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          <p style={{ color: INK_MUTED, fontSize: 12, marginTop: 16, textAlign: 'center' }}>
            *Innago is free but charges higher transaction fees. Competitor pricing based on publicly available information.
          </p>

          <div style={{ textAlign: 'center', marginTop: 40 }}>
            <button onClick={openSignup}
              style={{ background: N, color: '#fff', border: 'none', padding: '14px 36px', borderRadius: 10, fontSize: 16, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit' }}>
              Start Free — No Credit Card Required →
            </button>
            <div style={{ color: INK_MUTED, fontSize: 12, marginTop: 8 }}>
              Free forever for 1-2 units · $19/mo for unlimited units
            </div>
          </div>
        </div>
      </section>

      {/* PRICING */}
      <section className="landing-section" style={{ background: BG, padding: '80px 40px' }}>
        <div style={{ maxWidth: 1100, margin: '0 auto' }}>
          <div style={{ textAlign: 'center', marginBottom: 52 }}>
            <h2 className="landing-h2" style={{ fontSize: 38, fontWeight: 800, color: N, letterSpacing: '-0.8px', margin: '0 0 12px' }}>
              Simple pricing that grows with you.
            </h2>
            <p style={{ fontSize: 16, color: INK_MUTED, margin: 0 }}>No contracts. Cancel anytime.</p>
          </div>
          <div className="landing-grid-2" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20, maxWidth: 720, margin: '0 auto' }}>
            <div className="landing-pricing-card"
              style={{ background: SURFACE, borderRadius: 20, padding: '32px 28px', border: `1px solid ${BORDER}`, boxShadow: '0 2px 8px rgba(15,52,96,0.06)', transition: 'all 0.2s' }}>
              <div style={{ fontSize: 13, fontWeight: 700, color: INK_MUTED, textTransform: 'uppercase' as const, letterSpacing: '0.8px', marginBottom: 8 }}>Free</div>
              <div style={{ display: 'flex', alignItems: 'baseline', gap: 4, marginBottom: 6 }}>
                <span style={{ fontSize: 44, fontWeight: 800, color: N, letterSpacing: '-2px' }}>$0</span>
                <span style={{ fontSize: 14, color: INK_MUTED }}>/forever</span>
              </div>
              <div style={{ fontSize: 13, color: INK_MID, marginBottom: 28 }}>Up to 2 units</div>
              <div style={{ borderTop: `1px solid ${BORDER}`, paddingTop: 20, marginBottom: 28 }}>
                {['Lease tracking', 'Document storage', 'AI communications', 'Tenant portal'].map(f => (
                  <div key={f} style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10, fontSize: 14, color: INK_MID }}>
                    <span style={{ color: TEAL_DARK, fontWeight: 700, fontSize: 16 }}>✓</span> {f}
                  </div>
                ))}
              </div>
              <button onClick={openSignup} className="landing-btn-ghost"
                style={{ width: '100%', background: 'transparent', color: N, border: `1.5px solid ${BORDER}`, borderRadius: 10, padding: '12px', fontSize: 14, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit', transition: 'all 0.15s' }}>
                Get started free →
              </button>
            </div>
            <div className="landing-pricing-card"
              style={{ background: N, borderRadius: 20, padding: '32px 28px', border: `2px solid ${TEAL}44`, boxShadow: `0 8px 32px rgba(15,52,96,0.2), 0 0 0 1px ${TEAL}22`, transition: 'all 0.2s', position: 'relative', overflow: 'hidden' }}>
              <div style={{ position: 'absolute', top: -30, right: -30, width: 120, height: 120, borderRadius: '50%', background: `${TEAL}12` }} />
              <div style={{ position: 'absolute', bottom: -20, left: -20, width: 80, height: 80, borderRadius: '50%', background: `${TEAL}08` }} />
              <div style={{ position: 'relative' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                  <span style={{ fontSize: 13, fontWeight: 700, color: 'rgba(255,255,255,0.6)', textTransform: 'uppercase' as const, letterSpacing: '0.8px' }}>Pro</span>
                  <span style={{ fontSize: 11, fontWeight: 700, background: TEAL, color: N, padding: '3px 10px', borderRadius: 100 }}>POPULAR</span>
                </div>
                <div style={{ display: 'flex', alignItems: 'baseline', gap: 4, marginBottom: 6 }}>
                  <span style={{ fontSize: 44, fontWeight: 800, color: '#fff', letterSpacing: '-2px' }}>$19</span>
                  <span style={{ fontSize: 14, color: 'rgba(255,255,255,0.5)' }}>/mo</span>
                </div>
                <div style={{ fontSize: 13, color: 'rgba(255,255,255,0.5)', marginBottom: 28 }}>Unlimited units</div>
                <div style={{ borderTop: '1px solid rgba(255,255,255,0.1)', paddingTop: 20, marginBottom: 28 }}>
                  {['Everything in Free', 'Online rent collection', 'Payment reminders', 'Maintenance tracking', 'Priority support'].map(f => (
                    <div key={f} style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10, fontSize: 14, color: 'rgba(255,255,255,0.8)' }}>
                      <span style={{ color: TEAL, fontWeight: 700, fontSize: 16 }}>✓</span> {f}
                    </div>
                  ))}
                </div>
                <button onClick={openSignup} className="landing-btn-teal"
                  style={{ width: '100%', background: TEAL, color: N, border: 'none', borderRadius: 10, padding: '12px', fontSize: 14, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit', transition: 'all 0.15s' }}>
                  Start free trial →
                </button>
              </div>
            </div>
          </div>
          <p style={{ textAlign: 'center', fontSize: 13, color: INK_MUTED, marginTop: 20 }}>
            $2 per online payment transaction. No hidden fees.
          </p>
        </div>
      </section>

      {/* FINAL CTA */}
      <section style={{ background: `linear-gradient(135deg, ${N} 0%, #1a3a6e 50%, #0d2844 100%)`, padding: '100px 40px', position: 'relative', overflow: 'hidden' }}>
        <div style={{ position: 'absolute', top: -60, right: -60, width: 300, height: 300, borderRadius: '50%', background: `${TEAL}08` }} />
        <div style={{ position: 'absolute', bottom: -40, left: -40, width: 200, height: 200, borderRadius: '50%', background: `${TEAL}06` }} />
        <div style={{ maxWidth: 640, margin: '0 auto', textAlign: 'center', position: 'relative' }}>
          <div style={{ width: 64, height: 64, borderRadius: 16, background: `${TEAL}18`, border: `1px solid ${TEAL}33`, display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 24px', fontSize: 28 }}>🏠</div>
          <h2 className="landing-final-h2" style={{ fontSize: 42, fontWeight: 800, color: '#fff', letterSpacing: '-1px', margin: '0 0 16px', lineHeight: 1.1 }}>
            Ready to manage smarter?
          </h2>
          <p style={{ fontSize: 17, color: 'rgba(255,255,255,0.6)', margin: '0 0 36px', lineHeight: 1.6 }}>
            Join landlords who've replaced spreadsheets and late-night emails with Keywise.
          </p>
          <button onClick={openSignup} className="landing-btn-teal"
            style={{ background: TEAL, color: N, border: 'none', borderRadius: 14, padding: '16px 40px', fontSize: 17, fontWeight: 800, cursor: 'pointer', fontFamily: 'inherit', transition: 'all 0.15s', boxShadow: `0 8px 32px ${TEAL}44` }}>
            Start for free →
          </button>
          <p style={{ fontSize: 13, color: 'rgba(255,255,255,0.35)', marginTop: 16 }}>No credit card required · Setup in minutes</p>
        </div>
      </section>

      {/* FOOTER */}
      <footer style={{ background: INK, padding: '32px 40px' }}>
        <div className="landing-footer-inner" style={{ maxWidth: 1100, margin: '0 auto', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 16 }}>
          <Logo size={24} dark />
          <div style={{ display: 'flex', gap: 24, alignItems: 'center', flexWrap: 'wrap' }}>
            {[{ label: 'Blog', href: '/blog' }, { label: 'Privacy', href: '/privacy' }, { label: 'Terms', href: '/terms' }, { label: 'Contact', href: '/contact' }].map(link => (
              <a key={link.label} href={link.href}
                style={{ fontSize: 13, color: 'rgba(255,255,255,0.4)', textDecoration: 'none', fontWeight: 500 }}
                onMouseEnter={e => (e.currentTarget as HTMLAnchorElement).style.color = 'rgba(255,255,255,0.7)'}
                onMouseLeave={e => (e.currentTarget as HTMLAnchorElement).style.color = 'rgba(255,255,255,0.4)'}>
                {link.label}
              </a>
            ))}
          </div>
          <div style={{ fontSize: 13, color: 'rgba(255,255,255,0.3)' }}>
            © 2026 Keywise. Property management, made intelligent.
          </div>
        </div>
      </footer>

      {authMode && <AuthModal mode={authMode} onClose={closeAuth} />}
    </div>
  );
}
