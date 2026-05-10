-- Keywise Agents v2: rank tracking, forum monitoring, social, outreach, programmatic SEO
-- Run AFTER 20260509000000_agent_framework.sql

-- ─────────────────────────────────────────────────────────────────
-- Rank tracking: keywords we want to own + daily snapshots
-- ─────────────────────────────────────────────────────────────────
create table if not exists keyword_targets (
  id uuid primary key default gen_random_uuid(),
  keyword text not null unique,
  intent text,                              -- 'commercial' | 'informational' | 'navigational'
  priority int not null default 3,          -- 1-5; 5 = critical
  target_position int default 5,            -- where we want to rank
  notes text,
  created_at timestamptz not null default now()
);

create table if not exists rank_snapshots (
  id uuid primary key default gen_random_uuid(),
  keyword_id uuid not null references keyword_targets(id) on delete cascade,
  recorded_on date not null default current_date,
  position numeric(5,2),                    -- avg position from Search Console; null = not in top 100
  impressions int default 0,
  clicks int default 0,
  ctr numeric(5,4),
  url text,                                 -- which page is ranking
  created_at timestamptz not null default now(),
  unique (keyword_id, recorded_on)
);

create index if not exists idx_rank_snapshots_kw_date on rank_snapshots(keyword_id, recorded_on desc);

-- ─────────────────────────────────────────────────────────────────
-- Forum monitoring (Reddit, BiggerPockets, IndieHackers, HN)
-- ─────────────────────────────────────────────────────────────────
create table if not exists forum_threads (
  id uuid primary key default gen_random_uuid(),
  platform text not null,                   -- 'reddit' | 'biggerpockets' | 'indiehackers' | 'hn'
  external_id text not null,                -- platform's post id
  subreddit text,                           -- or forum section
  url text not null,
  title text not null,
  body text,
  author text,
  posted_at timestamptz,
  score int,
  num_comments int,
  matched_keywords text[],                  -- which targets matched
  relevance_score numeric(3,2),             -- 0-1
  status text not null default 'new',       -- 'new' | 'drafted' | 'dismissed' | 'posted_by_user' | 'expired'
  discovered_at timestamptz not null default now(),
  unique (platform, external_id)
);

create index if not exists idx_forum_threads_status on forum_threads(status, relevance_score desc, discovered_at desc);

create table if not exists forum_response_drafts (
  id uuid primary key default gen_random_uuid(),
  thread_id uuid not null references forum_threads(id) on delete cascade,
  draft_text text not null,
  reasoning text,
  is_promotional boolean not null default false,
  promo_ratio_at_draft numeric(3,2),        -- our 1:9 ratio when this was drafted
  status text not null default 'pending',   -- 'pending' | 'edited' | 'posted' | 'rejected'
  created_at timestamptz not null default now(),
  posted_at timestamptz,
  posted_url text
);

-- Track our actual Reddit account activity (to enforce 9:1 ratio)
create table if not exists reddit_activity_log (
  id uuid primary key default gen_random_uuid(),
  acted_on date not null default current_date,
  helpful_comments int default 0,
  promotional_comments int default 0,
  notes text,
  unique (acted_on)
);

-- ─────────────────────────────────────────────────────────────────
-- Social media posting
-- ─────────────────────────────────────────────────────────────────
create table if not exists social_accounts (
  id uuid primary key default gen_random_uuid(),
  platform text not null unique,            -- 'twitter' | 'bluesky' | 'linkedin' | 'threads'
  handle text,
  enabled boolean not null default false,   -- you flip this on after wiring auth
  auto_post boolean not null default false, -- auto for owned accounts
  notes text,
  created_at timestamptz not null default now()
);

create table if not exists social_posts (
  id uuid primary key default gen_random_uuid(),
  platform text not null,
  account_id uuid references social_accounts(id),
  text text not null,
  link_url text,                            -- if posting a link
  media_urls text[],
  scheduled_for timestamptz,
  posted_at timestamptz,
  external_id text,                         -- platform's post id after posting
  external_url text,
  status text not null default 'draft',     -- 'draft' | 'scheduled' | 'posted' | 'failed' | 'rejected'
  campaign_tag text,                        -- 'blog_announce' | 'tip' | 'feature_launch' | 'reply'
  reasoning text,
  created_at timestamptz not null default now()
);

