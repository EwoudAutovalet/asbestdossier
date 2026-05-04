-- ============================================================
-- IP2 Protocol: referentietabellen en uitbreiding checklist_items
-- ============================================================

-- Referentietabel: toepassingen
CREATE TABLE asbestos_applications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  code text NOT NULL UNIQUE,
  name text NOT NULL,
  category text NOT NULL,
  sort_order integer DEFAULT 0,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE asbestos_applications ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Iedereen kan toepassingen lezen" ON asbestos_applications FOR SELECT USING (true);

-- Referentietabel: bindmiddelen
CREATE TABLE asbestos_binders (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  code text NOT NULL UNIQUE,
  name text NOT NULL,
  application_codes text[] NOT NULL,
  is_hechtgebonden boolean NOT NULL DEFAULT true,
  sort_order integer DEFAULT 0,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE asbestos_binders ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Iedereen kan bindmiddelen lezen" ON asbestos_binders FOR SELECT USING (true);

-- Uitbreiding checklist_items
ALTER TABLE checklist_items ADD COLUMN IF NOT EXISTS application_id uuid REFERENCES asbestos_applications(id);
ALTER TABLE checklist_items ADD COLUMN IF NOT EXISTS binder_id uuid REFERENCES asbestos_binders(id);
ALTER TABLE checklist_items ADD COLUMN IF NOT EXISTS is_hechtgebonden boolean;
ALTER TABLE checklist_items ADD COLUMN IF NOT EXISTS quantity numeric;
ALTER TABLE checklist_items ADD COLUMN IF NOT EXISTS quantity_unit text;
ALTER TABLE checklist_items ADD COLUMN IF NOT EXISTS condition_score text;
ALTER TABLE checklist_items ADD COLUMN IF NOT EXISTS coverage text;
ALTER TABLE checklist_items ADD COLUMN IF NOT EXISTS exposure text;
ALTER TABLE checklist_items ADD COLUMN IF NOT EXISTS accessibility text;
ALTER TABLE checklist_items ADD COLUMN IF NOT EXISTS calculated_risk text;
ALTER TABLE checklist_items ADD COLUMN IF NOT EXISTS sample_reference text;
ALTER TABLE checklist_items ADD COLUMN IF NOT EXISTS sample_result text;

-- Monsterneming tabel
CREATE TABLE inspection_samples (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  checklist_id uuid NOT NULL REFERENCES inspection_checklists(id) ON DELETE CASCADE,
  checklist_item_id uuid REFERENCES checklist_items(id) ON DELETE SET NULL,
  sample_number text NOT NULL,
  material_description text,
  location_description text,
  analysis_method text,
  result text,
  lab_name text,
  lab_report_ref text,
  analyzed_at timestamptz,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE inspection_samples ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Specialist kan eigen monsters beheren" ON inspection_samples
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM inspection_checklists ic
      WHERE ic.id = inspection_samples.checklist_id
      AND ic.specialist_id = auth.uid()
    )
  );

CREATE POLICY "Owner kan monsters van eigen pand lezen" ON inspection_samples
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM inspection_checklists ic
      JOIN jobs j ON j.id = ic.job_id
      JOIN properties p ON p.id = j.property_id
      WHERE ic.id = inspection_samples.checklist_id
      AND p.owner_id = auth.uid()
    )
  );
