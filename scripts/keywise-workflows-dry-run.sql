-- Generated release dry run: all changes roll back. Source: ordered workflow migrations.
begin;
set local lock_timeout='5s';
set local statement_timeout='60s';
-- 20261116235959_workflow_legacy_compatibility.sql
-- Preserve the legacy dollar unit while allowing exact cents in all workflow projections.
alter table public.leases alter column rent type numeric(12,2) using rent::numeric;
alter table public.leases alter column deposit type numeric(12,2) using deposit::numeric;
alter table public.properties alter column current_rent type numeric(12,2) using current_rent::numeric;
alter table public.expenses alter column amount type numeric(12,2) using amount::numeric;
alter table public.expenses add column if not exists property text;
update public.expenses e set property=p.address from public.properties p where e.property is null and e.property_id=p.id and e.user_id=p.user_id;
-- 20261117000000_landlord_workflows.sql
-- Additive workspace links. Existing address text remains readable for legacy records.
alter table public.leases add column if not exists property_id uuid references public.properties(id) on delete set null;
alter table public.maintenance add column if not exists property_id uuid references public.properties(id) on delete set null;
alter table public.maintenance add column if not exists lease_id uuid references public.leases(id) on delete set null;
-- Only backfill unique exact matches owned by the same landlord. Ambiguous records remain unlinked.
update public.leases l set property_id = p.id from public.properties p
where l.property_id is null and p.user_id = l.user_id and lower(trim(p.address)) = lower(trim(l.property))
and (select count(*) from public.properties p2 where p2.user_id = l.user_id and lower(trim(p2.address)) = lower(trim(l.property))) = 1;
update public.maintenance m set property_id = p.id from public.properties p
where m.property_id is null and p.user_id = m.user_id and lower(trim(p.address)) = lower(trim(m.property))
and (select count(*) from public.properties p2 where p2.user_id = m.user_id and lower(trim(p2.address)) = lower(trim(m.property))) = 1;
create index if not exists leases_property_link on public.leases(property_id);
create index if not exists maintenance_property_link on public.maintenance(property_id);
create index if not exists maintenance_lease_link on public.maintenance(lease_id);

create table public.workspace_tasks (
 id uuid primary key default gen_random_uuid(), user_id uuid not null references auth.users(id) on delete cascade,
 property_id uuid references public.properties(id) on delete set null,
 title text not null check (length(trim(title)) between 1 and 300), due_date date not null,
 completed_at timestamptz, created_at timestamptz not null default now()
);
alter table public.workspace_tasks enable row level security;
create policy tasks_owner on public.workspace_tasks for all to authenticated using (auth.uid() = user_id) with check (
 auth.uid() = user_id and (property_id is null or exists (select 1 from public.properties p where p.id = property_id and p.user_id = auth.uid()))
);
create index workspace_tasks_due on public.workspace_tasks(user_id, due_date) where completed_at is null;

create table public.maintenance_events (
 id uuid primary key default gen_random_uuid(), maintenance_id uuid not null references public.maintenance(id) on delete cascade,
 kind text not null check (kind in ('created','status','update')), message text not null,
 created_at timestamptz not null default now()
);
create table public.maintenance_files (
 id uuid primary key default gen_random_uuid(), maintenance_id uuid not null references public.maintenance(id) on delete cascade,
 name text not null, path text not null unique, type text not null check(type in ('photo','receipt')),
 created_at timestamptz not null default now()
);
-- Read/write through authenticated APIs that verify the lease/owner; no broad tenant table policy.
alter table public.maintenance_events enable row level security;
alter table public.maintenance_files enable row level security;
create index maintenance_events_parent on public.maintenance_events(maintenance_id,created_at);
create index maintenance_files_parent on public.maintenance_files(maintenance_id);
create function public.log_maintenance_status() returns trigger language plpgsql security definer set search_path = '' as $$
begin
 if TG_OP = 'INSERT' then
  insert into public.maintenance_events(maintenance_id,kind,message) values (NEW.id,'created','Request reported');
 elsif NEW.status is distinct from OLD.status then
  insert into public.maintenance_events(maintenance_id,kind,message) values (NEW.id,'status','Status changed to ' || NEW.status);
 end if;
 return NEW;
