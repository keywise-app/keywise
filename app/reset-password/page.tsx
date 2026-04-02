'use client';
import { useState, useEffect } from 'react';
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

export default function ResetPassword() {
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState('');
  const [ready, setReady] = useState(false);

  // Supabase parses the token from the URL hash and establishes a session.
  // We wait for that SIGNED_IN / PASSWORD_RECOVERY event before showing the form.
  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
      if (event === 'PASSWORD_RECOVERY' || event === 'SIGNED_IN') {
        setReady(true);
      }
    });

    // Also check if there's already a session (e.g. page refresh after token exchange)
    supabase.auth.getSession().then(({ data }) => {
      if (data.session) setReady(true);
    });

    return () => subscription.unsubscribe();
  }, []);

  const handleSubmit = async () => {
    setError('');
    if (password.length < 8) {
      setError('Password must be at least 8 characters.');
      return;
    }
    if (password !== confirm) {
      setError('Passwords do not match.');
      return;
    }
    setLoading(true);
    const { error } = await supabase.auth.updateUser({ password });
    setLoading(false);
    if (error) {
      if (error.message.includes('expired') || error.message.includes('invalid')) {
        setError('This reset link has expired. Please request a new one.');
      } else {
        setError(error.message);
      }
      return;
    }
    setSuccess(true);
    setTimeout(() => { window.location.href = 'https://keywise.app'; }, 2000);
  };

  return (
    <div style={{ minHeight: '100vh', background: T.bg, display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: "'Inter', system-ui, sans-serif", padding: 16 }}>
      <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap" rel="stylesheet" />

      <div style={{ width: '100%', maxWidth: 420 }}>
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
            Choose a new password for your account.
          </p>
        </div>

        <div style={{ background: T.surface, borderRadius: 18, border: `1px solid ${T.border}`, padding: 32, boxShadow: '0 2px 8px rgba(15,52,96,0.10), 0 8px 24px rgba(15,52,96,0.07)' }}>
          {success ? (
            <div style={{ textAlign: 'center', padding: '8px 0' }}>
              <div style={{ fontSize: 40, marginBottom: 12 }}>✓</div>
              <div style={{ fontWeight: 700, fontSize: 16, color: T.navy, marginBottom: 8 }}>Password updated!</div>
              <div style={{ fontSize: 13, color: T.inkMuted }}>Redirecting you to the dashboard…</div>
            </div>
          ) : !ready ? (
            <div style={{ textAlign: 'center', padding: '16px 0', color: T.inkMuted, fontSize: 13 }}>
              Verifying reset link…
            </div>
          ) : (
            <>
              <div style={{ fontWeight: 700, fontSize: 17, color: T.navy, marginBottom: 20 }}>Set a new password</div>

              <div style={{ marginBottom: 14 }}>
                <label style={{ fontSize: 11, color: T.inkMuted, fontWeight: 700, textTransform: 'uppercase' as const, letterSpacing: '0.4px', display: 'block', marginBottom: 6 }}>New Password</label>
                <input type="password" value={password} onChange={e => setPassword(e.target.value)}
                  placeholder="At least 8 characters" style={{ ...input, fontSize: 14, padding: '11px 14px' }}
                  autoFocus />
              </div>

              <div style={{ marginBottom: 20 }}>
                <label style={{ fontSize: 11, color: T.inkMuted, fontWeight: 700, textTransform: 'uppercase' as const, letterSpacing: '0.4px', display: 'block', marginBottom: 6 }}>Confirm Password</label>
                <input type="password" value={confirm} onChange={e => setConfirm(e.target.value)}
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
                {loading ? 'Updating…' : 'Update Password'}
              </button>

              <div style={{ textAlign: 'center', marginTop: 20 }}>
                <a href="https://keywise.app" style={{ fontSize: 12, color: T.inkMuted, textDecoration: 'none' }}>
                  ← Back to login
                </a>
              </div>
            </>
          )}
        </div>

        <p style={{ textAlign: 'center', fontSize: 12, color: T.inkMuted, marginTop: 20 }}>
          Property management, made intelligent.
        </p>
      </div>
    </div>
  );
}
