-- Lock down blog_drafts: only the admin can read drafts and mutate any row;
-- the public can read published rows (so the public /blog pages keep working
-- if they ever drop the service-role key path).
--
-- The original 20260511000000_blog_drafts.sql migration shipped without RLS
-- enabled, leaving the table world-readable through anon. P0 fix.

alter table blog_drafts enable row level security;

drop policy if exists "admin all" on blog_drafts;
create policy "admin all" on blog_drafts for all
  using (auth.jwt() ->> 'email' = 'cccolwell@gmail.com');

drop policy if exists "public reads published blog" on blog_drafts;
create policy "public reads published blog" on blog_drafts for select
  using (status = 'published');
