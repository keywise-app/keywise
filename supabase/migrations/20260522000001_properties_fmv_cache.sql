-- FMV cache: store full AI result per unit + staleness detection
ALTER TABLE properties
  ADD COLUMN IF NOT EXISTS fmv_cache jsonb,
  ADD COLUMN IF NOT EXISTS fmv_calculated_at timestamptz,
  ADD COLUMN IF NOT EXISTS updated_at timestamptz DEFAULT now();

-- Auto-update updated_at only when property attributes change (not FMV columns)
CREATE OR REPLACE FUNCTION update_properties_updated_at()
RETURNS trigger AS $$
BEGIN
  IF NEW.address IS DISTINCT FROM OLD.address
     OR NEW.beds IS DISTINCT FROM OLD.beds
     OR NEW.baths IS DISTINCT FROM OLD.baths
     OR NEW.sqft IS DISTINCT FROM OLD.sqft
     OR NEW.differentiators IS DISTINCT FROM OLD.differentiators
     OR NEW.current_rent IS DISTINCT FROM OLD.current_rent
  THEN
    NEW.updated_at = now();
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS properties_updated_at ON properties;
CREATE TRIGGER properties_updated_at
  BEFORE UPDATE ON properties
  FOR EACH ROW EXECUTE FUNCTION update_properties_updated_at();
