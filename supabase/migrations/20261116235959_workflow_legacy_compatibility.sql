-- Preserve the legacy dollar unit while allowing exact cents in all workflow projections.
begin;
alter table public.leases alter column rent type numeric(12,2) using rent::numeric;
alter table public.leases alter column deposit type numeric(12,2) using deposit::numeric;
alter table public.properties alter column current_rent type numeric(12,2) using current_rent::numeric;
alter table public.expenses alter column amount type numeric(12,2) using amount::numeric;
alter table public.expenses add column if not exists property text;
update public.expenses e set property=p.address from public.properties p where e.property is null and e.property_id=p.id and e.user_id=p.user_id;
commit;
