import {createHash} from 'node:crypto';
import { leaseIsReadOnly } from '@/lib/workspace/records';
import { workspaceAccess, requireLease, apiError } from '@/lib/workspace/access';

async function issueAccess(db: any, user: { id: string }, id: string) {
  const { data: issue, error } = await db.from('maintenance').select('*').eq('id', id).maybeSingle();
  if (error) throw new Response('Unable to load request.', { status: 500 });
  if (!issue) throw new Response('Not found.', { status: 404 });
  if (issue.user_id === user.id) return { issue, owner: true };
  if (!issue.lease_id) throw new Response('Not found.', { status: 404 });
  await requireLease(db, user, issue.lease_id);
  return { issue, owner: false };
}
export async function GET(request: Request) {
 try {
  const { db, user } = await workspaceAccess(request);
  const params = new URL(request.url).searchParams;
  const id = params.get('id');
  if (id) {
   const { owner,issue } = await issueAccess(db, user, id);
   const [events, files] = await Promise.all([
    db.from('maintenance_events').select('*').eq('maintenance_id', id).order('created_at'),
    db.from('maintenance_files').select('*').eq('maintenance_id', id).order('created_at'),
   ]);
   if (events.error || files.error) throw new Error('Evidence unavailable');
   const visible = (files.data || []).filter(f => owner || f.type === 'photo');
   const signed = await Promise.all(visible.map(async f => {
    const { data } = await db.storage.from('maintenance-evidence').createSignedUrl(f.path, 300);
    return { id: f.id, name: f.name, type: f.type, url: data?.signedUrl };
   }));
   let contractors:any[]=[];
   if(owner){const list=await db.from('workspace_contractors').select('id,name,contact').eq('user_id',user.id).order('name');if(list.error)throw new Error('Contractors unavailable');contractors=list.data || [];}
   return Response.json({ events: owner?events.data:(events.data || []).map(({owner_details,...event})=>event), files: signed, ...(owner?{issue,contractors}:{}) });
  }
  const lease = await requireLease(db, user, params.get('lease_id') || '');
  const { data, error } = await db.from('maintenance').select('id,issue,category,priority,status,reported_date,resolved_date').eq('lease_id', lease.id).order('reported_date', { ascending: false });
  if (error) throw error;
  return Response.json({ issues: data || [] });
 } catch (error) { return apiError(error); }
}
export async function POST(request: Request) {
 try {
  const { db, user } = await workspaceAccess(request);
  if (request.headers.get('content-type')?.includes('multipart/form-data')) {
   const form = await request.formData();
   const id = String(form.get('id') || '');
   const { owner, issue } = await issueAccess(db, user, id);
   if (!owner) {
    const lease = await requireLease(db, user, issue.lease_id,'write');
    if (leaseIsReadOnly(lease)) return Response.json({ error: 'This lease is read only.' }, { status: 403 });
   }
   const file = form.get('file');
   const type = form.get('type') === 'receipt' ? 'receipt' : 'photo';
   if (!owner && type === 'receipt') return Response.json({ error: 'Only landlords can attach receipts.' }, { status: 403 });
   const allowed = type === 'photo' ? ['image/jpeg','image/png','image/webp'] : ['image/jpeg','image/png','image/webp','application/pdf'];
   if (!(file instanceof File) || !file.size || file.size > 10 * 1024 * 1024 || !allowed.includes(file.type)) return Response.json({ error: 'Choose a JPG, PNG, WebP or receipt PDF under 10 MB.' }, { status: 400 });
   const extension = { 'image/jpeg': 'jpg', 'image/png': 'png', 'image/webp': 'webp', 'application/pdf': 'pdf' }[file.type];
   const sha256=createHash('sha256').update(Buffer.from(await file.arrayBuffer())).digest('hex');
   const {data:duplicate,error:duplicateError}=await db.from('maintenance_files').select('id').eq('maintenance_id',id).eq('type',type).eq('sha256',sha256).maybeSingle();
   if(duplicateError)throw new Error('Unable to check attachment identity');
   if(duplicate)return Response.json({success:true,id:duplicate.id,duplicate:true});
   const path = `${issue.user_id}/${id}/${sha256}-${type}.${extension}`;
   const uploaded = await db.storage.from('maintenance-evidence').upload(path, file, { contentType: file.type });
   if (uploaded.error) throw uploaded.error;
   const saved = await db.from('maintenance_files').insert({ maintenance_id: id, name: file.name.slice(0,200), path, type,sha256 });
   if (saved.error) { await db.storage.from('maintenance-evidence').remove([path]); throw saved.error; }
   return Response.json({ success: true });
  }
  const body = await request.json();
  if (body.id) {
   const { owner } = await issueAccess(db, user, body.id);
   if (!owner) return Response.json({ error: 'Only the landlord can post status updates.' }, { status: 403 });
   if(body.operation) {
    if(!Number.isInteger(body.revision) || (body.actual_cents!=null && (!Number.isSafeInteger(body.actual_cents)||body.actual_cents<0)) || (body.estimate_cents!=null && (!Number.isSafeInteger(body.estimate_cents)||body.estimate_cents<0)))throw new Response('Review the repair amounts and revision.',{status:400});
    const {data,error}=await db.rpc('workspace_repair_command',{p_id:body.id,p_actor:user.id,p_revision:body.revision,p_command:body});
    if(error)throw new Response('The repair changed or the contractor, cost or receipt needs review. Reload before retrying.',{status:409});
    return Response.json({issue:data});
   }
   if (typeof body.message !== 'string' || !body.message.trim() || body.message.length > 3000) return Response.json({ error: 'Enter an update of up to 3,000 characters.' }, { status: 400 });
   const { error } = await db.from('maintenance_events').insert({ maintenance_id: body.id, kind: 'update', message: body.message.trim() });
   if (error) throw error;
   return Response.json({ success: true });
  }
  const lease = await requireLease(db, user, body.lease_id,'write');
  if (leaseIsReadOnly(lease)) return Response.json({ error: 'This lease is read only.' }, { status: 403 });
  if (typeof body.issue !== 'string' || !body.issue.trim() || body.issue.length > 3000) return Response.json({ error: 'Describe the issue in up to 3,000 characters.' }, { status: 400 });
  const { data, error } = await db.from('maintenance').insert({ user_id: lease.user_id, lease_id: lease.id, property_id: lease.property_id || null, property: lease.property, issue: body.issue.trim(), category: 'General', priority: ['low','medium','high'].includes(body.priority) ? body.priority : 'medium', status: 'open', reported_date: new Date().toISOString().slice(0,10) }).select('id').single();
  if (error) throw error;
  return Response.json({ id: data.id }, { status: 201 });
 } catch (error) { return apiError(error); }
}
