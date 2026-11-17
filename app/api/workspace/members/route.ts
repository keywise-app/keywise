import {workspaceAccess,requireLease,apiError} from '@/lib/workspace/access';
export async function POST(req:Request){
 try{
  const {db,user}=await workspaceAccess(req);const body=await req.json();const lease=await requireLease(db,user,body.lease_id);
  if(lease.user_id!==user.id)throw new Response('Only the landlord can manage access.',{status:403});
  if(!['primary','occupant','cosigner','former'].includes(body.role) || !['active','revoked'].includes(body.status) || typeof body.user_id!=='string')throw new Response('Review the member and access role.',{status:400});
  const {error}=await db.from('workspace_tenancy_members').upsert({lease_id:lease.id,user_id:body.user_id,role:body.role,status:body.status,updated_at:new Date().toISOString()},{onConflict:'lease_id,user_id'});
  if(error)throw new Response('Unable to update membership. Confirm the account exists.',{status:409});
  return Response.json({success:true});
 }catch(error){return apiError(error);}
}
