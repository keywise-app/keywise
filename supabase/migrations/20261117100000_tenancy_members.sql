begin;
create table public.workspace_tenancy_members(
 lease_id uuid not null references public.leases(id),
 user_id uuid not null references auth.users(id),
 role text not null check(role in ('primary','occupant','cosigner','former')),
 status text not null check(status in ('active','revoked')),
 updated_at timestamptz not null default now(),
 primary key(lease_id,user_id)
);
alter table public.workspace_tenancy_members enable row level security;
commit;
