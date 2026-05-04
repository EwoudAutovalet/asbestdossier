-- Feature 3: Rol Makelaar / Vastgoedbeheerder

-- Add broker to user_role enum
ALTER TYPE user_role ADD VALUE 'broker';

-- Broker-owners koppeltabel
CREATE TABLE broker_owners (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  broker_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  owner_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  status TEXT NOT NULL DEFAULT 'invited' CHECK (status IN ('invited', 'active', 'revoked')),
  invited_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  accepted_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(broker_id, owner_id)
);

-- Add broker_id to properties
ALTER TABLE properties ADD COLUMN broker_id UUID REFERENCES profiles(id) ON DELETE SET NULL;

-- Indexes
CREATE INDEX idx_broker_owners_broker ON broker_owners(broker_id);
CREATE INDEX idx_broker_owners_owner ON broker_owners(owner_id);
CREATE INDEX idx_broker_owners_status ON broker_owners(status);
CREATE INDEX idx_properties_broker ON properties(broker_id);

-- RLS
ALTER TABLE broker_owners ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Brokers can view their own links"
  ON broker_owners FOR SELECT
  USING (broker_id = auth.uid());

CREATE POLICY "Owners can view invitations to them"
  ON broker_owners FOR SELECT
  USING (owner_id = auth.uid());

CREATE POLICY "Brokers can insert invitations"
  ON broker_owners FOR INSERT
  WITH CHECK (broker_id = auth.uid());

CREATE POLICY "Brokers can update their links"
  ON broker_owners FOR UPDATE
  USING (broker_id = auth.uid());

CREATE POLICY "Owners can update invitations to them"
  ON broker_owners FOR UPDATE
  USING (owner_id = auth.uid());

-- Broker can view properties of linked owners
CREATE POLICY "Brokers can view properties of linked owners"
  ON properties FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM broker_owners bo
      WHERE bo.broker_id = auth.uid()
      AND bo.owner_id = properties.owner_id
      AND bo.status = 'active'
    )
  );

-- Broker can insert properties for linked owners
CREATE POLICY "Brokers can insert properties for linked owners"
  ON properties FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM broker_owners bo
      WHERE bo.broker_id = auth.uid()
      AND bo.owner_id = owner_id
      AND bo.status = 'active'
    )
  );

-- Broker can view jobs on linked owner properties
CREATE POLICY "Brokers can view jobs on linked owner properties"
  ON jobs FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM properties p
      JOIN broker_owners bo ON bo.owner_id = p.owner_id
      WHERE p.id = jobs.property_id
      AND bo.broker_id = auth.uid()
      AND bo.status = 'active'
    )
  );

-- Broker can insert jobs on linked owner properties
CREATE POLICY "Brokers can insert jobs on linked owner properties"
  ON jobs FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM properties p
      JOIN broker_owners bo ON bo.owner_id = p.owner_id
      WHERE p.id = property_id
      AND bo.broker_id = auth.uid()
      AND bo.status = 'active'
    )
  );

-- Broker can view timeline on linked owner properties
CREATE POLICY "Brokers can view timeline on linked owner properties"
  ON timeline_events FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM properties p
      JOIN broker_owners bo ON bo.owner_id = p.owner_id
      WHERE p.id = timeline_events.property_id
      AND bo.broker_id = auth.uid()
      AND bo.status = 'active'
    )
  );

-- Broker can view certificates on linked owner properties
CREATE POLICY "Brokers can view certificates on linked owner properties"
  ON inventory_certificates FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM properties p
      JOIN broker_owners bo ON bo.owner_id = p.owner_id
      WHERE p.id = inventory_certificates.property_id
      AND bo.broker_id = auth.uid()
      AND bo.status = 'active'
    )
  );

-- Broker can view appointments on linked owner properties
CREATE POLICY "Brokers can view appointments on linked owner properties"
  ON appointments FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM broker_owners bo
      WHERE bo.broker_id = auth.uid()
      AND bo.owner_id = appointments.owner_id
      AND bo.status = 'active'
    )
  );

-- Broker can insert appointments for linked owners
CREATE POLICY "Brokers can insert appointments for linked owners"
  ON appointments FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM broker_owners bo
      WHERE bo.broker_id = auth.uid()
      AND bo.owner_id = owner_id
      AND bo.status = 'active'
    )
  );

-- Update notification type check to include broker types
ALTER TABLE notifications DROP CONSTRAINT IF EXISTS notifications_type_check;
ALTER TABLE notifications ADD CONSTRAINT notifications_type_check CHECK (type IN (
  'quote_submitted', 'quote_approved', 'quote_rejected',
  'job_status_changed', 'message_received',
  'specialist_assigned', 'inspection_completed',
  'removal_registered', 'certificate_issued', 'certificate_expiring',
  'appointment_created', 'appointment_confirmed', 'appointment_cancelled',
  'broker_invitation', 'broker_accepted'
));

-- Allow broker profiles to be viewed by linked owners
CREATE POLICY "Owners can view their broker profile"
  ON profiles FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM broker_owners bo
      WHERE bo.broker_id = profiles.id
      AND bo.owner_id = auth.uid()
      AND bo.status = 'active'
    )
  );

-- Allow brokers to view linked owner profiles
CREATE POLICY "Brokers can view linked owner profiles"
  ON profiles FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM broker_owners bo
      WHERE bo.broker_id = auth.uid()
      AND bo.owner_id = profiles.id
    )
  );
