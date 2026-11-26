-- Assign a founding number once, in a single transaction, for a completed checkout.
-- The lifetime count includes cancelled founding members, so numbers are never reused.
create or replace function public.claim_founding_member(p_user_id uuid)
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  member public.profiles%rowtype;
  claimed_count integer;
  next_number integer;
begin
  perform pg_advisory_xact_lock(214236, 100);

  select * into member from public.profiles where id = p_user_id for update;
  if not found then
    raise exception 'Founding profile unavailable';
  end if;
  if member.is_founding_member then
    if member.founding_member_continuous and member.founding_member_number is not null then
      return member.founding_member_number;
    end if;
    raise exception 'Founding rate cannot be reclaimed';
  end if;

  select count(*) into claimed_count from public.profiles where is_founding_member = true;
  if claimed_count >= 100 then
    raise exception 'Founding capacity reached';
  end if;
  next_number := claimed_count + 1;

  update public.profiles
  set is_founding_member = true,
      founding_member_number = next_number,
      founding_member_locked_at = now(),
      founding_member_continuous = true,
      price_tier = 'founding_29'
  where id = p_user_id;

  return next_number;
end;
$$;

revoke execute on function public.claim_founding_member(uuid) from public, anon, authenticated;
grant execute on function public.claim_founding_member(uuid) to service_role;