end;
$$;
create trigger maintenance_status_history after insert or update of status on public.maintenance for each row execute function public.log_maintenance_status();
insert into storage.buckets(id,name,public,file_size_limit,allowed_mime_types) values
 ('maintenance-evidence','maintenance-evidence',false,10485760,array['image/jpeg','image/png','image/webp','application/pdf']) on conflict(id) do nothing;

-- Reject cross-account record links even when an existing table policy permits owner writes.
create function public.validate_workspace_links() returns trigger language plpgsql set search_path = '' as $$
begin
 if NEW.property_id is not null and not exists (select 1 from public.properties p where p.id = NEW.property_id and p.user_id = NEW.user_id) then
  raise exception 'Property must belong to the record owner';
 end if;
 if TG_TABLE_NAME = 'maintenance' then
  if NEW.lease_id is not null and not exists (select 1 from public.leases l where l.id = NEW.lease_id and l.user_id = NEW.user_id and (NEW.property_id is null or l.property_id = NEW.property_id)) then
   raise exception 'Lease must belong to the record owner and property';
  end if;
 end if;
 return NEW;
end;
$$;
create trigger validate_lease_property before insert or update of property_id,user_id on public.leases for each row execute function public.validate_workspace_links();
create trigger validate_maintenance_links before insert or update of property_id,lease_id,user_id on public.maintenance for each row execute function public.validate_workspace_links();

-- 20261117010000_workspace_payment_safety.sql

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
-- 20261117020000_workspace_actions.sql

alter table public.leases add column if not exists lifecycle_state text check(lifecycle_state in ('future','active_fixed','month_to_month','needs_review','ended','archived'));
create table public.workspace_email_actions(
 id uuid primary key default gen_random_uuid(),
 actor_id uuid not null references auth.users(id),
 lease_id uuid not null references public.leases(id),
 request_id text not null,
 digest text not null,
 status text not null default 'approved' check(status in ('approved','provider_accepted')),
 provider_id text,
 created_at timestamptz not null default now(),
 unique(actor_id,request_id)
);
alter table public.workspace_email_actions enable row level security;
create function public.workspace_approve_email(p_actor uuid,p_lease uuid,p_request text,p_digest text)
returns jsonb language plpgsql security definer set search_path=public,pg_temp as $$
declare a public.workspace_email_actions;
begin
 if not exists(select 1 from public.leases where id=p_lease and (user_id=p_actor or tenant_user_id=p_actor)) then raise exception 'Not authorized'; end if;
 -- Serialize the rate check as well as retries across workers.
 perform pg_advisory_xact_lock(hashtextextended(p_actor::text,0));
 select * into a from public.workspace_email_actions where actor_id=p_actor and request_id=p_request;
 if a.id is not null then
  if a.digest<>p_digest or a.lease_id<>p_lease then raise exception 'Approval changed'; end if;
  return to_jsonb(a);
 end if;
 if (select count(*) from public.workspace_email_actions where actor_id=p_actor and created_at>now()-interval '1 hour')>=30 then raise exception 'Message limit reached'; end if;
 insert into public.workspace_email_actions(actor_id,lease_id,request_id,digest) values(p_actor,p_lease,p_request,p_digest) returning * into a;
 return to_jsonb(a);
end $$;
revoke all on function public.workspace_approve_email(uuid,uuid,text,text) from public;
grant execute on function public.workspace_approve_email(uuid,uuid,text,text) to service_role;
-- 20261117030000_workspace_extraction_limits.sql

create table public.workspace_extraction_runs(id uuid primary key default gen_random_uuid(),actor_id uuid not null references auth.users(id),created_at timestamptz not null default now());
alter table public.workspace_extraction_runs enable row level security;
create index on public.workspace_extraction_runs(actor_id,created_at);
create function public.workspace_extraction_limit(p_actor uuid) returns void language plpgsql security definer set search_path=public,pg_temp as $$
begin
 perform pg_advisory_xact_lock(hashtextextended(p_actor::text,1));
 if (select count(*) from public.workspace_extraction_runs where actor_id=p_actor and created_at>now()-interval '1 hour')>=10 then raise exception 'Extraction limit reached'; end if;
 insert into public.workspace_extraction_runs(actor_id) values(p_actor);
