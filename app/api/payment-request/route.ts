import {createHash} from 'node:crypto';
import {workspaceAccess,requireLease,apiError} from '@/lib/workspace/access';
import {civilDate} from '@/lib/workspace/imports';
import {legacyAmountCents} from '@/lib/workspace/payments';
import {sendWorkspaceEmail,escapeHtml} from '@/lib/workspace/email';
import {getLimits} from '@/app/lib/planLimits';
import {POST as createCheckout} from '../stripe/payment-link/route';
export async function POST(req:Request) {
 try {
  const {db,user}=await workspaceAccess(req);const body=await req.json();
  const lease=await requireLease(db,user,body.lease_id);
  if(lease.user_id!==user.id)throw new Response('Only the landlord can create charges.',{status:403});
  const {data:profile,error}=await db.from('profiles').select('subscription_status').eq('id',user.id).single();
  if(error || !getLimits(profile?.subscription_status).onlinePayments)throw new Response('Online payment requests require an eligible plan.',{status:403});
  if(body.recurring)throw new Response('Create and review a bounded rent schedule in rental setup. This action creates one charge.',{status:409});
  const cents=legacyAmountCents(body.amount),date=civilDate(body.due_date);
  const description=typeof body.description==='string'?body.description.slice(0,1000):'';
  const type=body.type==='Monthly Rent'?'rent':String(body.type || 'other').toLowerCase().replace(/\s+/g,'_').slice(0,40);
  const hash=createHash('sha256').update(JSON.stringify([user.id,lease.id,type,cents,date,description])).digest('hex');
  const id=`${hash.slice(0,8)}-${hash.slice(8,12)}-4${hash.slice(13,16)}-a${hash.slice(17,20)}-${hash.slice(20,32)}`;
  const {data:payment,error:insertError}=await db.rpc('workspace_create_charge',{p_id:id,p_actor:user.id,p_lease:lease.id,p_amount:cents,p_date:date,p_type:type,p_description:description});
  if(insertError)throw new Response('Unable to create the charge. Review existing charges before retrying.',{status:409});
  const checkout=await createCheckout(new Request('https://keywise.app/api/stripe/payment-link',{method:'POST',headers:{authorization:req.headers.get('authorization')!,'Content-Type':'application/json'},body:JSON.stringify({payment_id:payment.id})}));
  const result=await checkout.json();
  if(!checkout.ok)return Response.json({...result,payment_id:payment.id,charge_created:true},{status:checkout.status});
  let email_status='not_requested';
  if(body.notify_email && lease.email) {
   const email=await sendWorkspaceEmail(db,{actorId:user.id,leaseId:lease.id,to:lease.email,requestId:`charge-${id}`,subject:`Payment request due ${date}`,html:`<p>Hi ${escapeHtml(lease.tenant_name || '')},</p><p>$${(cents/100).toFixed(2)} is due on ${date}.</p><p>${escapeHtml(description)}</p><p><a href="${escapeHtml(result.url)}">Review and pay</a></p>`});
   email_status=email.status;
  }
  return Response.json({success:true,payment_id:payment.id,payment_link:result.url,payments_created:1,email_status,sms_status:body.notify_sms?'not_sent':'not_requested'});
 }catch(error){return apiError(error);}
}
