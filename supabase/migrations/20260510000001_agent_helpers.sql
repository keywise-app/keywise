-- Helper RPC for the ranks dashboard

create or replace function latest_ranks()
returns table (
  keyword text,
  position numeric,
  url text,
  recorded_on date
)
language sql
stable
as $$
  select kt.keyword, rs.position, rs.url, rs.recorded_on
  from keyword_targets kt
  left join lateral (
    select position, url, recorded_on
    from rank_snapshots
    where keyword_id = kt.id
    order by recorded_on desc
    limit 1
  ) rs on true;
$$;

-- Seed example keyword targets (edit/replace with your real list)
insert into keyword_targets (keyword, intent, priority, target_position) values
  ('property management software', 'commercial', 5, 5),
  ('rent collection app', 'commercial', 5, 5),
  ('best landlord app', 'commercial', 4, 5),
  ('ai property management', 'commercial', 5, 3),
  ('property management software for small landlords', 'commercial', 4, 5),
  ('free property management software', 'commercial', 3, 8),
  ('how to manage rental properties', 'informational', 3, 8),
  ('rent collection stripe', 'informational', 3, 5),
  ('landlord rent collection software', 'commercial', 4, 5),
  ('keywise', 'navigational', 5, 1)
on conflict (keyword) do nothing;

-- Seed social_accounts (you flip enabled/auto_post on after wiring auth)
insert into social_accounts (platform, handle, enabled, auto_post) values
  ('twitter', 'keywise', false, false),
  ('bluesky', 'keywise.app', false, false),
  ('linkedin', 'keywise', false, false)
on conflict (platform) do nothing;
