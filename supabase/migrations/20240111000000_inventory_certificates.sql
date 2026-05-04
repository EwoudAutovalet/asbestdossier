-- Feature 1: Asbestinventarisatie-attest (AIA)

-- Sequence voor attestnummers
CREATE SEQUENCE certificate_number_seq START WITH 1;

CREATE TABLE inventory_certificates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  property_id UUID NOT NULL REFERENCES properties(id) ON DELETE CASCADE,
  job_id UUID REFERENCES jobs(id) ON DELETE SET NULL,
  specialist_id UUID NOT NULL REFERENCES profiles(id),
  certificate_number TEXT NOT NULL UNIQUE DEFAULT (
    'AIA-' || EXTRACT(YEAR FROM now())::TEXT || '-' || LPAD(nextval('certificate_number_seq')::TEXT, 5, '0')
  ),
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'issued', 'expired', 'revoked')),
  issued_at TIMESTAMPTZ,
  expires_at TIMESTAMPTZ,
  risk_summary JSONB DEFAULT '{}',
  conclusion TEXT,
  pdf_url TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE certificate_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  certificate_id UUID NOT NULL REFERENCES inventory_certificates(id) ON DELETE CASCADE,
  location TEXT NOT NULL,
  material_type TEXT NOT NULL,
  asbestos_type TEXT NOT NULL CHECK (asbestos_type IN ('hechtgebonden', 'losgebonden')),
  condition TEXT NOT NULL,
  risk_level TEXT NOT NULL CHECK (risk_level IN ('laag', 'gemiddeld', 'hoog', 'kritiek')),
  recommended_action TEXT NOT NULL CHECK (recommended_action IN ('verwijderen', 'inkapselen', 'monitoring')),
  photo_url TEXT,
  notes TEXT,
  sort_order INTEGER NOT NULL DEFAULT 0
);

-- Indexes
CREATE INDEX idx_certificates_property ON inventory_certificates(property_id);
CREATE INDEX idx_certificates_specialist ON inventory_certificates(specialist_id);
CREATE INDEX idx_certificates_status ON inventory_certificates(status);
CREATE INDEX idx_certificates_expires ON inventory_certificates(expires_at);
CREATE INDEX idx_certificate_items_cert ON certificate_items(certificate_id);

-- Trigger
CREATE TRIGGER inventory_certificates_updated_at
  BEFORE UPDATE ON inventory_certificates
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- RLS
ALTER TABLE inventory_certificates ENABLE ROW LEVEL SECURITY;
ALTER TABLE certificate_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Owners can view certificates for their properties"
  ON inventory_certificates FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM properties
      WHERE properties.id = inventory_certificates.property_id
      AND properties.owner_id = auth.uid()
    )
  );

CREATE POLICY "Specialists can view their certificates"
  ON inventory_certificates FOR SELECT
  USING (specialist_id = auth.uid());

CREATE POLICY "Specialists can insert certificates"
  ON inventory_certificates FOR INSERT
  WITH CHECK (specialist_id = auth.uid());

CREATE POLICY "Specialists can update their own certificates"
  ON inventory_certificates FOR UPDATE
  USING (specialist_id = auth.uid());

CREATE POLICY "Certificate items viewable by certificate viewers"
  ON certificate_items FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM inventory_certificates ic
      WHERE ic.id = certificate_items.certificate_id
      AND (
        ic.specialist_id = auth.uid()
        OR EXISTS (
          SELECT 1 FROM properties p
          WHERE p.id = ic.property_id AND p.owner_id = auth.uid()
        )
      )
    )
  );

CREATE POLICY "Specialists can insert certificate items"
  ON certificate_items FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM inventory_certificates ic
      WHERE ic.id = certificate_items.certificate_id
      AND ic.specialist_id = auth.uid()
    )
  );

CREATE POLICY "Specialists can update certificate items"
  ON certificate_items FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM inventory_certificates ic
      WHERE ic.id = certificate_items.certificate_id
      AND ic.specialist_id = auth.uid()
    )
  );

CREATE POLICY "Specialists can delete certificate items"
  ON certificate_items FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM inventory_certificates ic
      WHERE ic.id = certificate_items.certificate_id
      AND ic.specialist_id = auth.uid()
    )
  );

-- Update notification type check
ALTER TABLE notifications DROP CONSTRAINT IF EXISTS notifications_type_check;
ALTER TABLE notifications ADD CONSTRAINT notifications_type_check CHECK (type IN (
  'quote_submitted', 'quote_approved', 'quote_rejected',
  'job_status_changed', 'message_received',
  'specialist_assigned', 'inspection_completed',
  'removal_registered', 'certificate_issued', 'certificate_expiring'
));
