import { createServerSupabase } from './lib/supabase-server';
import Landing from './components/Landing';
import TenantDashboard from './components/TenantDashboard';
import AuthenticatedApp from './components/AuthenticatedApp';
import AuthCallback from './components/AuthCallback';

export default async function Home({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  const params = await searchParams;
  const supabase = await createServerSupabase();

  // getUser() validates the JWT server-side — no race condition
  const { data: { user } } = await supabase.auth.getUser();

  // No session → Landing (SSR, SEO-friendly)
  // AuthCallback handles hash tokens from magic link redirects client-side
  if (!user) return <><AuthCallback /><Landing /></>;

  // Fetch profile server-side
  let { data: profile } = await supabase
    .from('profiles')
    .select('full_name, role, subscription_status, trial_ends_at')
    .eq('id', user.id)
    .maybeSingle();

  // Safety net: create profile if trigger missed
  if (!profile) {
    const { data: created } = await supabase
      .from('profiles')
      .upsert({ id: user.id, email: user.email, role: 'landlord' }, { onConflict: 'id' })
      .select('full_name, role, subscription_status, trial_ends_at')
      .maybeSingle();
    if (created) profile = created;
  }

  // Tenant preview mode (landlord previewing tenant portal)
  const previewLeaseId = params.tenant_preview === 'true' && params.lease_id
    ? String(params.lease_id)
    : null;

  if (previewLeaseId) {
    return <TenantDashboard previewLeaseId={previewLeaseId} />;
  }

  // Tenant role → tenant portal
  if (profile?.role === 'tenant') {
    return <TenantDashboard />;
  }

  // Landlord (or null role) → full app
  return (
    <AuthenticatedApp
      profile={profile}
      userId={user.id}
      userEmail={user.email || ''}
    />
  );
}
