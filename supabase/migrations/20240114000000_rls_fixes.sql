-- ============================================================
-- RLS Fixes: ontbrekende policies
-- ============================================================

-- 1. Owners moeten jobs kunnen updaten op hun eigen properties
CREATE POLICY "owners_update_jobs" ON jobs
  FOR UPDATE USING (public.user_owns_property(property_id));

-- 2. Brokers moeten jobs updaten op gekoppelde properties
CREATE POLICY "brokers_update_jobs" ON jobs
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM properties p
      JOIN broker_owners bo ON bo.owner_id = p.owner_id
      WHERE p.id = jobs.property_id
      AND bo.broker_id = auth.uid()
      AND bo.status = 'active'
    )
  );

-- 3. Brokers moeten properties updaten van gekoppelde eigenaars
CREATE POLICY "brokers_update_properties" ON properties
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM broker_owners bo
      WHERE bo.broker_id = auth.uid()
      AND bo.owner_id = properties.owner_id
      AND bo.status = 'active'
    )
  );

-- 4. Notification INSERT beperken: alleen eigen user_id of via service role
-- We houden WITH CHECK (true) want notificaties worden door de app aangemaakt
-- namens het systeem. Maar we voegen een rate-limit toe via een trigger.
CREATE OR REPLACE FUNCTION check_notification_rate_limit()
RETURNS TRIGGER AS $$
DECLARE
  recent_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO recent_count
  FROM notifications
  WHERE user_id = NEW.user_id
  AND created_at > now() - interval '1 minute';

  IF recent_count >= 20 THEN
    RAISE EXCEPTION 'Rate limit exceeded for notifications';
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER notifications_rate_limit
  BEFORE INSERT ON notifications
  FOR EACH ROW EXECUTE FUNCTION check_notification_rate_limit();

-- 5. Voeg soft-delete toe aan juridisch bindende tabellen
ALTER TABLE inventory_certificates ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ;
ALTER TABLE timeline_events ADD COLUMN IF NOT EXISTS is_immutable BOOLEAN NOT NULL DEFAULT true;

-- 6. Ontbrekende index voor broker queries
CREATE INDEX IF NOT EXISTS idx_broker_owners_active
  ON broker_owners(broker_id) WHERE status = 'active';

-- 7. Owners mogen attachments updaten (beschrijving wijzigen)
CREATE POLICY "owners_update_attachments" ON attachments
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM jobs j
      WHERE j.id = attachments.job_id
      AND public.user_owns_property(j.property_id)
    )
  );

-- 8. Brokers: view quotes, messages, checklists, removals, attachments
CREATE POLICY "brokers_view_quotes" ON quotes
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM jobs j
      JOIN properties p ON p.id = j.property_id
      JOIN broker_owners bo ON bo.owner_id = p.owner_id
      WHERE j.id = quotes.job_id
      AND bo.broker_id = auth.uid()
      AND bo.status = 'active'
    )
  );

CREATE POLICY "brokers_view_messages" ON messages
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM jobs j
      JOIN properties p ON p.id = j.property_id
      JOIN broker_owners bo ON bo.owner_id = p.owner_id
      WHERE j.id = messages.job_id
      AND bo.broker_id = auth.uid()
      AND bo.status = 'active'
    )
  );

CREATE POLICY "brokers_view_checklists" ON inspection_checklists
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM jobs j
      JOIN properties p ON p.id = j.property_id
      JOIN broker_owners bo ON bo.owner_id = p.owner_id
      WHERE j.id = inspection_checklists.job_id
      AND bo.broker_id = auth.uid()
      AND bo.status = 'active'
    )
  );

CREATE POLICY "brokers_view_checklist_items" ON checklist_items
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM inspection_checklists ic
      JOIN jobs j ON j.id = ic.job_id
      JOIN properties p ON p.id = j.property_id
      JOIN broker_owners bo ON bo.owner_id = p.owner_id
      WHERE ic.id = checklist_items.checklist_id
      AND bo.broker_id = auth.uid()
      AND bo.status = 'active'
    )
  );

CREATE POLICY "brokers_view_removals" ON removals
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM jobs j
      JOIN properties p ON p.id = j.property_id
      JOIN broker_owners bo ON bo.owner_id = p.owner_id
      WHERE j.id = removals.job_id
      AND bo.broker_id = auth.uid()
      AND bo.status = 'active'
    )
  );

CREATE POLICY "brokers_view_attachments" ON attachments
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM jobs j
      JOIN properties p ON p.id = j.property_id
      JOIN broker_owners bo ON bo.owner_id = p.owner_id
      WHERE j.id = attachments.job_id
      AND bo.broker_id = auth.uid()
      AND bo.status = 'active'
    )
  );

CREATE POLICY "brokers_view_certificate_items" ON certificate_items
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM inventory_certificates ic
      JOIN properties p ON p.id = ic.property_id
      JOIN broker_owners bo ON bo.owner_id = p.owner_id
      WHERE ic.id = certificate_items.certificate_id
      AND bo.broker_id = auth.uid()
      AND bo.status = 'active'
    )
  );
