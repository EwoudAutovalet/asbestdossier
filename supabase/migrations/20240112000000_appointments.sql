-- Feature 2: Planningmodule / Agenda

CREATE TABLE appointments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  job_id UUID REFERENCES jobs(id) ON DELETE SET NULL,
  property_id UUID NOT NULL REFERENCES properties(id) ON DELETE CASCADE,
  specialist_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
  owner_id UUID NOT NULL REFERENCES profiles(id),
  type TEXT NOT NULL CHECK (type IN ('inspection', 'removal', 'follow_up')),
  title TEXT NOT NULL,
  description TEXT,
  scheduled_start TIMESTAMPTZ NOT NULL,
  scheduled_end TIMESTAMPTZ NOT NULL,
  status TEXT NOT NULL DEFAULT 'scheduled' CHECK (status IN ('scheduled', 'confirmed', 'completed', 'cancelled', 'no_show')),
  location TEXT,
  notes TEXT,
  created_by UUID NOT NULL REFERENCES profiles(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE specialist_availability (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  specialist_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  day_of_week INTEGER NOT NULL CHECK (day_of_week >= 0 AND day_of_week <= 6),
  start_time TIME NOT NULL,
  end_time TIME NOT NULL,
  is_available BOOLEAN NOT NULL DEFAULT true
);

-- Indexes
CREATE INDEX idx_appointments_job ON appointments(job_id);
CREATE INDEX idx_appointments_property ON appointments(property_id);
CREATE INDEX idx_appointments_specialist ON appointments(specialist_id);
CREATE INDEX idx_appointments_owner ON appointments(owner_id);
CREATE INDEX idx_appointments_start ON appointments(scheduled_start);
CREATE INDEX idx_appointments_status ON appointments(status);
CREATE INDEX idx_availability_specialist ON specialist_availability(specialist_id);

-- Trigger
CREATE TRIGGER appointments_updated_at
  BEFORE UPDATE ON appointments
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- RLS
ALTER TABLE appointments ENABLE ROW LEVEL SECURITY;
ALTER TABLE specialist_availability ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Owners can view their appointments"
  ON appointments FOR SELECT
  USING (owner_id = auth.uid());

CREATE POLICY "Specialists can view their appointments"
  ON appointments FOR SELECT
  USING (specialist_id = auth.uid());

CREATE POLICY "Users can insert appointments"
  ON appointments FOR INSERT
  WITH CHECK (created_by = auth.uid());

CREATE POLICY "Owners can update their appointments"
  ON appointments FOR UPDATE
  USING (owner_id = auth.uid() OR created_by = auth.uid());

CREATE POLICY "Specialists can update their appointments"
  ON appointments FOR UPDATE
  USING (specialist_id = auth.uid());

CREATE POLICY "Specialists can manage their availability"
  ON specialist_availability FOR ALL
  USING (specialist_id = auth.uid());

CREATE POLICY "Anyone can view specialist availability"
  ON specialist_availability FOR SELECT
  USING (true);

-- Update notification type check to include appointment types
ALTER TABLE notifications DROP CONSTRAINT IF EXISTS notifications_type_check;
ALTER TABLE notifications ADD CONSTRAINT notifications_type_check CHECK (type IN (
  'quote_submitted', 'quote_approved', 'quote_rejected',
  'job_status_changed', 'message_received',
  'specialist_assigned', 'inspection_completed',
  'removal_registered', 'certificate_issued', 'certificate_expiring',
  'appointment_created', 'appointment_confirmed', 'appointment_cancelled'
));
