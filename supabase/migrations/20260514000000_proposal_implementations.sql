-- proposal_implementations: tracks each "Approve & implement" attempt.
-- One proposal can have multiple implementations (retries after failure).

create table if not exists proposal_implementations (
  id uuid primary key default gen_random_uuid(),
  proposal_id uuid not null references product_proposals(id) on delete cascade,
  status text not null default 'queued'
    check (status in (
      'queued',           -- row created, agent not started
      'agent_running',    -- Dev agent is writing the diff
      'agent_failed',     -- agent stopped (hit guardrail, error, or wouldn't touch the files)
      'pr_open',          -- PR is up, waiting for preview deploy
      'preview_ready',    -- preview screenshot captured, ready to merge
      'auto_merging',     -- auto-merge in flight
      'merged',           -- PR merged, waiting for prod deploy
      'shipped',          -- prod deploy live, prod screenshot captured
      'reverted',         -- a revert PR was opened/merged after shipping
      'failed'            -- any post-PR failure (build, deploy, screenshot)
    )),
  agent_run_id uuid,                    -- references agent_runs(id)
  branch text,                          -- e.g. cpo/proposal-abc123
  pr_number int,
  pr_url text,
  preview_url text,                     -- vercel preview deployment URL
  preview_screenshot_url text,          -- supabase storage URL
  prod_screenshot_url text,
  files_changed text[],                 -- paths the Dev agent modified
  diff_summary text,                    -- e.g. "+42 / -18 lines across 3 files"
  agent_reasoning text,                 -- the Dev agent's final summary
  cost_usd numeric(8,4),                -- anthropic spend for this implementation
  error text,
  started_at timestamptz not null default now(),
  pr_opened_at timestamptz,
  preview_ready_at timestamptz,
  merged_at timestamptz,
  shipped_at timestamptz
);

create index if not exists idx_proposal_implementations_proposal
  on proposal_implementations(proposal_id, started_at desc);
create index if not exists idx_proposal_implementations_status
  on proposal_implementations(status, started_at desc);

alter table proposal_implementations enable row level security;

create policy "admin all" on proposal_implementations for all
  using (auth.jwt() ->> 'email' = 'cccolwell@gmail.com');
