-- ============================================================
-- AsbestControl — Supabase Database Schema
-- ============================================================

-- 1. Custom ENUM types
-- ============================================================

CREATE TYPE user_role AS ENUM ('owner', 'specialist');

CREATE TYPE property_status AS ENUM ('new', 'inspection', 'remediation', 'cleared');

CREATE TYPE job_status AS ENUM ('pending', 'inspection', 'quoted', 'approved', 'in_progress', 'completed', 'cancelled');

CREATE TYPE attachment_type AS ENUM ('site_photo', 'paper_scan');

-- 2. Profiles table (extends Supabase auth.users)
-- ============================================================

CREATE TABLE profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  role user_role NOT NULL DEFAULT 'owner',
  full_name TEXT NOT NULL,
  email TEXT NOT NULL,
  phone TEXT,
  company_name TEXT,
  company_vat TEXT,
  company_address TEXT,
  avatar_url TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own profile"
  ON profiles FOR SELECT
  USING (auth.uid() = id);

CREATE POLICY "Users can update their own profile"
  ON profiles FOR UPDATE
  USING (auth.uid() = id);

CREATE POLICY "Users can insert their own profile"
  ON profiles FOR INSERT
  WITH CHECK (auth.uid() = id);

CREATE POLICY "Specialists are visible to owners"
  ON profiles FOR SELECT
  USING (role = 'specialist');

-- 3. Properties table
-- ============================================================

CREATE TABLE properties (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  address TEXT NOT NULL,
  city TEXT NOT NULL,
  postal_code TEXT NOT NULL,
  status property_status NOT NULL DEFAULT 'new',
  description TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE properties ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Owners can view their own properties"
  ON properties FOR SELECT
  USING (auth.uid() = owner_id);

CREATE POLICY "Owners can insert their own properties"
  ON properties FOR INSERT
  WITH CHECK (auth.uid() = owner_id);

CREATE POLICY "Owners can update their own properties"
  ON properties FOR UPDATE
  USING (auth.uid() = owner_id);

CREATE POLICY "Specialists can view properties they have jobs for"
  ON properties FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM jobs
      WHERE jobs.property_id = properties.id
      AND jobs.specialist_id = auth.uid()
    )
  );

-- 4. Jobs table
-- ============================================================

CREATE TABLE jobs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  property_id UUID NOT NULL REFERENCES properties(id) ON DELETE CASCADE,
  specialist_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
  status job_status NOT NULL DEFAULT 'pending',
  title TEXT NOT NULL,
  description TEXT,
  total_cost DECIMAL(10,2),
  started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE jobs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Owners can view jobs on their properties"
  ON jobs FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM properties
      WHERE properties.id = jobs.property_id
      AND properties.owner_id = auth.uid()
    )
  );

CREATE POLICY "Specialists can view their assigned jobs"
  ON jobs FOR SELECT
  USING (specialist_id = auth.uid());

CREATE POLICY "Specialists can update their assigned jobs"
  ON jobs FOR UPDATE
  USING (specialist_id = auth.uid());

CREATE POLICY "Owners can update jobs on their properties"
  ON jobs FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM properties
      WHERE properties.id = jobs.property_id
      AND properties.owner_id = auth.uid()
    )
  );

CREATE POLICY "Owners can insert jobs on their properties"
  ON jobs FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM properties
      WHERE properties.id = property_id
      AND properties.owner_id = auth.uid()
    )
  );

-- 5. Attachments table (Smart Upload)
-- ============================================================

CREATE TABLE attachments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  job_id UUID NOT NULL REFERENCES jobs(id) ON DELETE CASCADE,
  uploaded_by UUID NOT NULL REFERENCES profiles(id),
  file_url TEXT NOT NULL,
  file_name TEXT NOT NULL,
  file_size INTEGER,
  mime_type TEXT,
  type attachment_type NOT NULL,
  description TEXT,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE attachments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Owners can view attachments on their property jobs"
  ON attachments FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM jobs
      JOIN properties ON properties.id = jobs.property_id
      WHERE jobs.id = attachments.job_id
      AND properties.owner_id = auth.uid()
    )
  );

CREATE POLICY "Specialists can view attachments on their jobs"
  ON attachments FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM jobs
      WHERE jobs.id = attachments.job_id
      AND jobs.specialist_id = auth.uid()
    )
  );

CREATE POLICY "Specialists can upload attachments to their jobs"
  ON attachments FOR INSERT
  WITH CHECK (
    auth.uid() = uploaded_by
    AND EXISTS (
      SELECT 1 FROM jobs
      WHERE jobs.id = job_id
      AND jobs.specialist_id = auth.uid()
    )
  );

