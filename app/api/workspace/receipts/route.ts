import {workspaceAccess,apiError} from '@/lib/workspace/access';
import {civilDate} from '@/lib/workspace/imports';
export async function POST(req:Request) {
 try {
  const {db,user}=await workspaceAccess(req);const body=await req.json();
  if(!Number.isSafeInteger(body.amount_cents) || body.amount_cents<=0)throw new Response('Enter the actual amount received in cents.',{status:400});
  civilDate(body.received_on);
  const {data,error}=await db.rpc('workspace_record_receipt',{p_id:body.id,p_actor:user.id,p_payment:body.payment_id,p_amount:body.amount_cents,p_date:body.received_on,p_method:body.method});
  if(error)throw new Response('Receipt could not be recorded. Review the amount, payment and any online attempt.',{status:409});
  return Response.json({payment:data});
 }catch(error){return apiError(error);}
}
export async function DELETE(req:Request) {
 try {
  const {db,user}=await workspaceAccess(req);const body=await req.json();
  const {error}=await db.rpc('workspace_reverse_receipt',{p_receipt:body.receipt_id,p_actor:user.id,p_reason:body.reason});
  if(error)throw new Response('Receipt could not be reversed. Check its ownership and reason.',{status:409});
  return Response.json({success:true});
 }catch(error){return apiError(error);}
}
