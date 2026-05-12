-- Add data_quality column to rank_snapshots for thin-data awareness
-- 'reliable' = impressions >= 5, 'thin' = 1-4, 'none' = 0

alter table rank_snapshots
  add column if not exists data_quality text
  generated always as (
    case
      when impressions >= 5 then 'reliable'
      when impressions >= 1 then 'thin'
      else 'none'
    end
  ) stored;
