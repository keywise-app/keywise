'use client';
import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';

export default function TenantLogin() {
  const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading');

  useEffect(() => {
    // Supabase will parse the hash fragment and establish a session
    supabase.auth.getSession().then(async ({ data: { session } }) => {
      if (!session) {
        // Wait for auth state change (hash token processing)
        const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, newSession) => {
          if (newSession && (event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED')) {
            await setupTenant(newSession.user.id, newSession.user.email || '');
            subscription.unsubscribe();
          }
        });
        // Timeout after 5 seconds
        setTimeout(() => setStatus('error'), 5000);
        return;
      }
      await setupTenant(session.user.id, session.user.email || '');
    });
  }, []);

  const setupTenant = async (userId: string, email: string) => {
    // Set role to tenant
    await supabase.from('profiles').upsert(
      { id: userId, email, role: 'tenant' },
      { onConflict: 'id' }
    );

    // Link lease by email
    await supabase
      .from('leases')
      .update({ tenant_user_id: userId })
      .eq('email', email)
      .is('tenant_user_id', null);

    setStatus('success');
    // Redirect to main app — role is now saved, page.tsx will detect it
    window.location.href = '/';
  };

  return (
    <div style={{ minHeight: '100vh', background: '#F0F4FF', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'system-ui, sans-serif' }}>
      <div style={{ textAlign: 'center', maxWidth: 400 }}>
        {status === 'loading' && (
          <>
            <div style={{ fontSize: 36, marginBottom: 16 }}>🔑</div>
            <div style={{ fontSize: 18, fontWeight: 700, color: '#0F3460', marginBottom: 8 }}>Setting up your account...</div>
            <div style={{ fontSize: 14, color: '#8892A4' }}>Please wait while we verify your identity.</div>
          </>
        )}
        {status === 'error' && (
          <>
            <div style={{ fontSize: 36, marginBottom: 16 }}>⚠️</div>
            <div style={{ fontSize: 18, fontWeight: 700, color: '#0F3460', marginBottom: 8 }}>Link expired or invalid</div>
            <div style={{ fontSize: 14, color: '#8892A4', marginBottom: 24 }}>Please ask your landlord to send a new invite link.</div>
            <a href="/" style={{ color: '#00D4AA', fontWeight: 600, fontSize: 14 }}>Go to Keywise →</a>
          </>
        )}
      </div>
    </div>
  );
}
