-- Berichtenmodule: berichten per opdracht

CREATE TABLE messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  job_id UUID NOT NULL REFERENCES jobs(id) ON DELETE CASCADE,
  sender_id UUID NOT NULL REFERENCES profiles(id),
  body TEXT NOT NULL,
  read_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_messages_job ON messages(job_id);
CREATE INDEX idx_messages_sender ON messages(sender_id);
CREATE INDEX idx_messages_created ON messages(job_id, created_at);

ALTER TABLE messages ENABLE ROW LEVEL SECURITY;

-- Specialist: berichten op eigen opdrachten
CREATE POLICY "Specialists can view messages on their jobs"
  ON messages FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM jobs j WHERE j.id = messages.job_id AND j.specialist_id = auth.uid()
    )
    OR sender_id = auth.uid()
  );

CREATE POLICY "Specialists can send messages on their jobs"
  ON messages FOR INSERT
  WITH CHECK (
    sender_id = auth.uid()
    AND EXISTS (
      SELECT 1 FROM jobs j WHERE j.id = messages.job_id AND j.specialist_id = auth.uid()
    )
  );

-- Owner: berichten op eigen panden
CREATE POLICY "Owners can view messages on their properties"
  ON messages FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM jobs j
      JOIN properties p ON p.id = j.property_id
      WHERE j.id = messages.job_id
      AND p.owner_id = auth.uid()
    )
  );

CREATE POLICY "Owners can send messages on their properties"
  ON messages FOR INSERT
  WITH CHECK (
    sender_id = auth.uid()
    AND EXISTS (
      SELECT 1 FROM jobs j
      JOIN properties p ON p.id = j.property_id
      WHERE j.id = messages.job_id
      AND p.owner_id = auth.uid()
    )
  );

-- Mark as read
CREATE POLICY "Recipients can mark messages as read"
  ON messages FOR UPDATE
  USING (
    sender_id != auth.uid()
    AND (
      EXISTS (
        SELECT 1 FROM jobs j WHERE j.id = messages.job_id AND j.specialist_id = auth.uid()
      )
      OR EXISTS (
        SELECT 1 FROM jobs j
        JOIN properties p ON p.id = j.property_id
        WHERE j.id = messages.job_id AND p.owner_id = auth.uid()
      )
    )
  );
