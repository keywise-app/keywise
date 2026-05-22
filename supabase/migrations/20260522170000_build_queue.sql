-- Unified build queue. Single entry point for every agent's proposals.
-- Conflict prevention (affected_files overlap) and ordering (depends_on) live here.
-- All agents call lib/agent-tools/pipeline/propose.ts; nothing writes here directly.

create table if not exists build_queue (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  description text not null,
  source_agent text not null
    check (source_agent in ('cpo','cmo','competitive_intel','manual')),
  category text not null
    check (category in ('feature','bug','content','marketing','infra')),
  priority text not null default 'medium'
    check (priority in ('critical','high','medium','low')),
  status text not null default 'proposed'
    check (status in ('proposed','approved','queued','in_progress','shipped','rejected','failed')),
  dedupe_hash text not null,
  affected_files text[] not null default '{}',
  depends_on uuid[] not null default '{}',
  pr_url text,
  preview_url text,
  assigned_to text not null default 'developer_agent',
  rationale text,
  created_at timestamptz not null default now(),
  approved_at timestamptz,
  shipped_at timestamptz,
  decided_by text,
  decision_note text
);

-- Prevent duplicate ACTIVE items. Once an item is rejected/shipped, the same
-- title+category can be proposed again — that's intentional.
create unique index if not exists idx_build_queue_dedupe_active
  on build_queue(dedupe_hash)
  where status not in ('rejected','shipped');

-- Picker query reads by status + priority; this index supports it.
create index if not exists idx_build_queue_status_priority
  on build_queue(status, priority, created_at desc);

-- Dashboard filters by source.
create index if not exists idx_build_queue_source_agent
  on build_queue(source_agent, status);

alter table build_queue enable row level security;

create policy "admin all on build_queue" on build_queue for all
  using (auth.jwt() ->> 'email' = 'cccolwell@gmail.com')
  with check (auth.jwt() ->> 'email' = 'cccolwell@gmail.com');

-- https://supabase.com/dashboard/project/zrsahaclgbhezfqspqxa/sql/new
