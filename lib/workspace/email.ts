import { createHash } from 'node:crypto';
import { Resend } from 'resend';
export const escapeHtml = (value: string) => value.replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]!));
export async function sendWorkspaceEmail(db: any, input: {actorId:string;leaseId:string;to:string;subject:string;html:string;requestId:string}) {
 const digest = createHash('sha256').update(JSON.stringify([input.leaseId,input.to,input.subject,input.html])).digest('hex');
 const {data: action,error} = await db.rpc('workspace_approve_email',{p_actor:input.actorId,p_lease:input.leaseId,p_request:input.requestId,p_digest:digest});
 if (error || !action) throw new Response('Message changed or cannot be sent. Review it and try again.',{status:409});
 if (action.status==='provider_accepted') return {success:true,status:'provider_accepted',id:action.provider_id};
 if (Date.now()-new Date(action.created_at).getTime()>23*3600000) throw new Response('This message needs delivery reconciliation before retrying.',{status:409});
 const {data,error:providerError} = await new Resend(process.env.RESEND_API_KEY).emails.send({from:'Keywise <noreply@keywise.app>',to:input.to,subject:input.subject,html:input.html},{idempotencyKey:`workspace-email-${action.id}`});
 if (providerError || !data?.id) throw new Response('Delivery is unconfirmed. Retry the same message to reconcile it.',{status:503});
 const {error:saveError} = await db.from('workspace_email_actions').update({status:'provider_accepted',provider_id:data.id}).eq('id',action.id);
 if (saveError) throw new Response('The provider accepted the message; confirmation is pending. Retry the same message.',{status:503});
 return {success:true,status:'provider_accepted',id:data.id};
}
