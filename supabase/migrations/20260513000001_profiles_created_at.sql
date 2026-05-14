-- Add created_at column to profiles (was missing — broke admin signups display)

alter table profiles
  add column if not exists created_at timestamptz default now();

-- Backfill existing rows: pull created_at from auth.users
update profiles
set created_at = u.created_at
from auth.users u
where profiles.id = u.id
  and profiles.created_at is null;
