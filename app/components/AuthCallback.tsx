'use client';
import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { T } from '../lib/theme';

/**
 * Client-side auth listener rendered alongside the Landing page (no session).
 * Handles two cases:
 * 1. Magic link redirect: URL has #access_token — Supabase JS exchanges it
 * 2. Password login: AuthModal calls signInWithPassword — session set client-side
 *
 * In both cases, once SIGNED_IN fires, we reload so the server component
 * can read the session from cookies and render the authenticated app.
 */
export default function AuthCallback() {
  const [processing, setProcessing] = useState(false);

  useEffect(() => {
    const hash = window.location.hash;
    const hasHashToken = hash && hash.includes('access_token');

    // Show loading spinner for magic link flows (user sees blank page otherwise)
    if (hasHashToken) setProcessing(true);

    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      if ((event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED') && session) {
        // Handle tenant role setup for magic link flow
        const params = new URLSearchParams(window.location.search);
        const isTenant = params.get('tenant') === 'true';

        if (isTenant) {
          const { data: profile } = await supabase
            .from('profiles')
            .select('role')
            .eq('id', session.user.id)
            .maybeSingle();

          if (profile?.role !== 'landlord') {
            await supabase.from('profiles').upsert(
              { id: session.user.id, email: session.user.email, role: 'tenant' },
              { onConflict: 'id' }
            );
            // Link lease by email
            await fetch(`/api/tenant-lease?email=${encodeURIComponent(session.user.email || '')}&user_id=${session.user.id}`).catch(() => {});
          }
        }

        // Signup conversion tracking
        if (params.get('welcome') === 'true' || params.get('signup') === 'complete') {
          if (typeof window !== 'undefined' && (window as any).gtag) {
            (window as any).gtag('event', 'conversion', {
              send_to: 'AW-18070985639/_8rLCMetnZccEKrJ5_ID',
              value: 1.0, currency: 'USD',
            });
          }
        }

        // Clean URL and reload — server component picks up session from cookies
        window.history.replaceState({}, '', '/');
        window.location.reload();
      }
    });

    // Timeout fallback for hash token exchange
    const timer = hasHashToken ? setTimeout(() => {
      setProcessing(false);
    }, 10000) : undefined;

    return () => {
      if (timer) clearTimeout(timer);
      subscription.unsubscribe();
    };
  }, []);

  if (!processing) return null;

  return (
    <div style={{ position: 'fixed', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', background: T.bg, fontFamily: "'Inter', system-ui, sans-serif", zIndex: 9999 }}>
      <div style={{ textAlign: 'center' }}>
        <svg width={40} height={40} viewBox="0 0 32 32" fill="none">
          <rect width="32" height="32" rx="8" fill={T.navy} />
          <circle cx="13" cy="16" r="5.5" fill="none" stroke={T.teal} strokeWidth="2.5" />
          <circle cx="13" cy="16" r="2" fill={T.teal} />
          <rect x="17.5" y="14.75" width="8" height="2.5" rx="1.25" fill={T.teal} />
          <rect x="22" y="17.25" width="4" height="2" rx="1" fill={T.teal} />
          <rect x="19" y="17.25" width="2.5" height="2" rx="1" fill={T.teal} />
        </svg>
        <p style={{ color: T.inkMuted, fontSize: 13, marginTop: 16 }}>Signing you in…</p>
      </div>
    </div>
  );
}
