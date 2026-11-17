import { workspaceAccess, requireLease, apiError } from '@/lib/workspace/access';
export async function GET(request: Request) {
 try {
  const { db, user } = await workspaceAccess(request);
  const lease = await requireLease(db,user,new URL(request.url).searchParams.get('lease_id') || '');
  const { data, error } = await db.from('payments').select('*').eq('lease_id',lease.id).eq('user_id',lease.user_id).order('due_date',{ascending:false});
  if (error) throw error;
  return Response.json({ payments: data || [] });
 } catch (error) { return apiError(error); }
}
