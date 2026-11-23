begin;
create or replace function public.workspace_commit_import(p_id uuid,p_actor uuid,p_revision integer,p_digest text,p_max_units integer)
returns jsonb language plpgsql security definer set search_path=public,pg_temp as $$
declare d public.workspace_import_drafts; p jsonb; u uuid; b uuid; l public.leases; entry jsonb; addr text; building_addr text;
begin
 -- Serialize all commits for this landlord (including unit-cap and duplicate checks).
 perform pg_advisory_xact_lock(hashtextextended(p_actor::text,3));
 select * into d from public.workspace_import_drafts where id=p_id for update;
 if d.id is null or d.user_id<>p_actor or d.revision<>p_revision or d.approved_digest is distinct from p_digest or p_digest is null then raise exception 'Approval changed'; end if;
 if d.state='committed' then select * into l from public.leases where id=d.lease_id; return to_jsonb(l); end if;
 p=d.approved_plan;
 if p is null then raise exception 'Review required'; end if;
 u=nullif(p->>'property_id','')::uuid;
 addr=p->>'address';
 if u is not null then
  if not exists(select 1 from public.properties where id=u and user_id=p_actor) then raise exception 'Property not found'; end if;
  select address into addr from public.properties where id=u;
  update public.properties set timezone=p->>'timezone' where id=u;
 else
  if (select count(*) from public.properties where user_id=p_actor and is_unit=true)>=p_max_units then raise exception 'Unit limit reached'; end if;
  if exists(select 1 from public.properties where user_id=p_actor and lower(trim(address))=lower(trim(addr))) then raise exception 'Property already exists; select it'; end if;
  building_addr=coalesce(nullif(p->>'building_address',''),addr);
  select id into b from public.buildings where user_id=p_actor and lower(trim(address))=lower(trim(building_addr)) order by id limit 1 for update;
  if b is null then
   b=gen_random_uuid();
   insert into public.buildings(id,user_id,address,name,type,num_units) values(b,p_actor,building_addr,split_part(building_addr,',',1),'Single Family',0);
  end if;
  if exists(select 1 from public.properties where user_id=p_actor and building_id=b and lower(trim(coalesce(unit_number,'')))=lower(trim(coalesce(p->>'unit_number','')))) then raise exception 'Unit already exists; select it'; end if;
  u=gen_random_uuid();
  insert into public.properties(id,user_id,building_id,address,unit_number,is_unit,current_rent,timezone) values(u,p_actor,b,addr,nullif(p->>'unit_number',''),true,(p->>'rent_cents')::numeric/100,p->>'timezone');
  update public.buildings set num_units=greatest(coalesce(num_units,0),(select count(*)::integer from public.properties where building_id=b and is_unit=true)) where id=b;
 end if;
 if exists(select 1 from public.leases where user_id=p_actor and property_id=u and coalesce(archived,false)=false and coalesce(status,'active') not in ('ended','terminated','inactive','archived')) then raise exception 'Existing tenancy needs review'; end if;
 insert into public.leases(id,user_id,property_id,property,tenant_name,email,phone,rent,deposit,start_date,end_date,status,lifecycle_state,payment_day)
 values(gen_random_uuid(),p_actor,u,addr,p->>'tenant_name',p->>'email',p->>'phone',(p->>'rent_cents')::numeric/100,(p->>'deposit_cents')::numeric/100,(p->>'start_date')::date,(p->>'end_date')::date,'active',p->>'lifecycle_state',case when jsonb_array_length(p->'schedule')>0 then extract(day from ((p->'schedule'->0->>'due_date')::date))::integer else null end) returning * into l;
 for entry in select * from jsonb_array_elements(p->'schedule') loop
  insert into public.payments(id,user_id,lease_id,property_id,property,tenant_name,amount,due_date,status,type)
  values(gen_random_uuid(),p_actor,l.id,u,addr,l.tenant_name,(entry->>'amount_cents')::numeric/100,(entry->>'due_date')::date,'pending','rent');
 end loop;
 update public.workspace_import_drafts set state='committed',lease_id=l.id,updated_at=now() where id=p_id;
 return to_jsonb(l);
end $$;

create function public.workspace_save_import_batch(p_actor uuid,p_items jsonb)
returns jsonb language plpgsql security definer set search_path=public,pg_temp as $$
declare item jsonb; results jsonb='[]'::jsonb; d jsonb;
begin
 if jsonb_typeof(p_items)<>'array' or jsonb_array_length(p_items) not between 1 and 10 then raise exception 'Invalid batch'; end if;
 perform pg_advisory_xact_lock(hashtextextended(p_actor::text,3));
 for item in select value from jsonb_array_elements(p_items) order by value->>'id' loop
  d=public.workspace_save_import((item->>'id')::uuid,p_actor,(item->>'revision')::integer,item->'payload',nullif(item->'plan','null'::jsonb),item->>'digest');
  results=results || jsonb_build_array(d);
 end loop;
 return results;
end $$;
create function public.workspace_commit_import_batch(p_actor uuid,p_items jsonb,p_max_units integer)
returns jsonb language plpgsql security definer set search_path=public,pg_temp as $$
declare item jsonb; results jsonb='[]'::jsonb; l jsonb; existing_buildings uuid[];
begin
 if jsonb_typeof(p_items)<>'array' or jsonb_array_length(p_items) not between 1 and 10 then raise exception 'Invalid batch'; end if;
 if (select count(distinct value->>'id') from jsonb_array_elements(p_items))<>jsonb_array_length(p_items) then raise exception 'Duplicate draft'; end if;
 perform pg_advisory_xact_lock(hashtextextended(p_actor::text,3));
 select coalesce(array_agg(id),array[]::uuid[]) into existing_buildings from public.buildings where user_id=p_actor;
 for item in select value from jsonb_array_elements(p_items) order by value->>'id' loop
  l=public.workspace_commit_import((item->>'id')::uuid,p_actor,(item->>'revision')::integer,item->>'digest',p_max_units);
  results=results || jsonb_build_array(l);
 end loop;
 update public.buildings set type=case num_units when 1 then 'Single Family' when 2 then 'Duplex' when 3 then 'Triplex' when 4 then 'Fourplex' else 'Multi-Unit (5+)' end where user_id=p_actor and not(id=any(existing_buildings));
 return results;
end $$;
revoke all on function public.workspace_save_import_batch(uuid,jsonb) from public;
revoke all on function public.workspace_commit_import_batch(uuid,jsonb,integer) from public;
grant execute on function public.workspace_save_import_batch(uuid,jsonb) to service_role;
grant execute on function public.workspace_commit_import_batch(uuid,jsonb,integer) to service_role;
commit;
