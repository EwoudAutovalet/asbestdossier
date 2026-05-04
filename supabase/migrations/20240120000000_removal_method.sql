-- GAP 1: Vlarem II handling method classification
-- eenvoudige_handeling = non-encapsulated removal (low-risk, bonded materials)
-- hermetische_zone     = full enclosure required (friable/loose-bound materials)
CREATE TYPE removal_method_type AS ENUM ('eenvoudige_handeling', 'hermetische_zone');

ALTER TABLE jobs ADD COLUMN IF NOT EXISTS handling_method removal_method_type;
ALTER TABLE removals ADD COLUMN IF NOT EXISTS handling_method removal_method_type;
