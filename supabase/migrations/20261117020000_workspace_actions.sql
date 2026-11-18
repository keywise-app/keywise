begin;
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
commit;
