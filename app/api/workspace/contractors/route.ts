import {workspaceAccess,apiError} from '@/lib/workspace/access';
export async function POST(req:Request){
 try{
  const {db,user}=await workspaceAccess(req);const {id,name,contact}=await req.json();
  if(typeof id!=='string' || !/^[0-9a-f-]{36}$/i.test(id) || typeof name!=='string' || !name.trim() || name.length>200 || typeof contact!=='string' || contact.length>300)throw new Response('Review the contractor name and contact details.',{status:400});
  const {data:existing,error:loadError}=await db.from('workspace_contractors').select('*').eq('id',id).maybeSingle();
  if(loadError)throw new Response('Unable to load contractor.',{status:503});
  if(existing && existing.user_id!==user.id)throw new Response('Contractor not found.',{status:404});
  if(existing)return Response.json({contractor:existing});
  const {data,error}=await db.from('workspace_contractors').insert({id,user_id:user.id,name:name.trim(),contact}).select('*').single();
  if(error)throw new Response('Unable to save contractor.',{status:503});
  return Response.json({contractor:data});
 }catch(error){return apiError(error);}
}