end $$;
revoke all on function public.workspace_extraction_limit(uuid) from public;
grant execute on function public.workspace_extraction_limit(uuid) to service_role;
-- 20261117040000_atomic_occupied_import.sql

alter table public.properties add column if not exists timezone text;
create table public.workspace_import_drafts(
 id uuid primary key,
 user_id uuid not null references auth.users(id),
 revision integer not null default 1,
 state text not null default 'draft' check(state in ('draft','committed')),
 payload jsonb not null,
 approved_plan jsonb,
 approved_digest text,
 lease_id uuid references public.leases(id),
 created_at timestamptz not null default now(),
 updated_at timestamptz not null default now()
);
alter table public.workspace_import_drafts enable row level security;
create index on public.workspace_import_drafts(user_id,updated_at desc);
create function public.workspace_save_import(p_id uuid,p_actor uuid,p_revision integer,p_payload jsonb,p_plan jsonb,p_digest text)
returns jsonb language plpgsql security definer set search_path=public,pg_temp as $$
declare d public.workspace_import_drafts;
begin
 perform pg_advisory_xact_lock(hashtextextended(p_id::text,2));
 select * into d from public.workspace_import_drafts where id=p_id for update;
 if d.id is null then
  if p_revision<>0 then raise exception 'Stale revision'; end if;
  insert into public.workspace_import_drafts(id,user_id,payload,approved_plan,approved_digest) values(p_id,p_actor,p_payload,p_plan,p_digest) returning * into d;
 else
  if d.user_id<>p_actor or d.revision<>p_revision or d.state<>'draft' then raise exception 'Stale or inaccessible draft'; end if;
  update public.workspace_import_drafts set payload=p_payload,approved_plan=p_plan,approved_digest=p_digest,revision=revision+1,updated_at=now() where id=p_id returning * into d;
 end if;
 return to_jsonb(d);
end $$;
create function public.workspace_commit_import(p_id uuid,p_actor uuid,p_revision integer,p_digest text,p_max_units integer)
returns jsonb language plpgsql security definer set search_path=public,pg_temp as $$
declare d public.workspace_import_drafts; p jsonb; u uuid; b uuid; l public.leases; entry jsonb; addr text;
begin
 -- Serialize all commits for this landlord (including unit-cap and duplicate checks).
 perform pg_advisory_xact_lock(hashtextextended(p_actor::text,3));
 select * into d from public.workspace_import_drafts where id=p_id for update;
 if d.id is null or d.user_id<>p_actor or d.revision<>p_revision or d.approved_digest is distinct from p_digest or p_digest is null then raise exception 'Approval changed'; end if;
 if d.state='committed' then select * into l from public.leases where id=d.lease_id; return to_jsonb(l); end if;
 p=d.approved_plan;
 if p is null then raise exception 'Review required'; end if;
 u=nullif(p->>'property_id','')::uuid;
 addr=p->>'address';
 if u is not null then
  if not exists(select 1 from public.properties where id=u and user_id=p_actor) then raise exception 'Property not found'; end if;
  select address into addr from public.properties where id=u;
  update public.properties set timezone=p->>'timezone' where id=u;
 else
  if (select count(*) from public.properties where user_id=p_actor and is_unit=true)>=p_max_units then raise exception 'Unit limit reached'; end if;
  if exists(select 1 from public.properties where user_id=p_actor and lower(trim(address))=lower(trim(addr))) then raise exception 'Property already exists; select it'; end if;
  b=gen_random_uuid();u=gen_random_uuid();
  insert into public.buildings(id,user_id,address,name,type,num_units) values(b,p_actor,addr,split_part(addr,',',1),'Single Family',1);
  insert into public.properties(id,user_id,building_id,address,unit_number,is_unit,current_rent,timezone) values(u,p_actor,b,addr,nullif(p->>'unit_number',''),true,(p->>'rent_cents')::numeric/100,p->>'timezone');
 end if;
 if exists(select 1 from public.leases where user_id=p_actor and property_id=u and coalesce(archived,false)=false and coalesce(status,'active') not in ('ended','terminated','inactive','archived')) then raise exception 'Existing tenancy needs review'; end if;
 insert into public.leases(id,user_id,property_id,property,tenant_name,email,phone,rent,deposit,start_date,end_date,status,lifecycle_state,payment_day)
 values(gen_random_uuid(),p_actor,u,addr,p->>'tenant_name',p->>'email',p->>'phone',(p->>'rent_cents')::numeric/100,(p->>'deposit_cents')::numeric/100,(p->>'start_date')::date,(p->>'end_date')::date,'active',p->>'lifecycle_state',case when jsonb_array_length(p->'schedule')>0 then extract(day from ((p->'schedule'->0->>'due_date')::date))::integer else null end) returning * into l;
 for entry in select * from jsonb_array_elements(p->'schedule') loop
  insert into public.payments(id,user_id,lease_id,property_id,property,tenant_name,amount,due_date,status,type)
  values(gen_random_uuid(),p_actor,l.id,u,addr,l.tenant_name,(entry->>'amount_cents')::numeric/100,(entry->>'due_date')::date,'pending','rent');
 end loop;
 update public.workspace_import_drafts set state='committed',lease_id=l.id,updated_at=now() where id=p_id;
 return to_jsonb(l);
