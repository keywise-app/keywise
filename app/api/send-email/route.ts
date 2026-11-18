import { workspaceAccess, requireLease, apiError } from '@/lib/workspace/access';
import { sendWorkspaceEmail, escapeHtml } from '@/lib/workspace/email';
export async function POST(req: Request) {
 try {
  const {db,user} = await workspaceAccess(req);
  const body = await req.json();
  const lease = await requireLease(db,user,body.lease_id,'write');
  const owner = lease.user_id===user.id;
  let to:string,subject:string,html:string;
  if (owner) {to=lease.email;subject=body.subject;html=body.html;}
  else {
   const {data: landlord,error} = await db.from('profiles').select('email').eq('id',lease.user_id).single();
   if (error) throw new Response('Unable to load landlord contact.',{status:503});
   to=landlord?.email;subject='Message from your tenant';
   if (typeof body.message!=='string' || body.message.length>5000) throw new Response('Enter a message under 5,000 characters.',{status:400});
   html=`<p>${escapeHtml(lease.tenant_name || 'Your tenant')}</p><p>${escapeHtml(body.message)}</p>`;
  }
  if (!to || typeof subject!=='string' || !subject.trim() || subject.length>200 || /[\r\n]/.test(subject) || typeof html!=='string' || !html.trim() || html.length>50000) throw new Response('Review the recipient and message before sending.',{status:400});
  if (typeof body.request_id!=='string' || !/^[a-zA-Z0-9_-]{1,100}$/.test(body.request_id)) throw new Response('A message approval ID is required.',{status:400});
  return Response.json(await sendWorkspaceEmail(db,{actorId:user.id,leaseId:lease.id,to,subject,html,requestId:body.request_id}));
 } catch(error) {return apiError(error);}
}
