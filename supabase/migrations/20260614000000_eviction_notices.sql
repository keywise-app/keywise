-- Just-Cause Eviction Notice Wizard
-- Stores generated notices with full audit trail

create table if not exists eviction_notices (
  id uuid primary key default gen_random_uuid(),
  unit_id uuid references properties(id) on delete cascade,
  user_id uuid not null,
  notice_type text not null,
  at_fault boolean not null,
  situation_inputs jsonb not null,
  notice_days integer not null,
  can_cure boolean,
  cure_terms text,
  relocation_amount numeric,
  notice_text text not null,
  defect_checks jsonb,
  retaliation_flag boolean default false,
  served_at timestamptz,
  served_method text,
  expires_at date,
  status text default 'draft' check (status in ('draft', 'served', 'expired', 'resolved')),
  pdf_path text,
  created_at timestamptz not null default now()
);

create index if not exists idx_eviction_notices_unit
  on eviction_notices(unit_id, created_at desc);
create index if not exists idx_eviction_notices_user
  on eviction_notices(user_id, status, created_at desc);

alter table eviction_notices enable row level security;
create policy "users own eviction notices" on eviction_notices for all
  using (auth.uid() = user_id) with check (auth.uid() = user_id);
