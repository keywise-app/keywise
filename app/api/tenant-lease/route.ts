import { workspaceAccess, requireLease, apiError } from '@/lib/workspace/access';
export async function GET(request: Request) {
 try {
  const { db, user } = await workspaceAccess(request);
  const previewId = new URL(request.url).searchParams.get('lease_id');
  if (previewId) return Response.json({ lease: await requireLease(db, user, previewId) });
  const { data, error } = await db.from('leases').select('*').eq('tenant_user_id',user.id).order('created_at', { ascending: false });
  if (error) throw error;
  let lease = data?.find(l => !l.archived) || data?.[0] || null;
  if(!lease){
   const {data:members,error:membersError}=await db.from('workspace_tenancy_members').select('lease_id').eq('user_id',user.id).eq('status','active').in('role',['primary','occupant','former']);
   if(membersError)throw new Response('Unable to load tenancy membership.',{status:503});
   if(members?.length===1)lease=await requireLease(db,user,members[0].lease_id);
  }
  // Link an invited tenant using the verified account email, never query-supplied identity.
  if (!lease && user.email && user.email_confirmed_at) {
   const { data: candidates, error } = await db.from('leases').select('*').eq('email',user.email).is('tenant_user_id',null);
   if (error) throw error;
   const eligible = candidates?.filter(l => !l.archived) || [];
   if (eligible.length === 1) {
    const { data: linked, error } = await db.from('leases').update({ tenant_user_id: user.id }).eq('id',eligible[0].id).is('tenant_user_id',null).select('*').maybeSingle();
    if (error) throw error;
    lease = linked;
   }
  }
  if(lease)lease=await requireLease(db,user,lease.id);
  return Response.json({ lease });
 } catch (error) { return apiError(error); }
}
