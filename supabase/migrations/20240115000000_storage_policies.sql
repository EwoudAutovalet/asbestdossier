-- ============================================================
-- Storage Policies: restrictieve job-scoped toegang
-- ============================================================

-- Verwijder de te brede policies
DROP POLICY IF EXISTS "Authenticated users can upload to property-media" ON storage.objects;
DROP POLICY IF EXISTS "Users can view their property media" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can upload to official-documents" ON storage.objects;
DROP POLICY IF EXISTS "Users can view official documents" ON storage.objects;

-- ============================================================
-- property-media bucket: alleen owner, specialist, of broker
-- ============================================================

-- Upload: alleen als je owner/specialist bent van de job in het pad
CREATE POLICY "job_participants_upload_property_media"
  ON storage.objects FOR INSERT
  WITH CHECK (
    bucket_id = 'property-media' AND
    auth.role() = 'authenticated' AND
    EXISTS (
      SELECT 1 FROM jobs j
      JOIN properties p ON p.id = j.property_id
      LEFT JOIN broker_owners bo ON bo.owner_id = p.owner_id AND bo.broker_id = auth.uid() AND bo.status = 'active'
      WHERE j.id::text = (storage.foldername(name))[1]
      AND (
        p.owner_id = auth.uid()
        OR j.specialist_id = auth.uid()
        OR bo.broker_id IS NOT NULL
      )
    )
  );

-- View: zelfde check als upload
CREATE POLICY "job_participants_view_property_media"
  ON storage.objects FOR SELECT
  USING (
    bucket_id = 'property-media' AND
    auth.role() = 'authenticated' AND
    EXISTS (
      SELECT 1 FROM jobs j
      JOIN properties p ON p.id = j.property_id
      LEFT JOIN broker_owners bo ON bo.owner_id = p.owner_id AND bo.broker_id = auth.uid() AND bo.status = 'active'
      WHERE j.id::text = (storage.foldername(name))[1]
      AND (
        p.owner_id = auth.uid()
        OR j.specialist_id = auth.uid()
        OR bo.broker_id IS NOT NULL
      )
    )
  );

-- Delete: alleen specialist of owner
CREATE POLICY "job_participants_delete_property_media"
  ON storage.objects FOR DELETE
  USING (
    bucket_id = 'property-media' AND
    auth.role() = 'authenticated' AND
    EXISTS (
      SELECT 1 FROM jobs j
      JOIN properties p ON p.id = j.property_id
      WHERE j.id::text = (storage.foldername(name))[1]
      AND (p.owner_id = auth.uid() OR j.specialist_id = auth.uid())
    )
  );

-- ============================================================
-- official-documents bucket: alleen specialist kan uploaden,
-- owner/broker/specialist kunnen bekijken
-- ============================================================

CREATE POLICY "specialists_upload_official_documents"
  ON storage.objects FOR INSERT
  WITH CHECK (
    bucket_id = 'official-documents' AND
    auth.role() = 'authenticated' AND
    EXISTS (
      SELECT 1 FROM jobs j
      WHERE j.id::text = (storage.foldername(name))[1]
      AND j.specialist_id = auth.uid()
    )
  );

CREATE POLICY "participants_view_official_documents"
  ON storage.objects FOR SELECT
  USING (
    bucket_id = 'official-documents' AND
    auth.role() = 'authenticated' AND
    EXISTS (
      SELECT 1 FROM jobs j
      JOIN properties p ON p.id = j.property_id
      LEFT JOIN broker_owners bo ON bo.owner_id = p.owner_id AND bo.broker_id = auth.uid() AND bo.status = 'active'
      WHERE j.id::text = (storage.foldername(name))[1]
      AND (
        p.owner_id = auth.uid()
        OR j.specialist_id = auth.uid()
        OR bo.broker_id IS NOT NULL
      )
    )
  );
