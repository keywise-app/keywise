-- Fix RLS policies: change admin email from chris@keywise.app to cccolwell@gmail.com
-- This is the actual Supabase Auth login email.

-- ─────────────────────────────────────────────────────────────────
-- Migration 1 tables: agent_runs, agent_actions, agent_approvals,
--                     agent_memory, agent_briefings
-- ─────────────────────────────────────────────────────────────────

drop policy if exists "admin reads runs" on agent_runs;
create policy "admin reads runs" on agent_runs for select
  using (auth.jwt() ->> 'email' = 'cccolwell@gmail.com');

drop policy if exists "admin reads actions" on agent_actions;
create policy "admin reads actions" on agent_actions for select
  using (auth.jwt() ->> 'email' = 'cccolwell@gmail.com');

drop policy if exists "admin reads approvals" on agent_approvals;
create policy "admin reads approvals" on agent_approvals for select
  using (auth.jwt() ->> 'email' = 'cccolwell@gmail.com');

drop policy if exists "admin updates approvals" on agent_approvals;
create policy "admin updates approvals" on agent_approvals for update
  using (auth.jwt() ->> 'email' = 'cccolwell@gmail.com');

drop policy if exists "admin reads briefings" on agent_briefings;
create policy "admin reads briefings" on agent_briefings for select
  using (auth.jwt() ->> 'email' = 'cccolwell@gmail.com');

-- ─────────────────────────────────────────────────────────────────
-- Migration 2 tables: keyword_targets, rank_snapshots, forum_threads,
--   forum_response_drafts, reddit_activity_log, social_accounts,
--   social_posts, backlink_prospects, outreach_drafts,
--   pseo_templates, pseo_pages
-- ─────────────────────────────────────────────────────────────────

drop policy if exists "admin all" on keyword_targets;
create policy "admin all" on keyword_targets for all
  using (auth.jwt() ->> 'email' = 'cccolwell@gmail.com');

drop policy if exists "admin all" on rank_snapshots;
create policy "admin all" on rank_snapshots for all
  using (auth.jwt() ->> 'email' = 'cccolwell@gmail.com');

drop policy if exists "admin all" on forum_threads;
create policy "admin all" on forum_threads for all
  using (auth.jwt() ->> 'email' = 'cccolwell@gmail.com');

drop policy if exists "admin all" on forum_response_drafts;
create policy "admin all" on forum_response_drafts for all
  using (auth.jwt() ->> 'email' = 'cccolwell@gmail.com');

drop policy if exists "admin all" on reddit_activity_log;
create policy "admin all" on reddit_activity_log for all
  using (auth.jwt() ->> 'email' = 'cccolwell@gmail.com');

drop policy if exists "admin all" on social_accounts;
create policy "admin all" on social_accounts for all
  using (auth.jwt() ->> 'email' = 'cccolwell@gmail.com');

drop policy if exists "admin all" on social_posts;
create policy "admin all" on social_posts for all
  using (auth.jwt() ->> 'email' = 'cccolwell@gmail.com');

drop policy if exists "admin all" on backlink_prospects;
create policy "admin all" on backlink_prospects for all
  using (auth.jwt() ->> 'email' = 'cccolwell@gmail.com');

drop policy if exists "admin all" on outreach_drafts;
create policy "admin all" on outreach_drafts for all
  using (auth.jwt() ->> 'email' = 'cccolwell@gmail.com');

drop policy if exists "admin all" on pseo_templates;
create policy "admin all" on pseo_templates for all
  using (auth.jwt() ->> 'email' = 'cccolwell@gmail.com');

drop policy if exists "admin all" on pseo_pages;
create policy "admin all" on pseo_pages for all
  using (auth.jwt() ->> 'email' = 'cccolwell@gmail.com');

-- Note: the "public reads published pseo" policy on pseo_pages is
-- unchanged — it doesn't reference an email.
