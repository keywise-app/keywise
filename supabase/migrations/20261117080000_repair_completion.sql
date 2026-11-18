begin;
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
commit;