create index if not exists idx_social_posts_status on social_posts(status, scheduled_for);

-- ─────────────────────────────────────────────────────────────────
-- Backlink prospecting + outreach
-- ─────────────────────────────────────────────────────────────────
create table if not exists backlink_prospects (
  id uuid primary key default gen_random_uuid(),
  domain text not null,
  url text not null,
  contact_email text,
  contact_name text,
  topical_relevance numeric(3,2),           -- 0-1
  domain_authority int,                     -- if you have it from somewhere
  links_to_competitors text[],              -- which competitors they already link to
  pitch_angle text,                         -- the agent's hypothesis on why they'd link
  status text not null default 'new',       -- 'new' | 'drafted' | 'sent' | 'replied' | 'won' | 'lost'
  discovered_at timestamptz not null default now(),
  unique (url)
);

create table if not exists outreach_drafts (
  id uuid primary key default gen_random_uuid(),
  prospect_id uuid not null references backlink_prospects(id) on delete cascade,
  subject text not null,
  body text not null,
  status text not null default 'pending',   -- 'pending' | 'sent' | 'rejected'
  created_at timestamptz not null default now()
);

-- ─────────────────────────────────────────────────────────────────
-- Programmatic SEO pages (templated location/topic pages)
-- ─────────────────────────────────────────────────────────────────
create table if not exists pseo_templates (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,                -- 'city_property_management', 'state_landlord_laws'
  url_pattern text not null,                -- e.g. '/property-management-software-{city}'
  title_pattern text not null,
  intro_pattern text not null,
  required_data_keys text[] not null,       -- e.g. ['city','state','population','rent_median']
  created_at timestamptz not null default now()
);

create table if not exists pseo_pages (
  id uuid primary key default gen_random_uuid(),
  template_id uuid references pseo_templates(id),
  slug text not null unique,
  title text not null,
  meta_description text,
  data jsonb not null,                      -- the variables that fill the template
  body_markdown text not null,
  status text not null default 'draft',     -- 'draft' | 'published' | 'archived'
  published_at timestamptz,
  created_at timestamptz not null default now()
);

-- ─────────────────────────────────────────────────────────────────
-- RLS — admin-only as before
-- ─────────────────────────────────────────────────────────────────
alter table keyword_targets enable row level security;
alter table rank_snapshots enable row level security;
alter table forum_threads enable row level security;
alter table forum_response_drafts enable row level security;
alter table reddit_activity_log enable row level security;
alter table social_accounts enable row level security;
alter table social_posts enable row level security;
alter table backlink_prospects enable row level security;
alter table outreach_drafts enable row level security;
alter table pseo_templates enable row level security;
alter table pseo_pages enable row level security;

create policy "admin all" on keyword_targets for all using (auth.jwt() ->> 'email' = 'chris@keywise.app');
create policy "admin all" on rank_snapshots for all using (auth.jwt() ->> 'email' = 'chris@keywise.app');
create policy "admin all" on forum_threads for all using (auth.jwt() ->> 'email' = 'chris@keywise.app');
create policy "admin all" on forum_response_drafts for all using (auth.jwt() ->> 'email' = 'chris@keywise.app');
create policy "admin all" on reddit_activity_log for all using (auth.jwt() ->> 'email' = 'chris@keywise.app');
create policy "admin all" on social_accounts for all using (auth.jwt() ->> 'email' = 'chris@keywise.app');
create policy "admin all" on social_posts for all using (auth.jwt() ->> 'email' = 'chris@keywise.app');
create policy "admin all" on backlink_prospects for all using (auth.jwt() ->> 'email' = 'chris@keywise.app');
create policy "admin all" on outreach_drafts for all using (auth.jwt() ->> 'email' = 'chris@keywise.app');
create policy "admin all" on pseo_templates for all using (auth.jwt() ->> 'email' = 'chris@keywise.app');
create policy "admin all" on pseo_pages for all using (auth.jwt() ->> 'email' = 'chris@keywise.app');

-- Public read of pseo_pages (so they actually show on the site)
create policy "public reads published pseo" on pseo_pages for select
  using (status = 'published');
