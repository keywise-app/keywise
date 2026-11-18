import {workspaceAccess,requireLease,apiError} from '@/lib/workspace/access';
export async function POST(req:Request){
 try{
  const {db,user}=await workspaceAccess(req);const body=await req.json();const lease=await requireLease(db,user,body.lease_id);
  if(lease.user_id!==user.id)throw new Response('Only the landlord can manage access.',{status:403});
  if(!body.user_id && typeof body.email==='string'){
   const {data:account,error:accountError}=await db.from('profiles').select('id').eq('email',body.email.trim().toLowerCase()).maybeSingle();
   if(accountError || !account)throw new Response('No unique account found. Ask the occupant to create an account with this email first.',{status:409});
   body.user_id=account.id;
  }
  if(!['primary','occupant','cosigner','former'].includes(body.role) || !['active','revoked'].includes(body.status) || typeof body.user_id!=='string')throw new Response('Review the member and access role.',{status:400});
  const {error}=await db.from('workspace_tenancy_members').upsert({lease_id:lease.id,user_id:body.user_id,role:body.role,status:body.status,updated_at:new Date().toISOString()},{onConflict:'lease_id,user_id'});
  if(error)throw new Response('Unable to update membership. Confirm the account exists.',{status:409});
  return Response.json({success:true});
 }catch(error){return apiError(error);}
}

export async function GET(req:Request){
 try{
  const {db,user}=await workspaceAccess(req);const lease=await requireLease(db,user,new URL(req.url).searchParams.get('lease_id') || '');
  if(lease.user_id!==user.id)throw new Response('Not found.',{status:404});
  const {data,error}=await db.from('workspace_tenancy_members').select('user_id,role,status,updated_at').eq('lease_id',lease.id);
  if(error)throw new Response('Unable to load access records.',{status:503});
  const ids=[...new Set([...(data || []).map(m=>m.user_id),lease.tenant_user_id].filter(Boolean))];
  const profiles=ids.length?await db.from('profiles').select('id,email,full_name').in('id',ids):{data:[],error:null};
  if(profiles.error)throw new Response('Unable to load linked accounts.',{status:503});
  const members=(data || []).map(m=>({...m,account:profiles.data?.find(p=>p.id===m.user_id)}));
  if(lease.tenant_user_id&&!members.some(m=>m.user_id===lease.tenant_user_id))members.push({user_id:lease.tenant_user_id,role:'primary',status:'active',updated_at:null,account:profiles.data?.find(p=>p.id===lease.tenant_user_id)});
  return Response.json({members});
 }catch(error){return apiError(error);}
}
