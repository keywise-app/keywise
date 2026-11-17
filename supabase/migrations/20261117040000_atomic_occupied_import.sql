begin;
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
commit;