end $$;
revoke all on function public.workspace_save_import(uuid,uuid,integer,jsonb,jsonb,text) from public;
revoke all on function public.workspace_commit_import(uuid,uuid,integer,text,integer) from public;
grant execute on function public.workspace_save_import(uuid,uuid,integer,jsonb,jsonb,text) to service_role;
grant execute on function public.workspace_commit_import(uuid,uuid,integer,text,integer) to service_role;
-- 20261117050000_workspace_receipts.sql

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
-- 20261117060000_workspace_charge_identity.sql

create function public.workspace_create_charge(p_id uuid,p_actor uuid,p_lease uuid,p_amount bigint,p_date date,p_type text,p_description text)
returns jsonb language plpgsql security definer set search_path=public,pg_temp as $$
declare l public.leases;p public.payments;
begin
 select * into l from leases where id=p_lease and user_id=p_actor;
 if l.id is null or p_amount<=0 then raise exception 'Invalid charge'; end if;
 perform pg_advisory_xact_lock(hashtextextended(p_id::text,4));
 select * into p from payments where id=p_id;
 if p.id is not null then
  if p.user_id<>p_actor or p.lease_id<>p_lease or round(p.amount*100)<>p_amount or p.due_date<>p_date or p.type<>p_type or coalesce(p.description,'')<>p_description then raise exception 'Charge changed'; end if;
  return to_jsonb(p);
 end if;
 insert into payments(id,user_id,lease_id,property_id,property,tenant_name,amount,due_date,status,type,description)
 values(p_id,p_actor,l.id,l.property_id,l.property,l.tenant_name,p_amount::numeric/100,p_date,'pending',p_type,p_description) returning * into p;
 return to_jsonb(p);
end $$;
revoke all on function public.workspace_create_charge(uuid,uuid,uuid,bigint,date,text,text) from public;
grant execute on function public.workspace_create_charge(uuid,uuid,uuid,bigint,date,text,text) to service_role;
-- 20261117070000_private_import_sources.sql

insert into storage.buckets(id,name,public,file_size_limit,allowed_mime_types)
values('workspace-sources','workspace-sources',false,10485760,array['application/pdf','image/jpeg','image/png','image/webp'])
on conflict(id) do update set public=false,file_size_limit=10485760,allowed_mime_types=excluded.allowed_mime_types;
create policy "workspace source owner upload" on storage.objects for insert to authenticated
with check(bucket_id='workspace-sources' and (storage.foldername(name))[1]=auth.uid()::text);
create policy "workspace source owner read" on storage.objects for select to authenticated
using(bucket_id='workspace-sources' and (storage.foldername(name))[1]=auth.uid()::text);
-- 20261117080000_repair_completion.sql

