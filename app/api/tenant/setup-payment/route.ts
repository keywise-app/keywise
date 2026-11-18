import Stripe from 'stripe';
import { workspaceAccess, requireLease, apiError } from '@/lib/workspace/access';
export async function POST(req: Request) {
  try {
    const {db,user} = await workspaceAccess(req);
    const {lease_id,payment_type} = await req.json();
    const lease = await requireLease(db,user,lease_id,'pay');
    if (lease.tenant_user_id !== user.id) throw new Response('Only the linked tenant can set up their card.',{status:403});
    if (!user.email) throw new Response('A verified account email is required.',{status:409});
    const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!);
    const {data:profile,error} = await db.from('profiles').select('stripe_customer_id').eq('id',user.id).single();
    if (error) throw new Response('Unable to load your payment profile.',{status:503});
    let customerId = profile.stripe_customer_id;
    if (!customerId) {
      const customer = await stripe.customers.create({email:user.email,metadata:{workspace_user_id:user.id,role:'tenant'}},{idempotencyKey:`tenant-customer-${user.id}`});
      customerId = customer.id;
      const {error:saveError} = await db.from('profiles').update({stripe_customer_id:customerId}).eq('id',user.id);
      if (saveError) throw new Response('Unable to save payment setup. Please try again.',{status:503});
    }
    const session = await stripe.checkout.sessions.create({mode:'setup',currency:'usd',customer:customerId,payment_method_types:['card'],
      success_url:'https://keywise.app/?setup_success=true&session_id={CHECKOUT_SESSION_ID}',cancel_url:'https://keywise.app/',
      metadata:{lease_id,user_id:user.id,payment_type:payment_type==='autopay'?'autopay':'manual'},
    });
    return Response.json({checkoutUrl:session.url});
  } catch(error) {return apiError(error);}
}
