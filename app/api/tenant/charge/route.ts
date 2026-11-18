import Stripe from 'stripe';
import { workspaceAccess, apiError } from '@/lib/workspace/access';
import { reservePayment } from '@/lib/workspace/payments';
export async function POST(req: Request) {
  try {
    const {db,user} = await workspaceAccess(req);
    const {payment_id} = await req.json();
    const {attempt,lease} = await reservePayment(db,user,payment_id,'saved_card');
    if (lease.tenant_user_id !== user.id) throw new Response('Only the linked tenant can use a saved card.',{status:403});
    const {data: profile,error} = await db.from('profiles').select('stripe_customer_id,stripe_payment_method_id').eq('id',user.id).single();
    if (error || !profile?.stripe_customer_id || !profile.stripe_payment_method_id) throw new Response('Set up a payment method first.',{status:409});
    const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!);
    const method = await stripe.paymentMethods.retrieve(profile.stripe_payment_method_id);
    if (method.customer !== profile.stripe_customer_id) throw new Response('Payment method needs verification.',{status:409});
    const intent = await stripe.paymentIntents.create({amount:Number(attempt.amount_cents),currency:'usd',customer:profile.stripe_customer_id,
      payment_method:method.id,confirm:true,off_session:true,
      application_fee_amount: Math.min(Number(attempt.amount_cents),parseInt(process.env.KEYWISE_PLATFORM_FEE || '200',10)),
      transfer_data:{destination:attempt.destination},metadata:{workspace_attempt_id:attempt.id,payment_id,owner_id:lease.user_id},
    },{idempotencyKey:`workspace-payment-${attempt.id}`});
    const {error: saveError} = await db.from('workspace_payment_attempts').update({provider_intent_id:intent.id}).eq('id',attempt.id);
    if (saveError) throw new Response('Payment submitted; confirmation is pending. Do not submit another payment.',{status:503});
    // Only the verified webhook settles the ledger. A synchronous response is not a receipt.
    return Response.json({success:true,status:'processing',payment_intent_id:intent.id});
  } catch(error) {return apiError(error);}
}
