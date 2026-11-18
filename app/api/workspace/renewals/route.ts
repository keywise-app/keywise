import {createHash} from 'node:crypto';
import {workspaceAccess,requireLease,apiError} from '@/lib/workspace/access';
import {civilDate,paymentSchedule} from '@/lib/workspace/imports';
import {legacyAmountCents} from '@/lib/workspace/payments';
import {sendWorkspaceEmail,escapeHtml} from '@/lib/workspace/email';
export async function GET(req:Request){
 try{const {db,user}=await workspaceAccess(req);const lease=await requireLease(db,user,new URL(req.url).searchParams.get('lease_id') || '');if(lease.user_id!==user.id)throw new Response('Not found.',{status:404});const {data,error}=await db.from('workspace_renewals').select('*').eq('lease_id',lease.id).eq('user_id',user.id).order('created_at',{ascending:false});if(error)throw new Response('Unable to load proposals.',{status:503});return Response.json({lease,proposals:data});}catch(error){return apiError(error);}
}
export async function POST(req:Request){
 try{
  const {db,user}=await workspaceAccess(req);const body=await req.json();
  if(body.operation==='create'){
   const lease=await requireLease(db,user,body.lease_id);if(lease.user_id!==user.id)throw new Response('Only the landlord can propose terms.',{status:403});
   const effective=civilDate(body.effective_date),end=body.end_date?civilDate(body.end_date):null;
   const rent=legacyAmountCents(body.rent),deadline=body.response_date?civilDate(body.response_date):null;
   if(!['active_fixed','month_to_month'].includes(body.lifecycle_state) || (body.lifecycle_state==='active_fixed' && (!end || end<effective)) || (body.lifecycle_state==='month_to_month' && end))throw new Response('Review the renewal term and dates.',{status:400});
   if(typeof body.timezone!=='string')throw new Response('Confirm the property time zone.',{status:400});
   try{new Intl.DateTimeFormat('en-US',{timeZone:body.timezone}).format();}catch{throw new Response('Select a valid property time zone.',{status:400});}
   const schedule=paymentSchedule(civilDate(body.first_due),'monthly',Number(body.horizon),rent,end || undefined);
   if(!schedule.length || schedule[0].due_date<effective)throw new Response('The first charge must be on or after the effective date.',{status:400});
   const plan={rent_cents:rent,effective_date:effective,end_date:end,lifecycle_state:body.lifecycle_state,response_date:deadline,timezone:body.timezone,schedule};
   const digest=createHash('sha256').update(JSON.stringify(plan)).digest('hex');
   const {data,error}=await db.rpc('workspace_save_renewal',{p_id:body.id,p_actor:user.id,p_lease:lease.id,p_revision:body.base_revision,p_plan:plan,p_digest:digest});
   if(error)throw new Response('The tenancy changed. Reload and review the current terms.',{status:409});
   return Response.json({proposal:data});
  }
  const {data:proposal,error:loadError}=await db.from('workspace_renewals').select('*').eq('id',body.id).eq('user_id',user.id).maybeSingle();
  if(loadError || !proposal)throw new Response('Proposal not found.',{status:404});
  const lease=await requireLease(db,user,proposal.lease_id);
  if(body.digest!==proposal.digest)throw new Response('Proposal changed. Review it again.',{status:409});
  if(body.operation==='send'){
   if(!lease.email)throw new Response('Add a tenant email or export the proposal for handoff.',{status:409});
   const p=proposal.plan;
   return Response.json(await sendWorkspaceEmail(db,{actorId:user.id,leaseId:lease.id,to:lease.email,requestId:`renewal-${proposal.id}`,subject:'Lease renewal proposal',html:`<p>Hi ${escapeHtml(lease.tenant_name || '')},</p><p>Proposed rent: $${(p.rent_cents/100).toFixed(2)} from ${p.effective_date}. Term: ${p.lifecycle_state==='month_to_month'?'month-to-month':`through ${p.end_date}`}.</p><p>${p.response_date?`Please respond by ${p.response_date}.`:''}</p><p>This is a proposal. It does not change your current lease or constitute a statutory notice. Please contact your landlord to review and execute the agreement.</p>`}));
  }
  if(body.operation==='execute'){
   const path=body.storage_path;
   if(typeof path!=='string' || !path.startsWith(`${user.id}/`) || path.includes('..'))throw new Response('Upload the executed agreement first.',{status:400});
   const {data:file,error:fileError}=await db.storage.from('workspace-sources').download(path);
   if(fileError || !file || file.size>10485760)throw new Response('Executed agreement not found.',{status:404});
   const {data,error}=await db.rpc('workspace_execute_renewal',{p_id:proposal.id,p_actor:user.id,p_digest:body.digest,p_source:path});
   if(error)throw new Response('Current terms or future charges need reconciliation before applying this agreement.',{status:409});
   return Response.json({proposal:data});
  }
  throw new Response('Unknown renewal action.',{status:400});
 }catch(error){return apiError(error);}
}
