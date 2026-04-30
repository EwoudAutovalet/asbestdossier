-- Inspection checklists

CREATE TABLE inspection_checklists (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  job_id UUID NOT NULL REFERENCES jobs(id) ON DELETE CASCADE,
  specialist_id UUID NOT NULL REFERENCES profiles(id),
  inspected_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  general_condition TEXT,
  risk_level TEXT CHECK (risk_level IN ('laag', 'gemiddeld', 'hoog', 'kritiek')),
  notes TEXT,
  completed BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE checklist_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  checklist_id UUID NOT NULL REFERENCES inspection_checklists(id) ON DELETE CASCADE,
  category TEXT NOT NULL,
  item_name TEXT NOT NULL,
  contains_asbestos BOOLEAN,
  condition TEXT CHECK (condition IN ('goed', 'beschadigd', 'ernstig_beschadigd', 'verwijderd')),
  material_type TEXT,
  location_description TEXT,
  photo_url TEXT,
  priority TEXT CHECK (priority IN ('geen_actie', 'monitoring', 'planning', 'urgent')),
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE inspection_checklists ENABLE ROW LEVEL SECURITY;
ALTER TABLE checklist_items ENABLE ROW LEVEL SECURITY;

-- Specialists can manage their own checklists
CREATE POLICY "Specialists can view their checklists"
  ON inspection_checklists FOR SELECT
  USING (specialist_id = auth.uid());

CREATE POLICY "Specialists can insert their checklists"
  ON inspection_checklists FOR INSERT
  WITH CHECK (specialist_id = auth.uid());

CREATE POLICY "Specialists can update their checklists"
  ON inspection_checklists FOR UPDATE
  USING (specialist_id = auth.uid());

-- Owners can view checklists on their properties
CREATE POLICY "Owners can view checklists on their properties"
  ON inspection_checklists FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM jobs j
      JOIN properties p ON p.id = j.property_id
      WHERE j.id = inspection_checklists.job_id
      AND p.owner_id = auth.uid()
    )
  );

-- Checklist items: inherit access via checklist
CREATE POLICY "Users can view checklist items"
  ON checklist_items FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM inspection_checklists ic
      WHERE ic.id = checklist_items.checklist_id
      AND (
        ic.specialist_id = auth.uid()
        OR EXISTS (
          SELECT 1 FROM jobs j
          JOIN properties p ON p.id = j.property_id
          WHERE j.id = ic.job_id
          AND p.owner_id = auth.uid()
        )
      )
    )
  );

CREATE POLICY "Specialists can insert checklist items"
  ON checklist_items FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM inspection_checklists ic
      WHERE ic.id = checklist_items.checklist_id
      AND ic.specialist_id = auth.uid()
    )
  );

CREATE POLICY "Specialists can update checklist items"
  ON checklist_items FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM inspection_checklists ic
      WHERE ic.id = checklist_items.checklist_id
      AND ic.specialist_id = auth.uid()
    )
  );

CREATE POLICY "Specialists can delete checklist items"
  ON checklist_items FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM inspection_checklists ic
      WHERE ic.id = checklist_items.checklist_id
      AND ic.specialist_id = auth.uid()
    )
  );

-- Indexes
CREATE INDEX idx_checklists_job ON inspection_checklists(job_id);
CREATE INDEX idx_checklists_specialist ON inspection_checklists(specialist_id);
CREATE INDEX idx_checklist_items_checklist ON checklist_items(checklist_id);

-- Updated_at trigger
CREATE TRIGGER checklists_updated_at
  BEFORE UPDATE ON inspection_checklists
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();
