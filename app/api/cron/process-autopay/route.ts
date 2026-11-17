import {createClient} from '@supabase/supabase-js';
import Stripe from 'stripe';
import {reservePayment} from '@/lib/workspace/payments';
export const runtime='nodejs';
export const maxDuration=60;
export async function GET(req:Request) {
 if(!process.env.CRON_SECRET || req.headers.get('authorization')!==`Bearer ${process.env.CRON_SECRET}`)return Response.json({error:'Unauthorized'},{status:401});
 const db=createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!,process.env.SUPABASE_SERVICE_ROLE_KEY!,{auth:{persistSession:false}});
 const stripe=new Stripe(process.env.STRIPE_SECRET_KEY!);
 const {data:payments,error}=await db.from('payments').select('*,leases(tenant_user_id)').in('status',['pending','overdue']).lte('due_date',new Date().toISOString().slice(0,10)).or('type.is.null,type.eq.rent,type.eq.Monthly Rent');
 if(error)return Response.json({error:'Unable to load due payments.'},{status:503});
 let submitted=0,skipped=0,failed=0;
 for(const payment of payments || []) {
  try {
   const tenantId=payment.leases?.tenant_user_id;
   if(!tenantId){skipped++;continue;}
   const {data:profile}=await db.from('profiles').select('autopay_enabled,stripe_customer_id,stripe_payment_method_id').eq('id',tenantId).single();
   if(!profile?.autopay_enabled || !profile.stripe_customer_id || !profile.stripe_payment_method_id){skipped++;continue;}
   const {attempt}=await reservePayment(db,{id:tenantId},payment.id,'saved_card');
   const method=await stripe.paymentMethods.retrieve(profile.stripe_payment_method_id);
   if(method.customer!==profile.stripe_customer_id){skipped++;continue;}
   const intent=await stripe.paymentIntents.create({amount:Number(attempt.amount_cents),currency:'usd',customer:profile.stripe_customer_id,payment_method:method.id,off_session:true,confirm:true,
    application_fee_amount:Math.min(Number(attempt.amount_cents),parseInt(process.env.KEYWISE_PLATFORM_FEE || '200',10)),transfer_data:{destination:attempt.destination},metadata:{workspace_attempt_id:attempt.id,payment_id:payment.id,owner_id:payment.user_id}},
    {idempotencyKey:`workspace-payment-${attempt.id}`});
   const {error:saveError}=await db.from('workspace_payment_attempts').update({provider_intent_id:intent.id}).eq('id',attempt.id);
   if(saveError)throw saveError;
   submitted++;
  } catch {failed++;}
 }
 return Response.json({submitted,skipped,failed,confirmation:'Signed provider events confirm settlement.'});
}
