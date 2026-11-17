import { createClient } from '@supabase/supabase-js';
export async function workspaceAccess(request: Request) {
  const token = request.headers.get('authorization')?.match(/^Bearer (.+)$/i)?.[1];
  if (!token) throw new Response('Sign in required.', { status: 401 });
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new Response('Workspace service is unavailable.', { status: 503 });
  const db = createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
  const { data: { user }, error } = await db.auth.getUser(token);
  if (error || !user) throw new Response('Sign in required.', { status: 401 });
  return { db, user };
}
export function canAccessLease(user: { id: string }, lease: { user_id: string; tenant_user_id?: string | null }) {
  return lease.user_id === user.id || lease.tenant_user_id === user.id;
}
export async function requireLease(db: any, user: { id: string }, id: string) {
  const { data, error } = await db.from('leases').select('*').eq('id', id).maybeSingle();
  if (error) throw new Response('Unable to load lease.', { status: 500 });
  if (!data || !canAccessLease(user, data)) throw new Response('Lease not found.', { status: 404 });
  return data;
}
export async function apiError(error: unknown) {
  if (error instanceof Response) return Response.json({ error: (await error.text()) || 'Request failed.' }, { status: error.status });
  console.error('[workspace]', error);
  return Response.json({ error: 'Unable to complete the request. Please try again.' }, { status: 500 });
}
