import Stripe from 'stripe';
import { workspaceAccess, requireLease, apiError } from '@/lib/workspace/access';
export async function POST(req: Request) {
  try {
    const {db,user} = await workspaceAccess(req);
    const {session_id} = await req.json();
    if (typeof session_id !== 'string' || !session_id.startsWith('cs_')) throw new Response('A completed setup session is required.',{status:400});
    const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!);
    const session = await stripe.checkout.sessions.retrieve(session_id,{expand:['setup_intent']});
    if (session.mode!=='setup' || session.status!=='complete' || session.metadata?.user_id!==user.id) throw new Response('Setup session not found.',{status:404});
    const lease = await requireLease(db,user,session.metadata.lease_id);
    if (lease.tenant_user_id!==user.id) throw new Response('Setup session not found.',{status:404});
    const {data:profile,error} = await db.from('profiles').select('stripe_customer_id').eq('id',user.id).single();
    const setup = session.setup_intent as Stripe.SetupIntent;
    if (error || !profile || session.customer!==profile.stripe_customer_id || setup?.status!=='succeeded' || setup.customer!==profile.stripe_customer_id) throw new Response('Payment setup is awaiting verification.',{status:409});
    const methodId = typeof setup.payment_method === 'string' ? setup.payment_method : setup.payment_method?.id;
    if (!methodId) throw new Response('No verified payment method found.',{status:409});
    const {error:saveError} = await db.from('profiles').update({stripe_payment_method_id:methodId,autopay_enabled:session.metadata.payment_type==='autopay'}).eq('id',user.id);
    if (saveError) throw new Response('Unable to save your payment method.',{status:503});
    return Response.json({success:true,payment_method_id:methodId});
  } catch(error) {return apiError(error);}
}
