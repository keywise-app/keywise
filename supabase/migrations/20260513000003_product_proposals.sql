-- Product proposals filed by the CPO agent.
-- Every product change goes through Chris for review; this table is the queue.

create table if not exists product_proposals (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  description text not null,                  -- markdown: Friction / Proposed change / Why this matters
  severity text not null
    check (severity in ('critical', 'high', 'medium', 'low')),
  affected_route text,                        -- e.g. /properties/[id]/fmv
  status text not null default 'proposed'
    check (status in ('proposed', 'approved', 'in_progress', 'shipped', 'rejected')),
  proposed_by_agent text not null default 'cpo',
  created_at timestamptz not null default now(),
  decided_at timestamptz,
  decided_by text,
  decision_note text
);

create index if not exists idx_product_proposals_status_severity
  on product_proposals(status, severity, created_at desc);

-- RLS — admin-only, same pattern as the rest of the agent tables
alter table product_proposals enable row level security;

create policy "admin all" on product_proposals for all
  using (auth.jwt() ->> 'email' = 'cccolwell@gmail.com');
