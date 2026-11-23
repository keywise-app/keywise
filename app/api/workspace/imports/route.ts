import { workspaceAccess, apiError } from '@/lib/workspace/access';
import { getLimits } from '@/app/lib/planLimits';
import { importPlan } from '@/lib/workspace/imports';
export async function GET(req:Request) {
 try {
  const {db,user}=await workspaceAccess(req);
  const params=new URL(req.url).searchParams;
  const id=params.get('id');
  if(params.get('all')==='1') {
   const {data,error}=await db.from('workspace_import_drafts').select('*').eq('user_id',user.id).eq('state','draft').order('updated_at',{ascending:false}).limit(10);
   if(error) throw new Response('Unable to load saved drafts.',{status:503});
   return Response.json({drafts:data || []});
  }
  let query=db.from('workspace_import_drafts').select('*').eq('user_id',user.id);
  query=id?query.eq('id',id):query.eq('state','draft').order('updated_at',{ascending:false}).limit(1);
  const {data,error}=await query.maybeSingle();
  if(error) throw new Response('Unable to load saved draft.',{status:503});
  return Response.json({draft:data});
 } catch(error) {return apiError(error);}
}
export async function POST(req:Request) {
 try {
  const {db,user}=await workspaceAccess(req);
  const body=await req.json();
  if(typeof body.id!=='string' || !/^[0-9a-f-]{36}$/i.test(body.id) || !Number.isInteger(body.revision) || body.revision<0) throw new Response('Reload your draft before continuing.',{status:400});
  if(body.operation==='commit') {
   const {data:profile,error:profileError}=await db.from('profiles').select('subscription_status').eq('id',user.id).single();
   if(profileError) throw new Response('Unable to verify your unit limit.',{status:503});
   // Preserve the existing commercial limits; no new pricing experiment is enabled.
   const maxUnits=getLimits(profile.subscription_status).maxUnits;
   const {data,error}=await db.rpc('workspace_commit_import',{p_id:body.id,p_actor:user.id,p_revision:body.revision,p_digest:body.digest,p_max_units:maxUnits});
   if(error) throw new Response('The draft changed, the unit is occupied, or the unit limit was reached. Reload and review before committing.',{status:409});
   return Response.json({lease:data});
  }
  if(!['save','preview'].includes(body.operation) || !body.payload || JSON.stringify(body.payload).length>200000) throw new Response('Invalid draft.',{status:400});
  if(body.payload.source?.storage_path && (!body.payload.source.storage_path.startsWith(`${user.id}/`) || body.payload.source.storage_path.includes('..'))) throw new Response('Source document not found.',{status:404});
  if(body.operation==='preview' && body.payload.form?.property_id) {
   const {data:unit,error:unitError}=await db.from('properties').select('address,unit_number').eq('id',body.payload.form.property_id).eq('user_id',user.id).maybeSingle();
   if(unitError || !unit) throw new Response('Property not found.',{status:404});
   body.payload.form={...body.payload.form,address:unit.address,unit_number:unit.unit_number || ''};
  }
  const preview=body.operation==='preview'?importPlan(body.payload):null;
  const {data,error}=await db.rpc('workspace_save_import',{p_id:body.id,p_actor:user.id,p_revision:body.revision,p_payload:body.payload,p_plan:preview?.plan || null,p_digest:preview?.digest || null});
  if(error) throw new Response('This draft changed in another session. Reload the saved version before editing.',{status:409});
  return Response.json({draft:data,preview});
 } catch(error) {return apiError(error);}
}
export async function DELETE(req:Request) {
 try {
  const {db,user}=await workspaceAccess(req);
  const {id,revision}=await req.json();
  if(typeof id!=='string'||!/^[0-9a-f-]{36}$/i.test(id)||!Number.isInteger(revision)) throw new Response('Reload your draft.',{status:400});
  const {data,error}=await db.from('workspace_import_drafts').delete().eq('id',id).eq('user_id',user.id).eq('state','draft').eq('revision',revision).select('id');
  if(error||!data?.length) throw new Response('The draft changed. Reopen setup before removing it.',{status:409});
  return Response.json({removed:true});
 }catch(error){return apiError(error);}
}
