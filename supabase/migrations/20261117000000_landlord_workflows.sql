-- Additive workspace links. Existing address text remains readable for legacy records.
begin;
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

commit;
