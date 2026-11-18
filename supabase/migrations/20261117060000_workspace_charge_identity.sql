begin;
create function public.workspace_create_charge(p_id uuid,p_actor uuid,p_lease uuid,p_amount bigint,p_date date,p_type text,p_description text)
returns jsonb language plpgsql security definer set search_path=public,pg_temp as $$
declare l public.leases;p public.payments;
begin
 select * into l from leases where id=p_lease and user_id=p_actor;
 if l.id is null or p_amount<=0 then raise exception 'Invalid charge'; end if;
 perform pg_advisory_xact_lock(hashtextextended(p_id::text,4));
 select * into p from payments where id=p_id;
 if p.id is not null then
  if p.user_id<>p_actor or p.lease_id<>p_lease or round(p.amount*100)<>p_amount or p.due_date<>p_date or p.type<>p_type or coalesce(p.description,'')<>p_description then raise exception 'Charge changed'; end if;
  return to_jsonb(p);
 end if;
 insert into payments(id,user_id,lease_id,property_id,property,tenant_name,amount,due_date,status,type,description)
 values(p_id,p_actor,l.id,l.property_id,l.property,l.tenant_name,p_amount::numeric/100,p_date,'pending',p_type,p_description) returning * into p;
 return to_jsonb(p);
end $$;
revoke all on function public.workspace_create_charge(uuid,uuid,uuid,bigint,date,text,text) from public;
grant execute on function public.workspace_create_charge(uuid,uuid,uuid,bigint,date,text,text) to service_role;
commit;