create table public.workspace_contractors(id uuid primary key,user_id uuid not null references auth.users(id),name text not null,contact text,created_at timestamptz not null default now());
alter table public.workspace_contractors enable row level security;
alter table public.maintenance add column if not exists workflow_revision integer not null default 0;
alter table public.maintenance add column if not exists contractor_snapshot jsonb;
alter table public.maintenance add column if not exists access_snapshot text;
alter table public.maintenance add column if not exists estimate_cents bigint check(estimate_cents>=0);
alter table public.maintenance add column if not exists actual_cents bigint check(actual_cents>=0);
alter table public.maintenance_events add column if not exists owner_details jsonb;
alter table public.maintenance_files add column if not exists sha256 text;
create unique index maintenance_file_content_identity on public.maintenance_files(maintenance_id,type,sha256) where sha256 is not null;
alter table public.expenses add column if not exists maintenance_id uuid references public.maintenance(id);
create unique index expense_repair_identity on public.expenses(maintenance_id) where maintenance_id is not null;
create function public.workspace_repair_command(p_id uuid,p_actor uuid,p_revision integer,p_command jsonb)
returns jsonb language plpgsql security definer set search_path=public,pg_temp as $$
declare m public.maintenance; c public.workspace_contractors; receipt public.maintenance_files;
begin
 select * into m from maintenance where id=p_id and user_id=p_actor for update;
 if m.id is null or m.workflow_revision<>p_revision then raise exception 'Repair changed'; end if;
 if p_command->>'operation'='assign' then
  select * into c from workspace_contractors where id=(p_command->>'contractor_id')::uuid and user_id=p_actor;
  if c.id is null or (p_command->>'estimate_cents')::bigint is null or (p_command->>'estimate_cents')::bigint<0 or length(p_command->>'access_notes')>2000 then raise exception 'Review contractor and approved estimate'; end if;
  update maintenance set contractor_snapshot=jsonb_build_object('id',c.id,'name',c.name,'contact',c.contact),access_snapshot=p_command->>'access_notes',estimate_cents=(p_command->>'estimate_cents')::bigint,status='in-progress',workflow_revision=workflow_revision+1 where id=p_id returning * into m;
  insert into maintenance_events(maintenance_id,kind,message,owner_details) values(p_id,'update','A contractor has been assigned.',p_command);
 elsif p_command->>'operation'='close' then
  if (p_command->>'actual_cents')::bigint is null or (p_command->>'actual_cents')::bigint<0 then raise exception 'Review actual cost'; end if;
  if (p_command->>'actual_cents')::bigint>0 then
   select * into receipt from maintenance_files where id=(p_command->>'receipt_id')::uuid and maintenance_id=p_id and type='receipt';
   if receipt.id is null then raise exception 'Attach the repair invoice or receipt'; end if;
  end if;
  update maintenance set actual_cents=(p_command->>'actual_cents')::bigint,status='resolved',resolved_date=current_date,workflow_revision=workflow_revision+1 where id=p_id returning * into m;
  if m.actual_cents>0 then
   insert into expenses(id,user_id,property,category,amount,date,description,deductible,maintenance_id)
   values(gen_random_uuid(),p_actor,m.property,'Repairs',m.actual_cents::numeric/100,current_date,'Repair: '||m.issue,false,m.id)
   on conflict(maintenance_id) where maintenance_id is not null do update set amount=excluded.amount;
  end if;
  if m.actual_cents=0 then update expenses set amount=0 where maintenance_id=m.id;end if;
  insert into maintenance_events(maintenance_id,kind,message,owner_details) values(p_id,'update','Repair completed.',p_command);
 elsif p_command->>'operation'='reopen' then
  update maintenance set status='open',resolved_date=null,workflow_revision=workflow_revision+1 where id=p_id returning * into m;
  insert into maintenance_events(maintenance_id,kind,message) values(p_id,'update','Repair reopened; prior completion and costs retained.');
 else raise exception 'Unknown repair operation'; end if;
 return to_jsonb(m);
end $$;
revoke all on function public.workspace_repair_command(uuid,uuid,integer,jsonb) from public;
grant execute on function public.workspace_repair_command(uuid,uuid,integer,jsonb) to service_role;
-- 20261117090000_renewal_versions.sql

