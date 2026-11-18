begin;
alter table public.workspace_payment_attempts add column refunded_cents bigint not null default 0 check(refunded_cents>=0 and refunded_cents<=amount_cents);
drop function public.workspace_apply_payment_event(text,uuid,text,bigint,text,text,uuid,uuid,text,bigint);
create or replace function public.workspace_apply_payment_event(p_event_id text,p_attempt_id uuid,p_intent_id text,p_amount_cents bigint,p_currency text,p_destination text,p_owner uuid,p_payment_id uuid,p_status text,p_event_created bigint,p_refund_cents bigint default 0)
returns text language plpgsql security definer set search_path=public,pg_temp as $$
declare a public.workspace_payment_attempts; p public.payments; base bigint;
begin
 select * into a from public.workspace_payment_attempts where id=p_attempt_id for update;
 if a.id is null then raise exception 'Unknown payment attempt'; end if;
 if exists(select 1 from public.workspace_provider_events where id=p_event_id) then return 'duplicate'; end if;
 select * into p from public.payments where id=a.payment_id for update;
 if a.payment_id<>p_payment_id or a.user_id<>p_owner or p.user_id<>a.user_id or
   a.amount_cents<>p_amount_cents or a.currency<>p_currency or a.destination<>p_destination or
   (a.provider_intent_id is not null and a.provider_intent_id<>p_intent_id) or
   p.amount is null or round(p.amount::numeric*100)<>a.amount_cents+a.base_received_cents
 then raise exception 'Payment identity mismatch'; end if;
 if p_refund_cents<0 or p_refund_cents>a.amount_cents then raise exception 'Invalid refunded amount';end if;
 if p_status not in ('processing','succeeded','failed','returned','review') then raise exception 'Invalid outcome'; end if;
 insert into public.workspace_provider_events(id,attempt_id,outcome) values(p_event_id,a.id,p_status);
 if p_event_created<a.last_event_created then return 'stale'; end if;
 if (a.status in ('returned','review') and p_status not in ('returned','review')) or (a.status='succeeded' and p_status in ('processing','failed')) then return 'ignored'; end if;
 if p_refund_cents<a.refunded_cents then return 'ignored';end if;
 select greatest(0,a.base_received_cents-coalesce(sum(x.amount_cents),0)) into base from workspace_allocations x join workspace_receipt_reversals r on r.receipt_id=x.receipt_id where x.payment_id=a.payment_id;
 update public.workspace_payment_attempts set refunded_cents=p_refund_cents,provider_intent_id=p_intent_id,status=p_status,last_event_created=p_event_created where id=a.id;
 perform set_config('keywise.financial_write','approved',true);
 if p_status='succeeded' then
   update public.payments set received_cents=a.amount_cents+base,status='paid',paid_date=(now() at time zone coalesce((select timezone from properties where id=p.property_id),'UTC'))::date,method='Stripe (verified)' where id=a.payment_id;
 elsif p_status in ('returned','review') then
   update public.payments set received_cents=base+a.amount_cents-p_refund_cents,status='review',paid_date=null,method='Stripe — reconciliation required' where id=a.payment_id;
 elsif p.status<>'paid' then
   update public.payments set status=case when p_status='processing' then 'processing' else 'pending' end where id=a.payment_id;
 end if;
 return 'applied';
end $$;
revoke all on function public.workspace_apply_payment_event(text,uuid,text,bigint,text,text,uuid,uuid,text,bigint,bigint) from public;
grant execute on function public.workspace_apply_payment_event(text,uuid,text,bigint,text,text,uuid,uuid,text,bigint,bigint) to service_role;
commit;
