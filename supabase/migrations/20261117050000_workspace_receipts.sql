begin;
-- Widen the registered dollar column without changing its monetary unit or existing values.
alter table public.payments alter column amount type numeric(12,2) using amount::numeric;
alter table public.payments add column if not exists received_cents bigint check(received_cents>=0);
create table public.workspace_receipts(
 id uuid primary key,
 user_id uuid not null references auth.users(id),
 lease_id uuid not null references public.leases(id),
 amount_cents bigint not null check(amount_cents>0),
 currency text not null default 'usd' check(currency='usd'),
 received_on date not null,
 method text not null,
 created_at timestamptz not null default now()
);
create table public.workspace_allocations(
 receipt_id uuid not null references public.workspace_receipts(id),
 payment_id uuid not null references public.payments(id),
 amount_cents bigint not null check(amount_cents>0),
 primary key(receipt_id,payment_id)
);
create table public.workspace_receipt_reversals(
 receipt_id uuid primary key references public.workspace_receipts(id),
 user_id uuid not null references auth.users(id),
 reason text not null,
 created_at timestamptz not null default now()
);
alter table public.workspace_receipts enable row level security;
alter table public.workspace_allocations enable row level security;
alter table public.workspace_receipt_reversals enable row level security;
create function public.workspace_record_receipt(p_id uuid,p_actor uuid,p_payment uuid,p_amount bigint,p_date date,p_method text)
returns jsonb language plpgsql security definer set search_path=public,pg_temp as $$
declare p public.payments; r public.workspace_receipts; total bigint;
begin
 select * into p from public.payments where id=p_payment for update;
 if p.id is null or p.user_id<>p_actor or not exists(select 1 from leases where id=p.lease_id and user_id=p_actor) then raise exception 'Payment not found'; end if;
 select * into r from workspace_receipts where id=p_id;
 if r.id is not null then
  if r.user_id<>p_actor or r.amount_cents<>p_amount or r.received_on<>p_date or r.method<>p_method or not exists(select 1 from workspace_allocations where receipt_id=p_id and payment_id=p_payment) then raise exception 'Receipt changed'; end if;
  return to_jsonb(p);
 end if;
 if p.status in ('paid','void','voided','cancelled','canceled','refunded') or p_amount<=0 or p_amount>round(p.amount*100)-coalesce(p.received_cents,0) or p_date>current_date or p_method not in ('Zelle','Venmo','Cash','Check','Bank Transfer','Other') then raise exception 'Review receipt amount, date and method'; end if;
 if exists(select 1 from workspace_payment_attempts where payment_id=p.id) then raise exception 'Reconcile the online attempt before recording an offline receipt'; end if;
 insert into workspace_receipts(id,user_id,lease_id,amount_cents,received_on,method) values(p_id,p_actor,p.lease_id,p_amount,p_date,p_method);
 insert into workspace_allocations(receipt_id,payment_id,amount_cents) values(p_id,p.id,p_amount);
 perform set_config('keywise.financial_write','approved',true);
 total=coalesce(p.received_cents,0)+p_amount;
 update payments set received_cents=total,status=case when total=round(amount*100) then 'paid' else 'pending' end,paid_date=case when total=round(amount*100) then p_date else null end,method=p_method where id=p.id returning * into p;
 return to_jsonb(p);
end $$;
create function public.workspace_reverse_receipt(p_receipt uuid,p_actor uuid,p_reason text)
returns void language plpgsql security definer set search_path=public,pg_temp as $$
declare r public.workspace_receipts; a public.workspace_allocations;
begin
 select * into r from workspace_receipts where id=p_receipt for update;
 if r.id is null or r.user_id<>p_actor or length(trim(p_reason))<3 or length(p_reason)>1000 then raise exception 'Review reversal'; end if;
 if exists(select 1 from workspace_receipt_reversals where receipt_id=p_receipt) then return; end if;
 perform set_config('keywise.financial_write','approved',true);
 for a in select * from workspace_allocations where receipt_id=p_receipt order by payment_id loop
  perform 1 from payments where id=a.payment_id for update;
  update payments set received_cents=received_cents-a.amount_cents,status='pending',paid_date=null where id=a.payment_id;
 end loop;
 insert into workspace_receipt_reversals(receipt_id,user_id,reason) values(r.id,p_actor,p_reason);
end $$;
revoke all on function public.workspace_record_receipt(uuid,uuid,uuid,bigint,date,text) from public;
revoke all on function public.workspace_reverse_receipt(uuid,uuid,text) from public;
grant execute on function public.workspace_record_receipt(uuid,uuid,uuid,bigint,date,text) to service_role;
grant execute on function public.workspace_reverse_receipt(uuid,uuid,text) to service_role;
commit;