alter table public.leases add column if not exists terms_revision integer not null default 0;
create function public.workspace_terms_revision() returns trigger language plpgsql as $$
begin
 if (new.rent,new.start_date,new.end_date,new.lifecycle_state) is distinct from (old.rent,old.start_date,old.end_date,old.lifecycle_state) then new.terms_revision=old.terms_revision+1;end if;
 return new;
end $$;
create trigger tenancy_terms_revision before update on public.leases for each row execute function public.workspace_terms_revision();
create table public.workspace_renewals(
 id uuid primary key,
 user_id uuid not null references auth.users(id),
 lease_id uuid not null references public.leases(id),
 base_revision integer not null,
 plan jsonb not null,
 digest text not null,
 state text not null default 'proposal' check(state in ('proposal','executed','applied')),
 executed_source text,
 created_at timestamptz not null default now(),
 executed_at timestamptz,
 applied_at timestamptz
);
alter table public.workspace_renewals enable row level security;
create function public.workspace_save_renewal(p_id uuid,p_actor uuid,p_lease uuid,p_revision integer,p_plan jsonb,p_digest text)
returns jsonb language plpgsql security definer set search_path=public,pg_temp as $$
declare l public.leases;r public.workspace_renewals;
begin
 select * into l from leases where id=p_lease and user_id=p_actor for update;
 if l.id is null or l.terms_revision<>p_revision then raise exception 'Tenancy terms changed';end if;
 select * into r from workspace_renewals where id=p_id;
 if r.id is not null then
  if r.user_id<>p_actor or r.lease_id<>p_lease or r.digest<>p_digest then raise exception 'Proposal changed';end if;
  return to_jsonb(r);
 end if;
 insert into workspace_renewals(id,user_id,lease_id,base_revision,plan,digest) values(p_id,p_actor,l.id,l.terms_revision,p_plan,p_digest) returning * into r;
 return to_jsonb(r);
end $$;
create function public.workspace_execute_renewal(p_id uuid,p_actor uuid,p_digest text,p_source text)
returns jsonb language plpgsql security definer set search_path=public,pg_temp as $$
declare r public.workspace_renewals;l public.leases;e jsonb;d date;rent_amount numeric;
begin
 -- Always lock tenancy before proposal to avoid deadlocks with proposal creation.
 select * into r from workspace_renewals where id=p_id and user_id=p_actor;
 if r.id is null then raise exception 'Proposal not found';end if;
 select * into l from leases where id=r.lease_id and user_id=p_actor for update;
 select * into r from workspace_renewals where id=p_id for update;
 if r.digest<>p_digest then raise exception 'Approval changed';end if;
 if r.state<>'proposal' then return to_jsonb(r);end if;
 if l.terms_revision<>r.base_revision or exists(select 1 from workspace_renewals where lease_id=l.id and state='executed' and id<>r.id) then raise exception 'A different version was executed; review current terms';end if;
 if p_source is null or p_source not like p_actor::text||'/%' or p_source like '%..%' then raise exception 'Executed source required';end if;
 d=(r.plan->>'effective_date')::date;rent_amount=(r.plan->>'rent_cents')::numeric/100;
 if d<(now() at time zone (r.plan->>'timezone'))::date then raise exception 'Past effective dates need reconciliation';end if;
 if exists(select 1 from workspace_payment_attempts a join payments p on p.id=a.payment_id where p.lease_id=l.id and p.due_date>=d) then raise exception 'Future payment attempts need reconciliation';end if;
 if exists(select 1 from payments where lease_id=l.id and due_date>=d and (status in ('paid','processing') or coalesce(received_cents,0)>0)) then raise exception 'Future payments already have activity; reconcile first';end if;
 -- Only the explicitly reviewed dates may be replaced; other future charges must be reviewed first.
 if exists(select 1 from payments p where p.lease_id=l.id and p.due_date>=d and p.type='rent' and p.status not in ('void','cancelled','refunded') and not exists(select 1 from jsonb_array_elements(r.plan->'schedule') schedule_entry where (schedule_entry->>'due_date')::date=p.due_date)) then raise exception 'Existing future schedule differs; review it first';end if;
 for e in select * from jsonb_array_elements(r.plan->'schedule') loop
  if (select count(*) from payments where lease_id=l.id and due_date=(e->>'due_date')::date and type='rent' and status not in ('void','cancelled','refunded'))>1 then raise exception 'Duplicate charges need review';end if;
  update payments set amount=rent_amount where lease_id=l.id and due_date=(e->>'due_date')::date and type='rent' and status not in ('void','cancelled','refunded');
  if not found then insert into payments(id,user_id,lease_id,property_id,property,tenant_name,amount,due_date,status,type) values(gen_random_uuid(),p_actor,l.id,l.property_id,l.property,l.tenant_name,rent_amount,(e->>'due_date')::date,'pending','rent');end if;
 end loop;
 update workspace_renewals set state='executed',executed_source=p_source,executed_at=now() where id=p_id returning * into r;
 return to_jsonb(r);
