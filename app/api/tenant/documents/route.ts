import { leaseIsReadOnly } from '@/lib/workspace/records';
import { workspaceAccess, requireLease, apiError } from '@/lib/workspace/access';
export async function GET(request: Request) {
 try {
  const { db, user } = await workspaceAccess(request);
  const lease = await requireLease(db,user,new URL(request.url).searchParams.get('lease_id') || '');
  const [docs, requests] = await Promise.all([
   db.from('documents').select('*').eq('lease_id',lease.id).eq('user_id',lease.user_id).eq('ownership_level','tenant').order('created_at',{ascending:false}),
   db.from('document_requests').select('*').eq('lease_id',lease.id).eq('status','pending').order('created_at',{ascending:false}),
  ]);
  if (docs.error || requests.error) throw docs.error || requests.error;
  const documents = await Promise.all((docs.data || []).map(async d => {
   const signed = d.file_path ? await db.storage.from('documents').createSignedUrl(d.file_path,300) : null;
   return { ...d, signed_url: signed?.data?.signedUrl || '' };
  }));
  return Response.json({ documents, requests: requests.data || [] });
 } catch (error) { return apiError(error); }
}
export async function POST(request: Request) {
 try {
  const { db, user } = await workspaceAccess(request);
  const form = await request.formData();
  const lease = await requireLease(db,user,String(form.get('lease_id') || ''),'write');
  if (leaseIsReadOnly(lease)) return Response.json({ error: 'This lease is read only.' },{status:403});
  const file = form.get('file');
  const types: Record<string,string> = { 'application/pdf':'pdf','image/jpeg':'jpg','image/png':'png' };
  if (!(file instanceof File) || !file.size || file.size > 10*1024*1024 || !types[file.type]) return Response.json({ error:'Choose a PDF, JPG or PNG under 10 MB.' },{status:400});
  const path = `${lease.user_id}/tenant-docs/${lease.id}/${crypto.randomUUID()}.${types[file.type]}`;
  const uploaded = await db.storage.from('documents').upload(path,file,{contentType:file.type});
  if (uploaded.error) throw uploaded.error;
  const { error } = await db.from('documents').insert({ user_id:lease.user_id, lease_id:lease.id, tenant_name:lease.tenant_name, property:lease.property, name:file.name.slice(0,200), type:'other', ownership_level:'tenant',file_path:path,file_url:'',size:`${Math.ceil(file.size/1024)} KB` });
  if (error) { await db.storage.from('documents').remove([path]); throw error; }
  return Response.json({success:true},{status:201});
 } catch (error) { return apiError(error); }
}
