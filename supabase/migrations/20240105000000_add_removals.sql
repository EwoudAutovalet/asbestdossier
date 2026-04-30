-- Removals: tracks individual asbestos component removals with photo evidence
CREATE TABLE removals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  job_id UUID NOT NULL REFERENCES jobs(id) ON DELETE CASCADE,
  specialist_id UUID NOT NULL REFERENCES profiles(id),
  component_name TEXT NOT NULL,
  location TEXT NOT NULL,
  description TEXT,
  photo_url TEXT,
  photo_file_name TEXT,
  removed_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE removals ENABLE ROW LEVEL SECURITY;

CREATE INDEX idx_removals_job ON removals(job_id);
CREATE INDEX idx_removals_specialist ON removals(specialist_id);

-- RLS: specialists see their own removals
CREATE POLICY "specialists_view_removals" ON removals
  FOR SELECT USING (specialist_id = auth.uid());

CREATE POLICY "specialists_insert_removals" ON removals
  FOR INSERT WITH CHECK (
    specialist_id = auth.uid()
    AND EXISTS (
      SELECT 1 FROM jobs WHERE id = job_id AND specialist_id = auth.uid()
    )
  );

CREATE POLICY "specialists_update_removals" ON removals
  FOR UPDATE USING (specialist_id = auth.uid());

CREATE POLICY "specialists_delete_removals" ON removals
  FOR DELETE USING (specialist_id = auth.uid());

-- RLS: owners see removals on their properties
CREATE POLICY "owners_view_removals" ON removals
  FOR SELECT USING (
    public.user_can_access_job(job_id)
  );
