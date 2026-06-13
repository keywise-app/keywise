-- AB 2801 Move-Out Documentation Workflow
-- Extends existing inspections/inspection_photos tables, adds analysis + itemization

-- Add AB 2801 columns to existing inspections table
alter table inspections
  add column if not exists unit_id uuid references properties(id) on delete set null,
  add column if not exists inspection_date date default current_date,
  add column if not exists ab2801_type text check (ab2801_type in ('move-in', 'move-out-pre-repair', 'move-out-post-repair'));

create index if not exists idx_inspections_unit_ab2801
  on inspections(unit_id, ab2801_type, created_at desc)
  where unit_id is not null;

-- Add sort_order to existing inspection_photos
alter table inspection_photos
  add column if not exists sort_order integer default 0;

-- AI analysis comparing move-in vs move-out photos
create table if not exists inspection_analyses (
  id uuid primary key default gen_random_uuid(),
  unit_id uuid not null references properties(id) on delete cascade,
  move_in_inspection_id uuid references inspections(id),
  move_out_inspection_id uuid not null references inspections(id),
  ai_findings jsonb not null,
  cost_usd numeric,
  generated_at timestamptz not null default now()
);

create index if not exists idx_inspection_analyses_unit
  on inspection_analyses(unit_id, generated_at desc);

alter table inspection_analyses enable row level security;
create policy "users own inspection analyses" on inspection_analyses for all
  using (
    exists (select 1 from inspections i where i.id = inspection_analyses.move_out_inspection_id and i.user_id = auth.uid())
  )
  with check (
    exists (select 1 from inspections i where i.id = inspection_analyses.move_out_inspection_id and i.user_id = auth.uid())
  );

-- Deposit itemization (the document sent to tenant)
create table if not exists deposit_itemizations (
  id uuid primary key default gen_random_uuid(),
  unit_id uuid not null references properties(id) on delete cascade,
  user_id uuid not null,
  move_out_date date not null,
  deadline_at date not null,
  deposit_amount numeric not null,
  line_items jsonb not null default '[]',
  total_deducted numeric default 0,
  balance_to_tenant numeric default 0,
  status text not null default 'draft' check (status in ('draft', 'sent', 'completed')),
  sent_at timestamptz,
  sent_method text,
  pdf_path text,
  tenant_email text,
  created_at timestamptz not null default now()
);

create index if not exists idx_deposit_itemizations_unit
  on deposit_itemizations(unit_id, created_at desc);
create index if not exists idx_deposit_itemizations_deadline
  on deposit_itemizations(deadline_at) where status = 'draft';

alter table deposit_itemizations enable row level security;
create policy "users own deposit itemizations" on deposit_itemizations for all
  using (auth.uid() = user_id) with check (auth.uid() = user_id);
