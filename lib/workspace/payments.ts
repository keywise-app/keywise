import { requireLease } from './access';
import { getLimits } from '../../app/lib/planLimits';

// Legacy payments.amount is dollars, as used by the existing payment forms.
// Do not backfill or reinterpret unknown imports as cents.
export function legacyAmountCents(value: unknown) {
  const text = String(value ?? '');
  if (!/^\d+(\.\d{1,2})?$/.test(text)) throw new Response('Payment amount needs review.', { status: 409 });
  const cents = Math.round(Number(text) * 100);
  if (!Number.isSafeInteger(cents) || cents <= 0 || cents > 100_000_000) throw new Response('Payment amount needs review.', { status: 409 });
  return cents;
}
export async function requirePayment(db: any, user: {id: string}, id: string) {
  if (typeof id !== 'string' || !id) throw new Response('Select a recorded payment.', {status:400});
  const {data: payment, error} = await db.from('payments').select('*').eq('id',id).maybeSingle();
  if (error) throw new Response('Unable to load payment.', {status:500});
  if (!payment?.lease_id) throw new Response('Payment not found.', {status:404});
  const lease = await requireLease(db,user,payment.lease_id,'pay');
  if (payment.user_id !== lease.user_id) throw new Response('Payment not found.', {status:404});
  if (['paid','void','voided','cancelled','canceled','refunded'].includes(payment.status)) throw new Response('This payment is no longer payable.',{status:409});
  const confirmed = Number(payment.received_cents || 0);
  if (!Number.isSafeInteger(confirmed) || confirmed < 0) throw new Response('Payment needs review.',{status:409});
  const amountCents=legacyAmountCents(payment.amount)-confirmed;
  if (amountCents<=0) throw new Response('This payment is no longer payable.',{status:409});
  return {payment,lease,amountCents};
}
export function intentMatches(attempt: any, intent: any) {
  return !!attempt && intent.metadata?.workspace_attempt_id === attempt.id &&
    intent.metadata?.payment_id === attempt.payment_id && intent.metadata?.owner_id === attempt.user_id &&
    intent.amount === Number(attempt.amount_cents) && intent.currency === attempt.currency &&
    intent.transfer_data?.destination === attempt.destination &&
    (!attempt.provider_intent_id || attempt.provider_intent_id === intent.id);
}
export async function reservePayment(db: any, user: {id: string}, paymentId: string, mode: 'checkout'|'saved_card') {
  const {payment,lease,amountCents} = await requirePayment(db,user,paymentId);
  const {data: owner,error} = await db.from('profiles').select('stripe_account_id,subscription_status').eq('id',lease.user_id).single();
  if (error || !owner?.stripe_account_id) throw new Response('The landlord must connect a Stripe account first.',{status:409});
  if (!getLimits(owner.subscription_status).onlinePayments) throw new Response('Online payments are unavailable on this landlord’s current plan.',{status:403});
  const {data: attempt,error: reserveError} = await db.rpc('workspace_reserve_payment',{
    p_payment_id:payment.id,p_actor:user.id,p_amount_cents:amountCents,p_destination:owner.stripe_account_id,p_mode:mode,
  });
  if (reserveError || !attempt) throw new Response('Payment changed or is unavailable. Reload before trying again.',{status:409});
  if (Date.now()-new Date(attempt.created_at).getTime()>23*3600000) throw new Response('This attempt needs provider reconciliation before retrying.',{status:409});
  if (attempt.mode !== mode) throw new Response('A payment is already in progress. Complete or reconcile it before starting another.',{status:409});
  return {attempt,payment,lease};
}
