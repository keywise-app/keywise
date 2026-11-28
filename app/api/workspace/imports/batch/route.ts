import {workspaceAccess,apiError} from '@/lib/workspace/access';
import {getLimits} from '@/app/lib/planLimits';
import {importPlan} from '@/lib/workspace/imports';
const uuid=/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
export async function POST(req:Request) {
 try {
  const {db,user}=await workspaceAccess(req);
  const body=await req.json();
  if(!['save','preview','commit'].includes(body.operation) || !Array.isArray(body.items) || !body.items.length || body.items.length>10 || JSON.stringify(body).length>1500000) throw new Response('Add between one and ten leases.',{status:400});
  if(new Set(body.items.map((x:any)=>x.id)).size!==body.items.length || body.items.some((x:any)=>!uuid.test(x.id)||!Number.isInteger(x.revision)||x.revision<0)) throw new Response('Reload your saved drafts.',{status:400});
  if(body.operation==='commit') {
   if(body.items.some((x:any)=>typeof x.digest!=='string'||!/^[a-f0-9]{64}$/.test(x.digest))) throw new Response('Review the rentals before saving.',{status:400});
   const {data:profile,error}=await db.from('profiles').select('subscription_status').eq('id',user.id).single();
   if(error || !profile) throw new Response('Unable to verify your unit limit.',{status:503});
   const {data:leases,error:commitError}=await db.rpc('workspace_commit_import_batch',{p_actor:user.id,p_items:body.items.map((x:any)=>({id:x.id,revision:x.revision,digest:x.digest})),p_max_units:getLimits(profile.subscription_status).maxUnits});
   if(commitError) throw new Response('No rentals were added. Check for an existing occupied unit, a changed draft, or your plan’s unit limit, then review again.',{status:409});
   return Response.json({leases});
  }
  const items=[];
  for(const item of body.items) {
   const payload=item.payload;
   if(!payload?.form || JSON.stringify(payload).length>200000) throw new Response('Invalid rental draft.',{status:400});
   const path=payload.source?.storage_path;
   if(path && (typeof path!=='string'||!path.startsWith(`${user.id}/`)||path.includes('..'))) throw new Response('Source document not found.',{status:404});
   if(payload.form.property_id) {
    const {data:unit,error}=await db.from('properties').select('address,unit_number').eq('id',payload.form.property_id).eq('user_id',user.id).maybeSingle();
    if(error || !unit) throw new Response('Property not found.',{status:404});
    payload.form={...payload.form,address:unit.address,unit_number:unit.unit_number || ''};
   }
   const preview=body.operation==='preview'?importPlan(payload):null;
   items.push({id:item.id,revision:item.revision,payload,plan:preview?.plan || null,digest:preview?.digest || null});
  }
  if(body.operation==='preview') {
   const identities=items.map(x=>x.plan!.property_id || `${x.plan!.address.trim().toLowerCase()}|${x.plan!.unit_number.trim().toLowerCase()}`);
   if(new Set(identities).size!==items.length) throw new Response('Two leases refer to the same unit. Review unit labels or remove a duplicate.',{status:400});
  }
  const {data,error}=await db.rpc('workspace_save_import_batch',{p_actor:user.id,p_items:items});
  if(error) throw new Response('Your drafts changed in another session. Close and reopen to load the saved version.',{status:409});
  return Response.json({items:data.map((draft:any)=>({draft,preview:body.operation==='preview'?{plan:draft.approved_plan,digest:draft.approved_digest}:null}))});
 }catch(error){return apiError(error);}
}
