import {workspaceAccess,requireLease,apiError} from '@/lib/workspace/access';
export async function GET(req:Request){
 try{
  const {db,user}=await workspaceAccess(req),params=new URL(req.url).searchParams;
  const lease=await requireLease(db,user,params.get('lease_id') || ''),owner=lease.user_id===user.id;
  const include=(params.get('include') || 'rent,repairs,documents').split(',');
  if(include.some(x=>!['rent','repairs','documents'].includes(x)))throw new Response('Choose rent, repairs or documents.',{status:400});
  const manifest:any={format:'keywise-history-v1',generated_at:new Date().toISOString(),scope:{lease_id:lease.id,audience:owner?'landlord':'tenant',include},tenancy:{tenant_name:lease.tenant_name,property:lease.property,start_date:lease.start_date,end_date:lease.end_date,lifecycle_state:lease.lifecycle_state || 'unreviewed'},attachments:[],missing:[],link_expires_at:new Date(Date.now()+60000).toISOString()};
  const check=(r:any)=>{if(r.error)throw new Response('Export could not load all selected records. Please retry.',{status:503});return r.data || [];};
  if(include.includes('rent')){
   manifest.charges=check(await db.from('payments').select('id,amount,type,due_date,status,paid_date,method,received_cents').eq('lease_id',lease.id).eq('user_id',lease.user_id).order('due_date'));
   const receipts=check(await db.from('workspace_receipts').select('id,amount_cents,currency,received_on,method,created_at').eq('lease_id',lease.id).eq('user_id',lease.user_id));
   manifest.receipts=receipts;
   if(receipts.length){manifest.allocations=check(await db.from('workspace_allocations').select('receipt_id,payment_id,amount_cents').in('receipt_id',receipts.map((r:any)=>r.id)));manifest.reversals=check(await db.from('workspace_receipt_reversals').select('receipt_id,reason,created_at').in('receipt_id',receipts.map((r:any)=>r.id)));}
  }
  const attach=async(bucket:string,path:string,name:string,id:string)=>{
   const {data,error}=await db.storage.from(bucket).createSignedUrl(path,60);
   if(error || !data?.signedUrl){manifest.missing.push({id,name,status:'unavailable'});return;}
   manifest.attachments.push({id,name,url:data.signedUrl,status:'available',expires_at:manifest.link_expires_at});
  };
  if(include.includes('repairs')){
   const issues=check(await db.from('maintenance').select('id,issue,category,priority,status,reported_date,resolved_date').eq('lease_id',lease.id).eq('user_id',lease.user_id));manifest.repairs=issues;
   if(issues.length){const ids=issues.map((r:any)=>r.id);manifest.repair_events=check(await db.from('maintenance_events').select('id,maintenance_id,kind,message,created_at').in('maintenance_id',ids).order('created_at'));
    const files=check(await db.from('maintenance_files').select('id,name,path,type').in('maintenance_id',ids));
    for(const file of files.filter((f:any)=>owner||f.type==='photo'))await attach('maintenance-evidence',file.path,file.name,file.id);
   }
  }
  if(include.includes('documents')){
   let query=db.from('documents').select('id,name,file_path,type,ownership_level,created_at').eq('lease_id',lease.id).eq('user_id',lease.user_id);
   if(!owner)query=query.eq('ownership_level','tenant');
   manifest.documents=check(await query);
   for(const doc of manifest.documents)if(doc.file_path)await attach('documents',doc.file_path,doc.name,doc.id);else manifest.missing.push({id:doc.id,name:doc.name,status:'original_not_recorded'});
   // Source agreements and extraction evidence remain owner-only until explicitly shared.
   if(owner){const sources=check(await db.from('workspace_import_drafts').select('id,payload,approved_plan,created_at,updated_at').eq('lease_id',lease.id).eq('user_id',user.id));manifest.import_versions=sources.map((s:any)=>({id:s.id,created_at:s.created_at,updated_at:s.updated_at,reviewed_plan:s.approved_plan}));for(const s of sources)if(s.payload?.source?.storage_path)await attach('workspace-sources',s.payload.source.storage_path,s.payload.source.filename || 'Original lease',s.id);
    const versions=check(await db.from('workspace_renewals').select('id,plan,state,executed_source,created_at,executed_at,applied_at').eq('lease_id',lease.id).eq('user_id',user.id));manifest.renewal_versions=versions.map(({executed_source,...v}:any)=>v);for(const v of versions)if(v.executed_source)await attach('workspace-sources',v.executed_source,'Executed renewal',v.id);
   }
   manifest.documents=manifest.documents.map(({file_path,...doc}:any)=>doc);
  }
  return Response.json(manifest,{headers:{'Cache-Control':'private, no-store','Content-Disposition':`attachment; filename="keywise-history-${lease.id}.json"`}});
 }catch(error){return apiError(error);}
}
