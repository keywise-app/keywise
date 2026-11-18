begin;
create table public.workspace_growth_cohorts (
 user_id uuid primary key references auth.users(id) on delete cascade,
 source text not null check(source in ('direct','landlord-community','agent-referral','founder-network')),
 signup_at timestamptz not null,
 first_observed_at timestamptz not null default now()
);
create table public.workspace_growth_visits (
 user_id uuid not null references auth.users(id) on delete cascade,
 visited_on date not null default (now() at time zone 'UTC')::date,
 primary key(user_id,visited_on)
);
alter table public.workspace_growth_cohorts enable row level security;
alter table public.workspace_growth_visits enable row level security;
revoke all on public.workspace_growth_cohorts,public.workspace_growth_visits from public,anon,authenticated;
grant select,insert,update,delete on public.workspace_growth_cohorts,public.workspace_growth_visits to service_role;
create function public.workspace_growth_job_outcome() returns trigger language plpgsql security definer set search_path=public,pg_temp as $$
begin
 if TG_TABLE_NAME='maintenance' then
  if TG_OP='INSERT' then
   insert into workspace_workflow_outcomes(workflow_id,user_id,workflow,event) values(new.id,new.user_id,'repair','started') on conflict do nothing;
  end if;
  if new.status='resolved' and (TG_OP='INSERT' or old.status is distinct from new.status) then
   insert into workspace_workflow_outcomes(workflow_id,user_id,workflow,event) values(new.id,new.user_id,'repair','completed') on conflict do nothing;
  end if;
 elsif TG_TABLE_NAME='workspace_receipts' then
  insert into workspace_workflow_outcomes(workflow_id,user_id,workflow,event) values(new.id,new.user_id,'rent_payment','started'),(new.id,new.user_id,'rent_payment','completed') on conflict do nothing;
 end if;
 return new;
end $$;
create trigger growth_repair_outcomes after insert or update of status on public.maintenance for each row execute function public.workspace_growth_job_outcome();
create trigger growth_receipt_outcomes after insert on public.workspace_receipts for each row execute function public.workspace_growth_job_outcome();
create function public.workspace_growth_funnel() returns jsonb language sql security definer set search_path=public,pg_temp set timezone='UTC' as $$
 with owners as (
  select c.*,a.activated_at,j.first_job_at,n.next_due,
   exists(select 1 from workspace_growth_visits v where v.user_id=c.user_id and v.visited_on>=n.next_due and v.visited_on<n.next_due+7) as returned
  from workspace_growth_cohorts c
  left join lateral(select min(occurred_at) activated_at from workspace_workflow_outcomes o where o.user_id=c.user_id and workflow='occupied_import' and event='completed') a on true
  left join lateral(select min(occurred_at) first_job_at from workspace_workflow_outcomes o where o.user_id=c.user_id and workflow in ('rent_payment','repair','renewal') and event='completed' and occurred_at>=a.activated_at and not exists(select 1 from workspace_receipt_reversals r where r.receipt_id=o.workflow_id)) j on true
  left join lateral(select min(p.due_date) next_due from workspace_import_drafts d join payments p on p.lease_id=d.lease_id and p.user_id=d.user_id where d.user_id=c.user_id and d.state='committed' and p.due_date>a.activated_at::date and p.status not in ('void','voided','cancelled') and coalesce(p.type,'rent') in ('rent','Monthly Rent')) n on true
 ), counts as (
  select source,count(*) observed_owners,count(*) filter(where signup_at>=now()-interval '30 days') new_accounts_30_days,
   count(*) filter(where activated_at is not null) activated_owners,
   count(*) filter(where first_job_at is not null) owners_with_first_job,
   count(*) filter(where next_due is null) owners_without_next_rent_date,
   count(*) filter(where current_date>=next_due+7) rent_cycle_eligible,
   count(*) filter(where current_date>=next_due+7 and returned) returned_next_rent_cycle
  from owners group by source
 ) select coalesce(jsonb_agg(to_jsonb(counts)),'[]'::jsonb) from counts;
$$;
revoke all on function public.workspace_growth_funnel() from public,anon,authenticated;
grant execute on function public.workspace_growth_funnel() to service_role;
commit;
