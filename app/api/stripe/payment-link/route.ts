import Stripe from 'stripe';
import { workspaceAccess, apiError } from '@/lib/workspace/access';
import { reservePayment } from '@/lib/workspace/payments';
export async function POST(req: Request) {
  try {
    const {db,user} = await workspaceAccess(req);
    const {payment_id} = await req.json();
    const {attempt,payment,lease} = await reservePayment(db,user,payment_id,'checkout');
    const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!);
    if (attempt.provider_session_id) {
      const session = await stripe.checkout.sessions.retrieve(attempt.provider_session_id);
      if (session.status !== 'open' || !session.url) throw new Response('This payment session needs reconciliation before another attempt.',{status:409});
      return Response.json({url:session.url});
    }
    const metadata = {workspace_attempt_id:attempt.id,payment_id:payment.id,owner_id:lease.user_id};
    const session = await stripe.checkout.sessions.create({mode:'payment',line_items:[{quantity:1,price_data:{currency:'usd',unit_amount:Number(attempt.amount_cents),product_data:{name:`Rent due ${payment.due_date || ''}`}}}],
      payment_intent_data:{metadata,application_fee_amount:Math.min(Number(attempt.amount_cents),parseInt(process.env.KEYWISE_PLATFORM_FEE || '200',10)),transfer_data:{destination:attempt.destination}},metadata,
      success_url:'https://keywise.app/?payment_success=true',cancel_url:'https://keywise.app/',
    },{idempotencyKey:`workspace-checkout-${attempt.id}`});
    const {error} = await db.from('workspace_payment_attempts').update({provider_session_id:session.id}).eq('id',attempt.id);
    if (error) throw new Response('Payment session created; retry to recover the same session.',{status:503});
    return Response.json({url:session.url});
  } catch(error) {return apiError(error);}
}
