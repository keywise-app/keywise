-- This table is exclusively for the Daily Intelligence digest.
create table public.daily_intelligence_deliveries (
  report_day date not null,
  recipient text not null,
  report_id uuid unique references public.intelligence_reports(id),
  payload jsonb,
  provider_id text,
  first_attempt_at timestamptz,
  lease_token uuid,
  lease_until timestamptz,
  primary key (report_day, recipient),
  check ((payload is null) = (report_id is null)),
  check (provider_id is null or first_attempt_at is not null)
);
alter table public.daily_intelligence_deliveries enable row level security;
revoke all on public.daily_intelligence_deliveries from public, anon, authenticated;
grant select, insert, update on public.daily_intelligence_deliveries to service_role;

-- INSERT ON CONFLICT serializes first callers. FOR UPDATE serializes takeovers
-- and every subsequent state transition, including fencing a recovered lease.
create function public.daily_intelligence_step(
  p_day date, p_recipient text, p_token uuid, p_step text, p_args jsonb default '{}'
) returns jsonb language plpgsql security invoker set search_path = pg_catalog, public as $$
declare
  d public.daily_intelligence_deliveries%rowtype;
  r jsonb;
  q jsonb;
  priorities text[] := array['low','medium','high','critical'];
  first_try boolean;
begin
  if p_step = 'claim' and not coalesce((p_args->>'existing_only')::boolean, false) then
    insert into public.daily_intelligence_deliveries (report_day, recipient)
      values (p_day, p_recipient) on conflict do nothing;
  end if;
  select * into strict d from public.daily_intelligence_deliveries
    where report_day = p_day and recipient = p_recipient for update;

  if p_step = 'claim' then
    if d.provider_id is not null then
      return jsonb_build_object('state','accepted','report_id',d.report_id,'provider_id',d.provider_id);
    end if;
    if d.lease_until > clock_timestamp() then
      return jsonb_build_object('state','busy','report_id',d.report_id);
    end if;
    if d.first_attempt_at <= clock_timestamp() - interval '23 hours' then
      return jsonb_build_object('state','reconcile','report_id',d.report_id);
    end if;
    update public.daily_intelligence_deliveries
      set lease_token = p_token, lease_until = clock_timestamp() + interval '3 minutes'
      where report_day = p_day and recipient = p_recipient;
    return jsonb_build_object('state','claimed','payload',d.payload,'report_id',d.report_id);
  end if;

  if d.lease_token is distinct from p_token or p_token is null
     or d.lease_until <= clock_timestamp() or d.provider_id is not null then
    raise exception 'intelligence_lease_lost';
  end if;

  case p_step
  when 'prepare' then
    if d.report_id is not null then raise exception 'intelligence_already_prepared'; end if;
    r := p_args->'report';
    if coalesce(trim(r->>'summary'),'') = '' or p_args->'payload'->>'to' is distinct from p_recipient then
      raise exception 'invalid_intelligence_payload';
    end if;
    insert into public.intelligence_reports
      (date, summary, urgent, opportunities, trends, competitor_updates, status)
      values (p_day, r->>'summary', r->'urgent', r->'opportunities', r->'trends', r->'competitor_updates', 'new')
      returning id into d.report_id;
    -- The immutable report and all its proposals commit once together. Preserve
    -- the shared active title/category hash and priority-upgrade policy.
    for q in select value from jsonb_array_elements(p_args->'proposals') loop
      insert into public.build_queue as b
        (title, description, source_agent, category, priority, status, dedupe_hash, rationale)
        values (q->>'title', q->>'description', 'competitive_intel', q->>'category',
                q->>'priority', 'proposed', q->>'dedupe_hash', q->>'rationale')
        on conflict (dedupe_hash) where status not in ('rejected','shipped')
        do update set priority = excluded.priority, description = excluded.description
          where array_position(priorities, excluded.priority) > array_position(priorities, b.priority);
    end loop;
    update public.daily_intelligence_deliveries set report_id = d.report_id, payload = p_args->'payload'
      where report_day = p_day and recipient = p_recipient returning payload into d.payload;
    return jsonb_build_object('report_id',d.report_id,'payload',d.payload);
  when 'attempt' then
    if d.payload is null or d.first_attempt_at <= clock_timestamp() - interval '23 hours' then
      raise exception 'intelligence_send_requires_review';
    end if;
    first_try := d.first_attempt_at is null;
    update public.daily_intelligence_deliveries set first_attempt_at = coalesce(first_attempt_at, clock_timestamp())
      where report_day = p_day and recipient = p_recipient;
    return jsonb_build_object('fresh',first_try);
  when 'accepted' then
    if nullif(p_args->>'provider_id','') is null then raise exception 'missing_provider_id'; end if;
    update public.daily_intelligence_deliveries set provider_id = p_args->>'provider_id', lease_until = null, lease_token = null
      where report_day = p_day and recipient = p_recipient;
  when 'rejected' then
    -- Used only for a definite rejection on the first, previously unambiguous request.
    update public.daily_intelligence_deliveries set first_attempt_at = null
      where report_day = p_day and recipient = p_recipient;
  when 'release' then
    update public.daily_intelligence_deliveries set lease_until = null, lease_token = null
      where report_day = p_day and recipient = p_recipient;
  else raise exception 'unknown_intelligence_step';
  end case;
  return '{}'::jsonb;
end;
$$;
revoke all on function public.daily_intelligence_step(date,text,uuid,text,jsonb) from public, anon, authenticated;
grant execute on function public.daily_intelligence_step(date,text,uuid,text,jsonb) to service_role;