end $$;
create function public.workspace_apply_renewals(p_at timestamptz) returns integer language plpgsql security definer set search_path=public,pg_temp as $$
declare r public.workspace_renewals;n integer=0;
begin
 for r in select * from workspace_renewals where state='executed' and (plan->>'effective_date')::date<=(p_at at time zone (plan->>'timezone'))::date order by plan->>'effective_date' loop
  perform 1 from leases where id=r.lease_id for update;
  perform 1 from workspace_renewals where id=r.id and state='executed' for update;
  if not found then continue;end if;
  update leases set rent=(r.plan->>'rent_cents')::numeric/100,end_date=(r.plan->>'end_date')::date,lifecycle_state=r.plan->>'lifecycle_state' where id=r.lease_id;
  update workspace_renewals set state='applied',applied_at=now() where id=r.id;n=n+1;
 end loop;
 return n;
end $$;
revoke all on function public.workspace_save_renewal(uuid,uuid,uuid,integer,jsonb,text) from public;
revoke all on function public.workspace_execute_renewal(uuid,uuid,text,text) from public;
revoke all on function public.workspace_apply_renewals(timestamptz) from public;
grant execute on function public.workspace_save_renewal(uuid,uuid,uuid,integer,jsonb,text) to service_role;
grant execute on function public.workspace_execute_renewal(uuid,uuid,text,text) to service_role;
grant execute on function public.workspace_apply_renewals(timestamptz) to service_role;
-- 20261117100000_tenancy_members.sql

create table public.workspace_tenancy_members(
 lease_id uuid not null references public.leases(id),
 user_id uuid not null references auth.users(id),
 role text not null check(role in ('primary','occupant','cosigner','former')),
 status text not null check(status in ('active','revoked')),
 updated_at timestamptz not null default now(),
 primary key(lease_id,user_id)
);
alter table public.workspace_tenancy_members enable row level security;
-- 20261117110000_financial_write_guards.sql

create function public.workspace_guard_payment_history() returns trigger language plpgsql as $$
begin
 if TG_OP='DELETE' then
  if old.status='paid' or coalesce(old.received_cents,0)>0 or exists(select 1 from public.workspace_payment_attempts where payment_id=old.id) then raise exception 'Payment history must be reversed or voided, not deleted';end if;
  return old;
 end if;
 if current_setting('keywise.financial_write',true)='approved' then return new;end if;
 if TG_OP='INSERT' then
  if new.status='paid' or coalesce(new.received_cents,0)>0 then raise exception 'Record a confirmed receipt through the rent ledger';end if;
 else
  if (new.received_cents is distinct from old.received_cents) or (new.status is distinct from old.status and (new.status='paid' or old.status='paid')) then raise exception 'Record or reverse a confirmed receipt through the rent ledger';end if;
  if new.amount is distinct from old.amount and (coalesce(old.received_cents,0)>0 or exists(select 1 from public.workspace_payment_attempts where payment_id=old.id)) then raise exception 'Reconcile payment activity before changing the charge';end if;
 end if;
 return new;
end $$;
create trigger workspace_payment_history_guard before insert or update or delete on public.payments for each row execute function public.workspace_guard_payment_history();
-- 20261117120000_workflow_outcomes.sql

