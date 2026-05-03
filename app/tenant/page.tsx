'use client';
import { useState } from 'react';
import { supabase } from '../lib/supabase';
import Link from 'next/link';

const N = '#0F3460';
const TEAL = '#00D4AA';
const TEAL_DARK = '#00A886';
const BG = '#F0F4FF';
const BORDER = '#E0E6F0';
const INK_MID = '#4A5068';
const INK_MUTED = '#8892A4';

export default function TenantLoginPage() {
  const [email, setEmail] = useState('');
  const [sent, setSent] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) return;
    setLoading(true);
    setError('');
    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: {
        emailRedirectTo: 'https://keywise.app/?tenant=true',
        shouldCreateUser: false,
      },
    });
    if (error) {
      setError(error.message.includes('Signups not allowed')
        ? 'No account found with this email. Contact your landlord to be added to Keywise.'
        : error.message);
    } else {
      setSent(true);
    }
    setLoading(false);
  };

  return (
    <div style={{ minHeight: '100vh', background: BG, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: 20, fontFamily: "'Inter', system-ui, sans-serif" }}>
      <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap" rel="stylesheet" />

      <Link href="/" style={{ textDecoration: 'none', marginBottom: 32, display: 'flex', alignItems: 'center', gap: 10 }}>
        <svg width="32" height="32" viewBox="0 0 32 32" fill="none">
          <rect width="32" height="32" rx="8" fill={N} />
          <circle cx="13" cy="16" r="5.5" fill="none" stroke={TEAL} strokeWidth="2.5" />
          <circle cx="13" cy="16" r="2" fill={TEAL} />
          <rect x="17.5" y="14.75" width="8" height="2.5" rx="1.25" fill={TEAL} />
          <rect x="22" y="17.25" width="4" height="2" rx="1" fill={TEAL} />
          <rect x="19" y="17.25" width="2.5" height="2" rx="1" fill={TEAL} />
        </svg>
        <span style={{ fontSize: 20, fontWeight: 700, color: N, letterSpacing: '-0.4px' }}>keywise</span>
      </Link>

      <div style={{ background: 'white', borderRadius: 16, padding: 40, maxWidth: 440, width: '100%', boxShadow: '0 20px 60px rgba(15,52,96,0.1)' }}>
        {!sent ? (
          <>
            <h1 style={{ fontSize: 24, fontWeight: 800, color: N, marginBottom: 8, margin: '0 0 8px' }}>Tenant Login</h1>
            <p style={{ color: INK_MUTED, fontSize: 14, marginBottom: 24, lineHeight: 1.5, margin: '0 0 24px' }}>
              Enter your email to access your tenant portal. We'll send you a magic link — no password needed.
            </p>

            <form onSubmit={handleLogin}>
              <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: N, marginBottom: 6 }}>Email Address</label>
              <input
                type="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                placeholder="your.email@example.com"
                required
                autoFocus
                style={{ width: '100%', padding: '12px 16px', borderRadius: 10, border: `1.5px solid ${BORDER}`, fontSize: 15, marginBottom: 16, boxSizing: 'border-box', outline: 'none', fontFamily: 'inherit', color: N }}
              />

              {error && (
                <div style={{ background: '#FFF0F0', border: '1px solid #FF6B6B33', borderRadius: 10, padding: '10px 14px', fontSize: 13, color: '#FF6B6B', marginBottom: 16, fontWeight: 600 }}>
                  {error}
                </div>
              )}

              <button type="submit" disabled={loading}
                style={{ width: '100%', background: N, color: '#fff', border: 'none', padding: '14px', borderRadius: 10, fontSize: 15, fontWeight: 700, cursor: loading ? 'default' : 'pointer', opacity: loading ? 0.7 : 1, fontFamily: 'inherit' }}>
                {loading ? 'Sending...' : 'Send Magic Link →'}
              </button>
            </form>

            <div style={{ marginTop: 24, padding: 16, background: BG, borderRadius: 10 }}>
              <div style={{ fontSize: 12, color: INK_MUTED, lineHeight: 1.6 }}>
                <strong style={{ color: N }}>First time?</strong> Use the same email your landlord has on file. If you don't have access, contact your landlord to add you to Keywise.
              </div>
            </div>
          </>
        ) : (
          <div style={{ textAlign: 'center' }}>
            <div style={{ width: 56, height: 56, borderRadius: '50%', background: '#E8F8F0', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px', fontSize: 28 }}>📧</div>
            <h2 style={{ fontSize: 22, fontWeight: 800, color: N, marginBottom: 12, margin: '0 0 12px' }}>Check your email!</h2>
            <p style={{ color: INK_MID, fontSize: 14, lineHeight: 1.6, marginBottom: 24, margin: '0 0 24px' }}>
              We sent a magic link to <strong>{email}</strong>. Click the link to access your tenant portal.
            </p>
            <p style={{ fontSize: 12, color: INK_MUTED, margin: 0 }}>
              Didn't get it? Check your spam folder or{' '}
              <button onClick={() => { setSent(false); setError(''); }} style={{ background: 'none', border: 'none', color: TEAL_DARK, fontWeight: 600, cursor: 'pointer', padding: 0, fontSize: 12, fontFamily: 'inherit' }}>try again</button>.
            </p>
          </div>
        )}
      </div>

      <div style={{ marginTop: 32, display: 'flex', gap: 24, alignItems: 'center' }}>
        <Link href="/" style={{ color: INK_MUTED, fontSize: 13, textDecoration: 'none' }}>← Back to Home</Link>
        <span style={{ color: BORDER }}>·</span>
        <Link href="/login" style={{ color: INK_MUTED, fontSize: 13, textDecoration: 'none' }}>Landlord Login</Link>
      </div>
    </div>
  );
}
