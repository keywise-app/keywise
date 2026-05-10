-- Keywise Agents: state, memory, action log, approvals
-- Run with: supabase migration up

-- Each agent run = one invocation of an agent (cron tick, admin trigger, webhook)
create table if not exists agent_runs (
  id uuid primary key default gen_random_uuid(),
  role text not null,                    -- 'cmo' | 'cro' | 'product' | ...
  task text not null,                    -- 'daily_audit' | 'weekly_seo' | ...
  trigger text not null,                 -- 'cron' | 'manual' | 'webhook'
  status text not null default 'running',-- 'running' | 'success' | 'failed' | 'awaiting_approval'
  model text,
  input_tokens int default 0,
  output_tokens int default 0,
  cost_usd numeric(10,4) default 0,
  started_at timestamptz not null default now(),
  finished_at timestamptz,
  summary text,                          -- short human-readable summary
  error text,
  metadata jsonb default '{}'::jsonb
);

create index if not exists idx_agent_runs_role_started on agent_runs(role, started_at desc);
create index if not exists idx_agent_runs_status on agent_runs(status) where status in ('running','awaiting_approval');

-- Every tool call inside a run, plus its decision tier and outcome
create table if not exists agent_actions (
  id uuid primary key default gen_random_uuid(),
  run_id uuid not null references agent_runs(id) on delete cascade,
  role text not null,
  tool text not null,
  authority text not null,               -- 'auto' | 'approve' | 'escalate'
  status text not null,                  -- 'executed' | 'pending_approval' | 'approved' | 'rejected' | 'escalated' | 'failed'
  reasoning text,                        -- why the agent chose this
  input jsonb not null,
  result jsonb,
  estimated_impact text,                 -- e.g. '$12/day saved', '+~30 clicks/wk'
  approval_id uuid,                      -- references agent_approvals if applicable
  created_at timestamptz not null default now(),
  executed_at timestamptz
);

create index if not exists idx_agent_actions_run on agent_actions(run_id);
create index if not exists idx_agent_actions_status on agent_actions(status, created_at desc);

-- Pending approvals you tap through in the dashboard
create table if not exists agent_approvals (
  id uuid primary key default gen_random_uuid(),
  run_id uuid not null references agent_runs(id) on delete cascade,
  role text not null,
  tool text not null,
  reasoning text not null,
  proposed_input jsonb not null,
  estimated_impact text,
  status text not null default 'pending', -- 'pending' | 'approved' | 'rejected' | 'expired'
  decided_by text,                        -- 'chris' | 'auto-expired'
  decided_at timestamptz,
  decision_note text,
  expires_at timestamptz default (now() + interval '7 days'),
  created_at timestamptz not null default now()
);

create index if not exists idx_agent_approvals_pending on agent_approvals(status, created_at desc) where status = 'pending';

-- Long-term memory per agent role (key/value with embeddings optional later)
create table if not exists agent_memory (
  id uuid primary key default gen_random_uuid(),
  role text not null,
  key text not null,                     -- e.g. 'ad:campaign_42:notes'
  value jsonb not null,
  importance int not null default 1,     -- 1-5; higher = retained longer
  updated_at timestamptz not null default now(),
  unique (role, key)
);

create index if not exists idx_agent_memory_role on agent_memory(role, updated_at desc);

-- Daily briefings the Chief of Staff (or a simple aggregator) produces
create table if not exists agent_briefings (
  id uuid primary key default gen_random_uuid(),
  date date not null unique,
  summary text not null,                 -- markdown
  highlights jsonb not null default '[]'::jsonb, -- per-role highlights
  pending_decisions int not null default 0,
  created_at timestamptz not null default now()
);

-- RLS: only service_role writes; admin user reads
alter table agent_runs enable row level security;
alter table agent_actions enable row level security;
alter table agent_approvals enable row level security;
alter table agent_memory enable row level security;
alter table agent_briefings enable row level security;

-- Replace 'YOUR_ADMIN_USER_ID' with your auth.users id, or scope by email claim
create policy "admin reads runs" on agent_runs for select
  using (auth.jwt() ->> 'email' = 'chris@keywise.app');
create policy "admin reads actions" on agent_actions for select
  using (auth.jwt() ->> 'email' = 'chris@keywise.app');
create policy "admin reads approvals" on agent_approvals for select
  using (auth.jwt() ->> 'email' = 'chris@keywise.app');
create policy "admin updates approvals" on agent_approvals for update
  using (auth.jwt() ->> 'email' = 'chris@keywise.app');
create policy "admin reads briefings" on agent_briefings for select
  using (auth.jwt() ->> 'email' = 'chris@keywise.app');
