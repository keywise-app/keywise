-- Fix: trial_ends_at was only ever set by the Stripe webhook, so anyone who
-- signed up via the no-credit-card free trial path (the actual advertised
-- flow — see /pricing FAQ: "14 days, full Pro features, no credit card
-- required") never got a trial end date. Their trial clock was never
-- running, which meant no automated lifecycle email could ever be timed
-- correctly. Fix the signup trigger to set it explicitly, and backfill
-- existing trial users so the nurture cron has real dates to work with.

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.profiles (id, email, full_name, phone, role, subscription_status, trial_ends_at)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data ->> 'full_name', ''),
    coalesce(new.raw_user_meta_data ->> 'phone', ''),
    'landlord',
    'trial',
    now() + interval '14 days'
  )
  on conflict (id) do nothing;

  return new;
exception
  when others then
    raise notice 'handle_new_user failed for %: %', new.id, sqlerrm;
    return new;
end;
$$;

-- Backfill existing trial users who never got a clock. Anchored to their
-- actual signup date (not "now") -- several of these are already well past
-- 14 days, which is accurate: they've been in unmonitored trial limbo for
-- months, not newly started.
update public.profiles
set trial_ends_at = created_at + interval '14 days'
where subscription_status = 'trial'
  and trial_ends_at is null;

-- Tracks which nurture-sequence email each trial user has received, so the
-- daily cron never sends the same stage twice.
create table if not exists public.trial_nurture_log (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  email_type text not null,
  sent_at timestamptz not null default now(),
  unique (user_id, email_type)
);

alter table public.trial_nurture_log enable row level security;

create policy "Service role manages trial nurture log"
  on public.trial_nurture_log
  for all
  using (auth.role() = 'service_role')
  with check (auth.role() = 'service_role');
