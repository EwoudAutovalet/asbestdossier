-- ============================================================
-- Basisregisters Vlaanderen: extra velden op properties
-- ============================================================

ALTER TABLE properties ADD COLUMN IF NOT EXISTS gebouweenheid_id TEXT;
ALTER TABLE properties ADD COLUMN IF NOT EXISTS gebouw_id TEXT;
ALTER TABLE properties ADD COLUMN IF NOT EXISTS perceel_id TEXT;
ALTER TABLE properties ADD COLUMN IF NOT EXISTS bouwjaar INTEGER;
ALTER TABLE properties ADD COLUMN IF NOT EXISTS gebouw_status TEXT;
ALTER TABLE properties ADD COLUMN IF NOT EXISTS oppervlakte NUMERIC;
ALTER TABLE properties ADD COLUMN IF NOT EXISTS verdiepingen INTEGER;
ALTER TABLE properties ADD COLUMN IF NOT EXISTS kadaster_referentie TEXT;
ALTER TABLE properties ADD COLUMN IF NOT EXISTS basisregisters_synced_at TIMESTAMPTZ;
