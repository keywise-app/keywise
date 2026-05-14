-- A2P 10DLC SMS consent on the lease.
-- Tenants must opt in before /api/send-sms will dispatch to Twilio.
-- The opt-in/opt-out audit trail lives in sms_consent_events.

alter table public.leases
  add column if not exists sms_consent boolean not null default false,
  add column if not exists sms_consent_at timestamptz,
  add column if not exists sms_consent_source text,        -- 'wizard' | 'tenant_portal' | 'imported_written'
  add column if not exists sms_consent_ip inet,
  add column if not exists sms_consent_user_agent text,
  add column if not exists sms_opted_out_at timestamptz;   -- set when STOP received

create table if not exists public.sms_consent_events (
  id           uuid primary key default gen_random_uuid(),
  lease_id     uuid not null references public.leases(id) on delete cascade,
  phone        text not null,
  event_type   text not null check (event_type in ('opt_in','opt_out','reconfirm')),
  source       text not null,
  ip           inet,
  user_agent   text,
  consent_text text,           -- exact disclosure text shown at opt-in (verbatim)
  created_at   timestamptz not null default now()
);

create index if not exists sms_consent_events_lease_idx on public.sms_consent_events(lease_id);
create index if not exists sms_consent_events_phone_idx on public.sms_consent_events(phone);

alter table public.sms_consent_events enable row level security;

drop policy if exists "owner reads consent events"   on public.sms_consent_events;
drop policy if exists "owner inserts consent events" on public.sms_consent_events;

create policy "owner reads consent events"
  on public.sms_consent_events for select
  using (exists (select 1 from public.leases l where l.id = lease_id and l.user_id = auth.uid()));

create policy "owner inserts consent events"
  on public.sms_consent_events for insert
  with check (exists (select 1 from public.leases l where l.id = lease_id and l.user_id = auth.uid()));
