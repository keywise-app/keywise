-- Compliance calculations history table
-- Stores every rent cap calculation with full input/output for audit trail.
-- Supports multiple law codes (AB1482 now, AB2801 later).

create table if not exists compliance_calculations (
  id uuid primary key default gen_random_uuid(),
  unit_id uuid references properties(id) on delete cascade,
  user_id uuid not null,
  law_code text not null check (law_code in ('AB1482', 'AB2801')),
  input_snapshot jsonb not null,
  result jsonb not null,
  calculated_at timestamptz not null default now(),
  valid_until timestamptz,
  notes text
);

create index if not exists idx_compliance_calc_unit
  on compliance_calculations(unit_id, calculated_at desc);

create index if not exists idx_compliance_calc_user
  on compliance_calculations(user_id, calculated_at desc);

create index if not exists idx_compliance_calc_valid_until
  on compliance_calculations(valid_until)
  where valid_until is not null;

alter table compliance_calculations enable row level security;

create policy "users own compliance calcs"
  on compliance_calculations for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- Add compliance alert preference to profiles
alter table profiles
  add column if not exists notify_compliance boolean default true;

-- Add rent increase tracking + AB 1482 flag to properties
alter table properties
  add column if not exists last_rent_increase_date date,
  add column if not exists last_rent_increase_amount numeric,
  add column if not exists ab1482_subject boolean;
