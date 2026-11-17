begin;
create table public.workspace_payment_attempts (
 id uuid primary key default gen_random_uuid(),
 payment_id uuid not null references public.payments(id),
 user_id uuid not null references auth.users(id),
 actor_id uuid not null references auth.users(id),
 base_received_cents bigint not null default 0,
 amount_cents bigint not null check (amount_cents > 0),
 currency text not null default 'usd' check(currency='usd'),
 destination text not null,
 mode text not null check(mode in ('checkout','saved_card')),
 status text not null default 'reserved' check(status in ('reserved','processing','succeeded','failed','returned','review')),
 provider_intent_id text unique,
 provider_session_id text unique,
 last_event_created bigint not null default 0,
 created_at timestamptz not null default now(),
 unique(payment_id)
);
create table public.workspace_provider_events (
 id text primary key,
 attempt_id uuid references public.workspace_payment_attempts(id),
 outcome text not null,
 created_at timestamptz not null default now()
);
alter table public.workspace_payment_attempts enable row level security;
alter table public.workspace_provider_events enable row level security;
-- Service-only mutation; clients cannot forge attempts or settlement events.
create or replace function public.workspace_reserve_payment(p_payment_id uuid,p_actor uuid,p_amount_cents bigint,p_destination text,p_mode text)
returns jsonb language plpgsql security definer set search_path=public,pg_temp as $$
declare p public.payments; l public.leases; a public.workspace_payment_attempts;
begin
 select * into p from public.payments where id=p_payment_id for update;
 select * into l from public.leases where id=p.lease_id;
 if p.id is null or p.user_id is distinct from l.user_id or
   (p_actor is distinct from l.user_id and p_actor is distinct from l.tenant_user_id) or
   (p_mode='saved_card' and p_actor is distinct from l.tenant_user_id) or
   p.status in ('paid','void','voided','cancelled','canceled','refunded') or
   p.amount is null or round(p.amount::numeric*100)-coalesce(p.received_cents,0)<>p_amount_cents or
   not exists(select 1 from public.profiles where id=l.user_id and stripe_account_id=p_destination)
 then raise exception 'Payment changed or not authorized'; end if;
 select * into a from public.workspace_payment_attempts where payment_id=p.id;
 if a.id is null then
   insert into public.workspace_payment_attempts(payment_id,user_id,actor_id,amount_cents,destination,mode,base_received_cents)
   values(p.id,l.user_id,p_actor,p_amount_cents,p_destination,p_mode,coalesce(p.received_cents,0)) returning * into a;
 end if;
 if a.amount_cents<>p_amount_cents or a.destination<>p_destination or a.status in ('succeeded','failed','returned','review') then
   raise exception 'Payment needs reconciliation';
 end if;
 return to_jsonb(a);
end $$;
revoke all on function public.workspace_reserve_payment(uuid,uuid,bigint,text,text) from public;
grant execute on function public.workspace_reserve_payment(uuid,uuid,bigint,text,text) to service_role;

-- Event insertion, attempt state and legacy compatibility projection commit together.
-- Provider timestamps protect against delayed events; returned/review never auto-resettle.
create or replace function public.workspace_apply_payment_event(p_event_id text,p_attempt_id uuid,p_intent_id text,p_amount_cents bigint,p_currency text,p_destination text,p_owner uuid,p_payment_id uuid,p_status text,p_event_created bigint)
returns text language plpgsql security definer set search_path=public,pg_temp as $$
declare a public.workspace_payment_attempts; p public.payments;
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
 if p_status not in ('processing','succeeded','failed','returned','review') then raise exception 'Invalid outcome'; end if;
 insert into public.workspace_provider_events(id,attempt_id,outcome) values(p_event_id,a.id,p_status);
 if p_event_created<a.last_event_created then return 'stale'; end if;
 if a.status in ('returned','review') or (a.status='succeeded' and p_status in ('processing','failed')) then return 'ignored'; end if;
 update public.workspace_payment_attempts set provider_intent_id=p_intent_id,status=p_status,last_event_created=p_event_created where id=a.id;
 perform set_config('keywise.financial_write','approved',true);
 if p_status='succeeded' then
   update public.payments set received_cents=a.amount_cents+a.base_received_cents,status='paid',paid_date=(now() at time zone 'UTC')::date,method='Stripe (verified)' where id=a.payment_id;
 elsif p_status in ('returned','review') then
   update public.payments set received_cents=a.base_received_cents,status='pending',paid_date=null,method='Stripe — reconciliation required' where id=a.payment_id;
 elsif p.status<>'paid' then
   update public.payments set status=case when p_status='processing' then 'processing' else 'pending' end where id=a.payment_id;
 end if;
 return 'applied';
end $$;
revoke all on function public.workspace_apply_payment_event(text,uuid,text,bigint,text,text,uuid,uuid,text,bigint) from public;
grant execute on function public.workspace_apply_payment_event(text,uuid,text,bigint,text,text,uuid,uuid,text,bigint) to service_role;
commit;
