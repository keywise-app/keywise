import { workspaceAccess, requireLease, apiError } from '@/lib/workspace/access';
export async function GET(request: Request) {
 try {
  const { db, user } = await workspaceAccess(request);
  const lease = await requireLease(db,user,new URL(request.url).searchParams.get('lease_id') || '');
  const { data, error } = await db.from('profiles').select('full_name,email,phone,company,stripe_account_id').eq('id',lease.user_id).maybeSingle();
  if (error) throw error;
  return Response.json({ landlord: data });
 } catch (error) { return apiError(error); }
}
