-- Dashboard rebuild: bring the live schema into version control.
--
-- Several columns/tables referenced by app code (the Stripe webhook's
-- founding-member logic, the admin dashboard's traffic/AI-usage/intel
-- sections) were created by hand-run SQL that was never committed as a
-- migration. `price_tier`/`is_founding_member`/etc. don't exist on
-- `profiles` in production at all, so every webhook write to them has
-- been failing silently since it shipped. This migration adds what's
-- missing and formally tracks what already exists live, so a fresh
-- environment matches production and future changes are diffable.

-- profiles: founding-member / pricing-tier columns (referenced by
-- app/api/stripe/webhook/route.ts and app/api/founding-member-count,
-- neither of which currently has anywhere to write/read this data)
alter table profiles add column if not exists price_tier text;
alter table profiles add column if not exists is_founding_member boolean not null default false;
alter table profiles add column if not exists founding_member_number integer;
alter table profiles add column if not exists founding_member_locked_at timestamptz;
alter table profiles add column if not exists founding_member_continuous boolean not null default false;

-- payments: tenant rent payments (Stripe Connect + manual). Already
-- live in production; this just registers its real shape.
create table if not exists payments (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  user_id uuid,
  lease_id uuid,
  tenant_id uuid,
  property_id uuid,
  amount integer,
  due_date date,
  paid_date date,
  status text default 'pending',
  method text,
  description text,
  type text,
  payment_link text,
  payment_link_url text,
  property text,
  tenant_name text
);

create index if not exists idx_payments_status on payments(status);
create index if not exists idx_payments_lease on payments(lease_id, due_date);

-- page_views: lightweight visit log written client-side (app/api/track-visit)
create table if not exists page_views (
  id uuid primary key default gen_random_uuid(),
  page text,
  referrer text,
  user_agent text,
  visited_at timestamptz not null default now(),
  date date not null default current_date
);

create index if not exists idx_page_views_date on page_views(date);

-- ai_usage: per-user AI feature usage, used for rate limiting
create table if not exists ai_usage (
  id uuid primary key default gen_random_uuid(),
  user_id uuid,
  feature text,
  date date not null default current_date,
  month text,
  count integer not null default 0,
  created_at timestamptz not null default now()
);

create index if not exists idx_ai_usage_user_date on ai_usage(user_id, date);

-- intelligence_reports: CMO agent's competitive research output
create table if not exists intelligence_reports (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  date date not null default current_date,
  summary text,
  urgent jsonb default '[]',
  opportunities jsonb default '[]',
  trends jsonb default '[]',
  competitor_updates jsonb default '[]',
  status text default 'new'
);

create index if not exists idx_intelligence_reports_date on intelligence_reports(date desc);
