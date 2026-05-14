-- Auto-create a profiles row when a new auth.users row is inserted.
-- This prevents orphaned auth users without profiles.

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.profiles (id, email, full_name, phone, role)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data ->> 'full_name', ''),
    coalesce(new.raw_user_meta_data ->> 'phone', ''),
    'landlord'
  )
  on conflict (id) do nothing;

  return new;
exception
  when others then
    raise notice 'handle_new_user failed for %: %', new.id, sqlerrm;
    return new;
end;
$$;

-- Fire after every new auth signup
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();
