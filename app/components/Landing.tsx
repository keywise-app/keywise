'use client';
import { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { supabase } from '../lib/supabase';
import { acquisitionSource, captureAcquisition, trackGrowth } from '../lib/growth';
import { brand, brandWorkflows, brandSteps, brandFaqs } from '../lib/brand';

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
        <rect width="32" height="32" rx="8" fill={N} />
        <circle cx="13" cy="16" r="5.5" fill="none" stroke={TEAL} strokeWidth="2.5" />
        <circle cx="13" cy="16" r="2" fill={TEAL} />
        <rect x="17.5" y="14.75" width="8" height="2.5" rx="1.25" fill={TEAL} />
        <rect x="22" y="17.25" width="4" height="2" rx="1" fill={TEAL} />
        <rect x="19" y="17.25" width="2.5" height="2" rx="1" fill={TEAL} />
      </svg>
      <span style={{ fontSize: size * 0.56, fontWeight: 700, color: dark ? SURFACE : N, letterSpacing: '-0.4px' }}>
        {brand.name}
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
            <Logo size={22} dark />
          </div>
          {[
            { icon: '⊞', label: 'Dashboard', active: true },
            { icon: '⌂', label: 'Portfolio', active: false },
            { icon: '◈', label: 'Tenants', active: false },
            { icon: '⚖', label: 'Compliance', active: false },
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
              { label: 'Scheduled rent', value: '$8,400', color: N },
              { label: 'Collected', value: '$4,300', color: '#0F7040' },
              { label: 'Outstanding', value: '$4,100', color: '#9A6500' },
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
            send_to: 'AW-18416062236/NqrGCJuOru8cEJyeu81E',
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
    ? 'Welcome back. Your rentals are right here.'
    : 'Start with one property. Build from there.';

  return (
    <div
      style={{ position: 'fixed', inset: 0, background: 'rgba(15,52,96,0.6)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20, backdropFilter: 'blur(4px)' }}
      onClick={e => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div role="dialog" aria-modal="true" aria-label={mode === 'login' ? 'Log in to Keywise' : 'Create a Keywise account'} style={{ width: '100%', maxWidth: 420, background: SURFACE, borderRadius: 20, padding: 36, boxShadow: '0 24px 80px rgba(15,52,96,0.25)', position: 'relative', fontFamily: "'Inter', system-ui, sans-serif" }}>
        <button aria-label="Close sign-in dialog" onClick={onClose} style={{ position: 'absolute', top: 16, right: 16, background: 'none', border: 'none', fontSize: 22, cursor: 'pointer', color: INK_MUTED, lineHeight: 1, padding: 4 }}>×</button>

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
 const [email, setEmail] = useState('');
 const [busy, setBusy] = useState(false);
 const [sent, setSent] = useState(false);
 const [error, setError] = useState('');
 const [menuOpen, setMenuOpen] = useState(false);
 const emailRef = useRef<HTMLInputElement>(null);
 const signupRef = useRef<HTMLFormElement>(null);
 const demoRef = useRef<HTMLElement>(null);
 const track = (event: string, placement: string) => {
  trackGrowth(event, placement);
 };
 const start = (placement: string) => {
  setMenuOpen(false); track('signup_cta_clicked',placement);
  signupRef.current?.scrollIntoView({ behavior:'smooth',block:'center' });
  emailRef.current?.focus({ preventScroll:true });
 };
 useEffect(() => {
  captureAcquisition();
  const params = new URLSearchParams(window.location.search);
  if (params.get('login') === 'true') setAuthMode('login');
  if (params.get('signup') === 'true') emailRef.current?.focus();
  fetch('/api/track-visit',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({page:'/',referrer:document.referrer || 'direct',user_agent:navigator.userAgent})}).catch(() => {});
 }, []);
 async function submit(event: React.FormEvent) {
  event.preventDefault(); setBusy(true); setError(''); track('signup_link_requested','hero');
  try {
   const { error } = await supabase.auth.signInWithOtp({email:email.trim(),options:{emailRedirectTo:`https://keywise.app/?welcome=true&source=${acquisitionSource(sessionStorage.getItem('kw_acquisition_v1'))}`,shouldCreateUser:true}});
   if (error) throw error;
   setSent(true); track('signup_link_sent','hero');
  } catch (error) { setError((error as Error).message || 'We couldn’t send your link. Please try again.'); }
  finally { setBusy(false); }
 }
 return <div className="kw-marketing">
  <style>{`
   .kw-marketing{--kw-navy:#0F3460;--kw-ink:#253950;--kw-muted:#55677B;--kw-line:#DEE6EA;font-family:var(--font-inter),Inter,system-ui,sans-serif;background:#fff;color:var(--kw-ink);overflow-x:clip;line-height:1.6}
   .kw-marketing *{box-sizing:border-box}.kw-marketing h1,.kw-marketing h2,.kw-marketing h3{color:var(--kw-navy);line-height:1.12;letter-spacing:-.035em}.kw-marketing h2{font-size:clamp(30px,4vw,44px);margin:0 0 18px}.kw-marketing h3{font-size:23px;margin:0 0 12px}
   .kw-marketing a{color:inherit}.kw-shell{max-width:1180px;margin:auto;padding:0 32px}.kw-nav{display:flex;align-items:center;justify-content:space-between;min-height:82px;gap:24px}.kw-nav-links{display:flex;align-items:center;gap:26px}.kw-nav a{text-decoration:none;font-size:14px;font-weight:600}.kw-button{border:0;border-radius:10px;background:#0F3460;color:white;padding:13px 20px;font:inherit;font-size:14px;font-weight:650;cursor:pointer;text-decoration:none;display:inline-flex;align-items:center;justify-content:center;min-height:48px;transition:background .15s}.kw-button:hover{background:#194D7C}.kw-button:disabled{opacity:.6;cursor:wait}.kw-button-light{background:white;color:#0F3460;border:1px solid #C6D3DE}.kw-button-light:hover{background:#EFF5F8}.kw-button-teal{background:#00D4AA;color:#0F3460}.kw-button-teal:hover{background:#53E7C9}.kw-marketing :focus-visible{outline:3px solid #007E68;outline-offset:4px}.kw-eyebrow{font-size:12px;font-weight:750;letter-spacing:.11em;text-transform:uppercase;color:#006D5A;margin:0 0 18px}.kw-hero{background:#F3F7F7;border-bottom:1px solid var(--kw-line);padding:80px 0 72px}.kw-hero-grid{display:grid;grid-template-columns:1fr 1.05fr;gap:56px;align-items:center}.kw-hero h1{font-size:clamp(48px,5.5vw,72px);font-weight:760;margin:0 0 24px;line-height:1.04;max-width:580px}.kw-lede{font-size:18px;color:var(--kw-muted);max-width:510px;margin:0 0 24px}.kw-signup-row{display:flex;gap:8px;margin-top:8px}.kw-signup-row input{min-width:0;flex:1;background:white;border:1px solid #BBCBD4;border-radius:10px;padding:14px;font:inherit;font-size:15px;color:#253950}.kw-proof{display:flex;flex-wrap:wrap;gap:8px 18px;font-size:12px;color:#456070;margin:14px 0}.kw-proof span::before{content:'✓';color:#007E68;margin-right:6px}.kw-preview-label{display:flex;align-items:center;justify-content:space-between;gap:12px;font-size:11px;color:#55677B;margin-bottom:14px;letter-spacing:.08em;text-transform:uppercase;font-weight:700}.kw-preview .landing-mockup{transform:none!important;box-shadow:0 20px 50px #0F346020!important}.kw-text-button{background:none;border:0;padding:0;font:inherit;font-weight:650;cursor:pointer;color:#0F3460;text-decoration:underline;text-underline-offset:4px}.kw-section{padding:88px 0}.kw-intro{max-width:650px;margin-bottom:42px}.kw-intro p{font-size:17px;color:var(--kw-muted);margin:0}.kw-workflows{display:grid;grid-template-columns:repeat(3,1fr);gap:32px}.kw-workflow{border-top:2px solid #0F3460;padding-top:22px}.kw-number{font-size:13px;color:#007D68;font-weight:750;margin-bottom:22px}.kw-workflow p{font-size:15px;color:var(--kw-muted);margin:0 0 22px}.kw-example{background:#F2F6F8;border:1px solid #DFE8ED;border-radius:10px;padding:16px;font-size:13px;color:#3B526B;min-height:108px}.kw-example strong{display:block;color:#0F3460;margin-bottom:6px}.kw-onboard{background:#0F3460;color:white}.kw-onboard h2,.kw-onboard h3{color:white}.kw-onboard p{color:#C8D7E7}.kw-steps{display:grid;grid-template-columns:repeat(3,1fr);gap:36px;margin:36px 0}.kw-steps .kw-number{color:#4AE2C4;border-bottom:1px solid #456382;padding-bottom:14px}.kw-steps h3{font-size:21px}.kw-steps p{font-size:14px}.kw-tool-row{display:grid;grid-template-columns:1fr 1fr;gap:64px;align-items:start}.kw-tools a{display:block;padding:16px 0;border-bottom:1px solid var(--kw-line);font-weight:650;text-decoration:none;color:#0F3460}.kw-founder{background:#F3F7F7;border-radius:18px;padding:32px;border:1px solid var(--kw-line)}.kw-founder p{font-size:16px;color:#55677B}.kw-pricing{display:grid;grid-template-columns:1fr 1fr;gap:24px}.kw-price-card{border:1px solid #D3DEE5;border-radius:16px;padding:32px}.kw-price-card ul{padding-left:20px;margin:22px 0;font-size:14px}.kw-price-card li{margin:8px 0}.kw-price{font-size:44px;font-weight:750;color:#0F3460;letter-spacing:-.04em}.kw-faq details{border-bottom:1px solid var(--kw-line);padding:20px 0}.kw-faq summary{cursor:pointer;font-weight:650;color:#0F3460;list-style-position:outside;margin-left:20px}.kw-faq p{color:var(--kw-muted);font-size:15px;max-width:720px;margin-bottom:0}.kw-footer{background:#F3F7F7;border-top:1px solid var(--kw-line);padding:42px 0}.kw-footer-row{display:flex;flex-wrap:wrap;gap:28px;justify-content:space-between}.kw-footer nav{display:flex;gap:22px;flex-wrap:wrap;font-size:13px}.kw-footer p{font-size:12px;color:#55677B}.kw-menu-button{display:none}.kw-mobile-links{display:none}
   @media(max-width:960px){.kw-hero-grid{grid-template-columns:1fr;gap:42px}.kw-hero h1{max-width:720px}.kw-preview{max-width:680px;width:100%}.kw-workflows{gap:22px}.kw-tool-row{gap:32px}.kw-nav-links{gap:18px}}
   @media(max-width:680px){.kw-shell{padding:0 22px}.kw-hero{padding:44px 0}.kw-hero h1{font-size:48px}.kw-hero h1 br{display:none}.kw-lede{font-size:17px}.kw-nav{min-height:72px}.kw-nav-links{display:none}.kw-menu-button{display:block}.kw-mobile-links{display:flex;flex-direction:column;gap:18px;padding:8px 0 24px}.kw-section{padding:58px 0}.kw-signup-row{flex-direction:column}.kw-signup-row .kw-button{width:100%}.kw-workflows,.kw-steps,.kw-tool-row,.kw-pricing{grid-template-columns:1fr}.kw-workflows{gap:30px}.kw-preview .landing-mockup>div:nth-child(2)>div:first-child{display:none}.kw-preview .landing-mockup>div:nth-child(2){height:340px!important}.kw-founder,.kw-price-card{padding:24px}.kw-footer-row{gap:24px}.kw-preview-label{font-size:10px}}
   @media(prefers-reduced-motion:reduce){.kw-marketing *{scroll-behavior:auto!important;transition:none!important}}
  `}</style>
  <a href="#main" style={{position:'absolute',left:-10000}} onFocus={e => {e.currentTarget.style.left='16px';}} onBlur={e => {e.currentTarget.style.left='-10000px';}}>Skip to content</a>
  <header style={{borderBottom:`1px solid ${BORDER}`}}>
   <nav className="kw-shell kw-nav" aria-label="Main navigation">
    <Link href="/" aria-label="Keywise home" style={{textDecoration:'none'}}><Logo size={36}/></Link>
    <div className="kw-nav-links"><a href="#how-it-works">How it works</a><Link href="/pricing">Pricing</Link><a href="/tools">California tools</a><button className="kw-text-button" onClick={() => setAuthMode('login')}>Log in</button><button className="kw-button" onClick={() => start('header')}>Set up my rental</button></div>
    <button className="kw-button kw-button-light kw-menu-button" aria-expanded={menuOpen} aria-controls="kw-mobile-menu" onClick={() => setMenuOpen(!menuOpen)}>Menu</button>
   </nav>
   {menuOpen && <div id="kw-mobile-menu" className="kw-shell kw-mobile-links"><a href="#how-it-works" onClick={() => setMenuOpen(false)}>How it works</a><Link href="/pricing">Pricing</Link><Link href="/tools">California tools</Link><button className="kw-text-button" onClick={() => {setAuthMode('login');setMenuOpen(false);}}>Log in</button><button className="kw-button" onClick={() => start('mobile-menu')}>Set up my rental</button></div>}
  </header>
  <main id="main">
   <section className="kw-hero">
    <div className="kw-shell kw-hero-grid">
     <div><p className="kw-eyebrow">{brand.category}</p><h1>Your rental is already running.<br/>Get it under control.</h1><p className="kw-lede">{brand.description}</p>
      <form ref={signupRef} onSubmit={submit} aria-label="Start your free Keywise account">
       {sent ? <div role="status" style={{background:TEAL_LIGHT,border:'1px solid #B4DCCF',borderRadius:12,padding:20}}><strong>Check your email to get started.</strong><p style={{fontSize:14,margin:'8px 0'}}>Open your sign-in link, then add your first property. You can close this page.</p><button type="button" className="kw-text-button" onClick={() => {setSent(false);setError('');}}>Use a different email or resend</button></div> : <><label htmlFor="kw-start-email" style={{fontSize:13,fontWeight:650}}>Your email</label><div className="kw-signup-row"><input ref={emailRef} id="kw-start-email" type="email" autoComplete="email" required value={email} onChange={e => setEmail(e.target.value)} placeholder="you@example.com" aria-describedby="kw-start-details" disabled={busy}/><button className="kw-button" disabled={busy}>{busy?'Sending your link…':brand.primaryAction+' →'}</button></div><p id="kw-start-details" style={{fontSize:12,color:'#55677B',margin:'10px 0'}}>We’ll email you a sign-in link. No password to remember.</p></>}
       {error && <p role="alert" style={{color:'#B33035',fontSize:13}}>{error}</p>}
      </form>
      <div className="kw-proof"><span>{brand.freeLabel}</span><span>No credit card</span><span>Invite tenants later</span></div>
      <p style={{fontSize:11,color:'#55677B'}}>By continuing, you agree to our <Link href="/terms">Terms</Link> and <Link href="/privacy">Privacy Policy</Link>.</p>
      <button className="kw-text-button" style={{fontSize:14,marginTop:12}} onClick={() => {track('demo_viewed','hero');demoRef.current?.scrollIntoView({behavior:'smooth'});}}>{brand.secondaryAction} ↓</button>
     </div>
     <div className="kw-preview"><div className="kw-preview-label"><span>A clearer view of your rentals</span><span>Illustrative sample</span></div><DashboardMockup/><p style={{fontSize:12,color:'#55677B',marginTop:18}}>Rent, tenants and the next thing to handle. Together.</p></div>
    </div>
   </section>
   <section ref={demoRef} id="how-it-works" className="kw-section" style={{scrollMarginTop:24}}>
    <div className="kw-shell"><div className="kw-intro"><p className="kw-eyebrow">Less scattered. More settled.</p><h2>Know what needs you.<br/>Then get on with your day.</h2><p>A missed payment, a leaking faucet, a lease coming up for renewal. Keep the work and its history together.</p></div>
     <div className="kw-workflows">{brandWorkflows.map((w,i) => <article className="kw-workflow" key={w.number}><div className="kw-number">{w.number} / {w.label}</div><h3>{w.title}</h3><p>{w.detail}</p><div className="kw-example"><strong>{['Rent recorded · Unit A','Kitchen faucet · In progress','Lease renewal · Due next month'][i]}</strong>{['See what is paid, due and outstanding.','Follow the request, photos and latest update.','Open the lease and find the tenant details.'][i]}<div style={{fontSize:10,marginTop:8,color:'#55677B'}}>Illustrative example</div></div></article>)}</div>
    </div>
   </section>
   <section className="kw-section kw-onboard"><div className="kw-shell"><p className="kw-eyebrow" style={{color:'#4AE2C4'}}>A small first step</p><h2>You don’t have to move everything at once.</h2><p style={{maxWidth:640,fontSize:17}}>Start with one property and one useful task. Bring the rest into Keywise at your own pace.</p><div className="kw-steps">{brandSteps.map((step,i) => <article key={step.title}><div className="kw-number">0{i+1}</div><h3>{step.title}</h3><p>{step.detail}</p></article>)}</div><button className="kw-button kw-button-teal" onClick={() => start('steps')}>{brand.primaryAction} →</button></div></section>
   <section className="kw-section"><div className="kw-shell kw-tool-row"><div><p className="kw-eyebrow">Built from everyday experience</p><h2>For the person who owns the rental—and handles the details.</h2><p style={{fontSize:17,color:'#55677B'}}>Keywise was built by an independent landlord in Southern California. The focus is practical: make the next task easier, keep a useful record and avoid entering the same details over and over.</p><Link href="/about/chris" style={{fontWeight:650}}>Meet the founder →</Link></div><aside className="kw-founder"><p className="kw-eyebrow">Also renting in California?</p><h3>Tools for the details that deserve a closer look.</h3><p>Explore dedicated California calculators and notice tools alongside your everyday property records.</p><div className="kw-tools"><Link href="/tools/ca/ab1482-calculator">Rent increase calculator →</Link><Link href="/tools/ca/security-deposit-21-day">Security deposit deadline guide →</Link><Link href="/tools">Explore California tools →</Link></div><p style={{fontSize:12}}>California guidance is state-specific. Review your circumstances and seek professional advice when needed.</p></aside></div></section>
   <section className="kw-section" style={{background:'#F7F9FA',borderTop:'1px solid #DEE6EA',borderBottom:'1px solid #DEE6EA'}}><div className="kw-shell"><div className="kw-intro"><p className="kw-eyebrow">Room to start. Room to grow.</p><h2>Start free. Decide what you need.</h2><p>Organize one rental first. Upgrade when the additional tools make sense for you.</p></div><div className="kw-pricing"><article className="kw-price-card" style={{background:'white'}}><h3>Free</h3><div className="kw-price">$0</div><p>{brand.freeUnits} unit · No credit card required</p><ul><li>Start your property and tenant records</li><li>Keep documents and lease details together</li><li>Record rent received outside Keywise</li></ul><button className="kw-button" onClick={() => start('free-plan')}>Start free →</button></article><article className="kw-price-card" style={{background:'white'}}><h3>Pro</h3><div className="kw-price">$49<span style={{fontSize:16,fontWeight:500,letterSpacing:0}}> / month</span></div><p>For more units and online rent collection</p><ul><li>Expanded portfolio and paid features</li><li>Online payments with an eligible account</li><li>14-day Pro trial; card required</li></ul><Link href="/pricing" className="kw-button kw-button-light" onClick={() => track('pricing_viewed','pro-plan')}>Compare plans and fees →</Link></article></div><p style={{fontSize:12,color:'#55677B',marginTop:18}}>Online rent payments carry a $2 transaction fee. See the pricing page for annual billing and any available founding-member offer.</p></div></section>
   <section className="kw-section kw-faq"><div className="kw-shell" style={{maxWidth:850}}><p className="kw-eyebrow">Before you start</p><h2>A few things you might be wondering.</h2>{brandFaqs.map(f => <details key={f.q}><summary>{f.q}</summary><p>{f.a}</p></details>)}</div></section>
   <section className="kw-section" style={{background:'#0F3460',textAlign:'center'}}><div className="kw-shell"><h2 style={{color:'white'}}>One property. One place to start.</h2><p style={{color:'#C8D7E7',margin:'0 auto 26px',maxWidth:530}}>Bring a little more clarity to your rentals today. Start with the property you already know.</p><button className="kw-button kw-button-teal" onClick={() => start('footer')}>{brand.primaryAction} →</button><p style={{fontSize:12,color:'#C8D7E7',marginTop:16}}>{brand.freeLabel} · No credit card required</p></div></section>
  </main>
  <footer className="kw-footer"><div className="kw-shell"><div className="kw-footer-row"><div><Logo size={28}/><p>{brand.category}.<br/>{brand.promise}</p></div><nav aria-label="Footer"><Link href="/pricing">Pricing</Link><Link href="/tools">California tools</Link><Link href="/contact">Contact</Link><Link href="/tenant-login">Tenant login</Link><Link href="/privacy">Privacy</Link><Link href="/terms">Terms</Link></nav></div><p>© {new Date().getFullYear()} {brand.name}</p></div></footer>
  {authMode && <AuthModal mode={authMode} onClose={() => setAuthMode(null)}/>}
 </div>;
}