-- Fixed schema: no message content, source text, emails, amounts, URLs or free-form attributes.
create table public.workspace_workflow_outcomes(
 workflow_id uuid not null,
 user_id uuid not null references auth.users(id),
 workflow text not null check(workflow in ('occupied_import','rent_payment','repair','renewal')),
 event text not null check(event in ('started','completed')),
 version text not null default '2026-11-17-v1',
 occurred_at timestamptz not null default now(),
 primary key(workflow_id,event)
);
alter table public.workspace_workflow_outcomes enable row level security;
create function public.workspace_log_outcome() returns trigger language plpgsql security definer set search_path=public,pg_temp as $$
begin
 if TG_TABLE_NAME='workspace_import_drafts' then
  if TG_OP='INSERT' then insert into workspace_workflow_outcomes(workflow_id,user_id,workflow,event) values(new.id,new.user_id,'occupied_import','started') on conflict do nothing;
  elsif new.state='committed' and old.state<>'committed' then insert into workspace_workflow_outcomes(workflow_id,user_id,workflow,event) values(new.id,new.user_id,'occupied_import','completed') on conflict do nothing;end if;
 elsif TG_TABLE_NAME='workspace_payment_attempts' then
  if TG_OP='INSERT' then insert into workspace_workflow_outcomes(workflow_id,user_id,workflow,event) values(new.id,new.user_id,'rent_payment','started') on conflict do nothing;
  elsif new.status='succeeded' and old.status<>'succeeded' then insert into workspace_workflow_outcomes(workflow_id,user_id,workflow,event) values(new.id,new.user_id,'rent_payment','completed') on conflict do nothing;end if;
 elsif TG_TABLE_NAME='workspace_renewals' then
  if TG_OP='INSERT' then insert into workspace_workflow_outcomes(workflow_id,user_id,workflow,event) values(new.id,new.user_id,'renewal','started') on conflict do nothing;
  elsif new.state='applied' and old.state<>'applied' then insert into workspace_workflow_outcomes(workflow_id,user_id,workflow,event) values(new.id,new.user_id,'renewal','completed') on conflict do nothing;end if;
 end if;
 return new;
end $$;
create trigger import_outcomes after insert or update of state on public.workspace_import_drafts for each row execute function public.workspace_log_outcome();
create trigger payment_outcomes after insert or update of status on public.workspace_payment_attempts for each row execute function public.workspace_log_outcome();
create trigger renewal_outcomes after insert or update of state on public.workspace_renewals for each row execute function public.workspace_log_outcome();
-- 20261117130000_exact_refund_amounts.sql

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
-- 20261117140000_provider_profile_guards.sql

-- Browser profile edits must not change financial identity or paid entitlements.
create function public.workspace_guard_provider_profile() returns trigger language plpgsql as $$
declare field text; n jsonb=to_jsonb(new); o jsonb;
begin
 if current_user not in ('authenticated','anon') then return new;end if;
 if TG_OP='INSERT' then
  if coalesce(n->>'subscription_status','free')<>'free' or coalesce(n->>'stripe_customer_id','')<>'' or coalesce(n->>'stripe_account_id','')<>'' or coalesce(n->>'stripe_payment_method_id','')<>'' or coalesce((n->>'autopay_enabled')::boolean,false) then raise exception 'Payment setup and entitlements require server verification';end if;
 else
  o=to_jsonb(old);
  foreach field in array array['stripe_customer_id','stripe_account_id','stripe_payment_method_id','subscription_status','trial_ends_at','price_tier','is_founding_member','founding_member_number','founding_member_locked_at','founding_member_continuous'] loop
   if n->field is distinct from o->field then raise exception 'Payment setup and entitlements require server verification';end if;
  end loop;
  if coalesce((n->>'autopay_enabled')::boolean,false) and n->'autopay_enabled' is distinct from o->'autopay_enabled' then raise exception 'Auto-pay requires verified payment setup';end if;
 end if;
 return new;
end $$;
create trigger workspace_provider_profile_guard before insert or update on public.profiles for each row execute function public.workspace_guard_provider_profile();
select 'All workflow migrations validated; dry run rolled back' as result;
rollback;
