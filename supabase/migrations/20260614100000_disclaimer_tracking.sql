-- Track when users acknowledge legal disclaimers before generating outputs

alter table eviction_notices
  add column if not exists disclaimer_acknowledged_at timestamptz,
  add column if not exists disclaimer_version integer;

alter table compliance_calculations
  add column if not exists disclaimer_acknowledged_at timestamptz,
  add column if not exists disclaimer_version integer;
