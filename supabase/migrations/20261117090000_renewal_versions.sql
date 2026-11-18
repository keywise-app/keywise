begin;
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
commit;
