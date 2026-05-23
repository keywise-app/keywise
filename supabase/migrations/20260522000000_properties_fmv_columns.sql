-- Add FMV columns to properties table so market analysis can be stored per-unit
-- (not just per-lease). This allows FMV for vacant/unleased units.
ALTER TABLE properties
  ADD COLUMN IF NOT EXISTS estimated_market_rent numeric,
  ADD COLUMN IF NOT EXISTS market_value_updated_at timestamptz;
