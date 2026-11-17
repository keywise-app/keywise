begin;
create function public.workspace_guard_payment_history() returns trigger language plpgsql as $$
begin
 if TG_OP='DELETE' then
  if old.status='paid' or coalesce(old.received_cents,0)>0 or exists(select 1 from public.workspace_payment_attempts where payment_id=old.id) then raise exception 'Payment history must be reversed or voided, not deleted';end if;
  return old;
 end if;
 if current_setting('keywise.financial_write',true)='approved' then return new;end if;
 if TG_OP='INSERT' then
  if new.status='paid' or coalesce(new.received_cents,0)>0 then raise exception 'Record a confirmed receipt through the rent ledger';end if;
 else
  if (new.received_cents is distinct from old.received_cents) or (new.status is distinct from old.status and (new.status='paid' or old.status='paid')) then raise exception 'Record or reverse a confirmed receipt through the rent ledger';end if;
  if new.amount is distinct from old.amount and (coalesce(old.received_cents,0)>0 or exists(select 1 from public.workspace_payment_attempts where payment_id=old.id)) then raise exception 'Reconcile payment activity before changing the charge';end if;
 end if;
 return new;
end $$;
create trigger workspace_payment_history_guard before insert or update or delete on public.payments for each row execute function public.workspace_guard_payment_history();
commit;
