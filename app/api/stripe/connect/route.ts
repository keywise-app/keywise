import Stripe from 'stripe';
import {workspaceAccess,apiError} from '@/lib/workspace/access';
export async function POST(req:Request){
 try{
  const {db,user}=await workspaceAccess(req);const stripe=new Stripe(process.env.STRIPE_SECRET_KEY!);
  const {data:profile,error}=await db.from('profiles').select('stripe_account_id').eq('id',user.id).single();
  if(error)throw new Response('Unable to load your payment account.',{status:503});
  let accountId=profile.stripe_account_id;
  if(!accountId){
   const account=await stripe.accounts.create({type:'express',metadata:{user_id:user.id}},{idempotencyKey:`workspace-connect-${user.id}`});accountId=account.id;
   const {error:saveError}=await db.from('profiles').update({stripe_account_id:accountId}).eq('id',user.id);
   if(saveError)throw new Response('Unable to save your connected account. Retry to recover the same account.',{status:503});
  }
  const link=await stripe.accountLinks.create({account:accountId,type:'account_onboarding',refresh_url:'https://keywise.app/?page=settings',return_url:'https://keywise.app/?page=settings&stripe=connected'});
  return Response.json({url:link.url});
 }catch(error){return apiError(error);}
}
export async function GET(req:Request){
 try{
  const {db,user}=await workspaceAccess(req);
  const {data:profile,error}=await db.from('profiles').select('stripe_account_id').eq('id',user.id).single();
  if(error||!profile?.stripe_account_id)throw new Response('Connected account not found.',{status:404});
  const account=await new Stripe(process.env.STRIPE_SECRET_KEY!).accounts.retrieve(profile.stripe_account_id);
  return Response.json({account_id:account.id,charges_enabled:account.charges_enabled,payouts_enabled:account.payouts_enabled,details_submitted:account.details_submitted});
 }catch(error){return apiError(error);}
}
