begin;
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
commit;
