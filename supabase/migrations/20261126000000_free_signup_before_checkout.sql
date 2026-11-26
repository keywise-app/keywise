-- Creating a free account is separate from starting a card-backed Pro trial.
-- Only verified Stripe subscription webhooks may grant trialing/active access.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.profiles (id, email, full_name, phone, role, subscription_status, trial_ends_at)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data ->> 'full_name', ''),
    coalesce(new.raw_user_meta_data ->> 'phone', ''),
    'landlord',
    'free',
    null
  )
  on conflict (id) do nothing;
  return new;
exception
  when others then
    raise notice 'handle_new_user failed for %: %', new.id, sqlerrm;
    return new;
end;
$$;
