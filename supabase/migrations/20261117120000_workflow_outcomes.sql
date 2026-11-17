begin;
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
commit;
