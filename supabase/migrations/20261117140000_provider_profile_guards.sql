begin;
-- Browser profile edits must not change financial identity or paid entitlements.
create function public.workspace_guard_provider_profile() returns trigger language plpgsql as $$
declare field text; n jsonb=to_jsonb(new); o jsonb;
begin
 if current_user not in ('authenticated','anon') then return new;end if;
 if TG_OP='INSERT' then
  if coalesce(n->>'subscription_status','free')<>'free' or coalesce(n->>'stripe_customer_id','')<>'' or coalesce(n->>'stripe_account_id','')<>'' or coalesce(n->>'stripe_payment_method_id','')<>'' or coalesce((n->>'autopay_enabled')::boolean,false) then raise exception 'Payment setup and entitlements require server verification';end if;
 else
  o=to_jsonb(old);
  foreach field in array array['stripe_customer_id','stripe_account_id','stripe_payment_method_id','subscription_status','trial_ends_at','price_tier','is_founding_member','founding_member_number','founding_member_locked_at','founding_member_continuous'] loop
   if n->field is distinct from o->field then raise exception 'Payment setup and entitlements require server verification';end if;
  end loop;
  if coalesce((n->>'autopay_enabled')::boolean,false) and n->'autopay_enabled' is distinct from o->'autopay_enabled' then raise exception 'Auto-pay requires verified payment setup';end if;
 end if;
 return new;
end $$;
create trigger workspace_provider_profile_guard before insert or update on public.profiles for each row execute function public.workspace_guard_provider_profile();
commit;