CREATE POLICY "Uploaders can delete their own attachments"
  ON attachments FOR DELETE
  USING (uploaded_by = auth.uid());

-- 6. Timeline events table
-- ============================================================

CREATE TABLE timeline_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  property_id UUID NOT NULL REFERENCES properties(id) ON DELETE CASCADE,
  job_id UUID REFERENCES jobs(id) ON DELETE SET NULL,
  actor_id UUID NOT NULL REFERENCES profiles(id),
  action TEXT NOT NULL,
  details JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE timeline_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Owners can view timeline for their properties"
  ON timeline_events FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM properties
      WHERE properties.id = timeline_events.property_id
      AND properties.owner_id = auth.uid()
    )
  );

CREATE POLICY "Specialists can view timeline for properties they work on"
  ON timeline_events FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM jobs
      WHERE jobs.property_id = timeline_events.property_id
      AND jobs.specialist_id = auth.uid()
    )
  );

CREATE POLICY "Authenticated users can insert timeline events"
  ON timeline_events FOR INSERT
  WITH CHECK (auth.uid() = actor_id);

-- 6b. Removals table
-- ============================================================

CREATE TABLE removals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  job_id UUID NOT NULL REFERENCES jobs(id) ON DELETE CASCADE,
  specialist_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  component_name TEXT NOT NULL,
  location TEXT NOT NULL,
  description TEXT,
  photo_url TEXT,
  photo_file_name TEXT,
  removed_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE removals ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Owners can view removals on their property jobs"
  ON removals FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM jobs
      JOIN properties ON properties.id = jobs.property_id
      WHERE jobs.id = removals.job_id
      AND properties.owner_id = auth.uid()
    )
  );

CREATE POLICY "Specialists can view removals on their jobs"
  ON removals FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM jobs
      WHERE jobs.id = removals.job_id
      AND jobs.specialist_id = auth.uid()
    )
  );

CREATE POLICY "Specialists can insert removals on their jobs"
  ON removals FOR INSERT
  WITH CHECK (
    specialist_id = auth.uid()
    AND EXISTS (
      SELECT 1 FROM jobs
      WHERE jobs.id = job_id
      AND jobs.specialist_id = auth.uid()
    )
  );

CREATE POLICY "Specialists can delete their own removals"
  ON removals FOR DELETE
  USING (specialist_id = auth.uid());

CREATE INDEX idx_removals_job ON removals(job_id);

-- 7. Indexes for performance
-- ============================================================

CREATE INDEX idx_properties_owner ON properties(owner_id);
CREATE INDEX idx_jobs_property ON jobs(property_id);
CREATE INDEX idx_jobs_specialist ON jobs(specialist_id);
CREATE INDEX idx_jobs_status ON jobs(status);
CREATE INDEX idx_attachments_job ON attachments(job_id);
CREATE INDEX idx_attachments_type ON attachments(type);
CREATE INDEX idx_timeline_property ON timeline_events(property_id);
CREATE INDEX idx_timeline_created ON timeline_events(created_at DESC);

-- 8. Auto-update updated_at trigger
-- ============================================================

CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER profiles_updated_at
  BEFORE UPDATE ON profiles
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER properties_updated_at
  BEFORE UPDATE ON properties
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER jobs_updated_at
  BEFORE UPDATE ON jobs
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- 9. Auto-create profile on signup
-- ============================================================

CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO profiles (id, email, full_name, role)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', ''),
    COALESCE((NEW.raw_user_meta_data->>'role')::user_role, 'owner')
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();

-- 10. Storage buckets
-- ============================================================

INSERT INTO storage.buckets (id, name, public) VALUES ('property-media', 'property-media', false);
INSERT INTO storage.buckets (id, name, public) VALUES ('official-documents', 'official-documents', false);

CREATE POLICY "Authenticated users can upload to property-media"
  ON storage.objects FOR INSERT
  WITH CHECK (
    bucket_id = 'property-media'
    AND auth.role() = 'authenticated'
  );

CREATE POLICY "Users can view their property media"
  ON storage.objects FOR SELECT
  USING (
    bucket_id = 'property-media'
    AND auth.role() = 'authenticated'
  );

CREATE POLICY "Authenticated users can upload to official-documents"
  ON storage.objects FOR INSERT
  WITH CHECK (
    bucket_id = 'official-documents'
    AND auth.role() = 'authenticated'
  );

CREATE POLICY "Users can view official documents"
  ON storage.objects FOR SELECT
  USING (
    bucket_id = 'official-documents'
    AND auth.role() = 'authenticated'
  );
