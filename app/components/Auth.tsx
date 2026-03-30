'use client';
import { useState } from 'react';
import { supabase } from '../lib/supabase';
import { T, input, btn } from '../lib/theme';

function KeywiseLogo({ size = 40 }: { size?: number }) {
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

export default function Auth() {
  const [mode, setMode] = useState<'login' | 'signup'>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async () => {
    setLoading(true);
    setError('');
    if (mode === 'signup') {
      const { error } = await supabase.auth.signUp({ email, password });
      if (error) setError(error.message);
    } else {
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) setError(error.message);
    }
    setLoading(false);
  };

  return (
    <div style={{ minHeight: '100vh', background: T.bg, display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: "'Inter', system-ui, sans-serif" }}>
      <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap" rel="stylesheet" />

      <div style={{ width: 420, padding: 24 }}>
        {/* Logo */}
        <div style={{ textAlign: 'center', marginBottom: 32 }}>
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: 12, marginBottom: 8 }}>
            <KeywiseLogo size={44} />
            <div style={{ textAlign: 'left' }}>
              <div style={{ fontSize: 24, fontWeight: 700, color: T.navy, letterSpacing: '-0.5px' }}>Keywise</div>
              <div style={{ fontSize: 10, color: T.teal, letterSpacing: '1.5px', textTransform: 'uppercase' }}>Property AI</div>
            </div>
          </div>
          <p style={{ fontSize: 14, color: T.inkMuted, margin: '8px 0 0', lineHeight: 1.6 }}>
            {mode === 'login' ? 'Welcome back. Sign in to your portfolio.' : 'Start managing your properties smarter.'}
          </p>
        </div>

        <div style={{ background: T.surface, borderRadius: 18, border: `1px solid ${T.border}`, padding: 32, boxShadow: T.shadowMd }}>
          {/* Toggle */}
          <div style={{ display: 'flex', background: T.bg, borderRadius: 10, padding: 4, marginBottom: 24 }}>
            {(['login', 'signup'] as const).map(m => (
              <button key={m} onClick={() => { setMode(m); setError(''); }}
                style={{
                  flex: 1, padding: '8px', borderRadius: 8, border: 'none', cursor: 'pointer',
                  background: mode === m ? T.surface : 'transparent',
                  fontWeight: mode === m ? 700 : 400, fontSize: 13,
                  color: mode === m ? T.navy : T.inkMuted,
                  boxShadow: mode === m ? T.shadow : 'none',
                  fontFamily: 'inherit',
                  transition: 'all 0.15s',
                }}>
                {m === 'login' ? 'Log In' : 'Sign Up'}
              </button>
            ))}
          </div>

          <div>
            <div style={{ marginBottom: 14 }}>
              <label style={{ fontSize: 11, color: T.inkMuted, fontWeight: 700, textTransform: 'uppercase' as const, letterSpacing: '0.4px', display: 'block', marginBottom: 6 }}>Email</label>
              <input type="email" value={email} onChange={e => setEmail(e.target.value)}
                placeholder="you@email.com" style={{ ...input, fontSize: 14, padding: '11px 14px' }} />
            </div>

            <div style={{ marginBottom: 20 }}>
              <label style={{ fontSize: 11, color: T.inkMuted, fontWeight: 700, textTransform: 'uppercase' as const, letterSpacing: '0.4px', display: 'block', marginBottom: 6 }}>Password</label>
              <input type="password" value={password} onChange={e => setPassword(e.target.value)}
                placeholder="••••••••" style={{ ...input, fontSize: 14, padding: '11px 14px' }}
                onKeyDown={e => e.key === 'Enter' && handleSubmit()} />
            </div>

            {error && (
              <div style={{ background: T.coralLight, border: `1px solid ${T.coral}33`, borderRadius: 10, padding: '10px 14px', fontSize: 13, color: T.coral, marginBottom: 16 }}>
                {error}
              </div>
            )}

            <button onClick={handleSubmit} disabled={loading}
              style={{ ...btn.primary, width: '100%', justifyContent: 'center', padding: '12px', fontSize: 14, borderRadius: 10, opacity: loading ? 0.7 : 1 }}>
              {loading ? 'Please wait…' : mode === 'login' ? 'Log In' : 'Create Account'}
            </button>
          </div>

          <div style={{ textAlign: 'center', fontSize: 13, color: T.inkMuted, marginTop: 20 }}>
            {mode === 'login' ? "Don't have an account? " : 'Already have an account? '}
            <span onClick={() => { setMode(mode === 'login' ? 'signup' : 'login'); setError(''); }}
              style={{ color: T.navy, fontWeight: 600, cursor: 'pointer' }}>
              {mode === 'login' ? 'Sign up' : 'Log in'}
            </span>
          </div>
        </div>

        <p style={{ textAlign: 'center', fontSize: 12, color: T.inkMuted, marginTop: 20 }}>
          Property management, made intelligent.
        </p>
      </div>
    </div>
  );
}