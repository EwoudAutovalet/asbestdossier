-- Fix circular RLS dependency between properties and jobs
-- Use SECURITY DEFINER helper functions to avoid infinite recursion

-- Helper: check if user owns a property (bypasses RLS on properties)
CREATE OR REPLACE FUNCTION public.user_owns_property(property_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
  SELECT EXISTS (
    SELECT 1 FROM properties
    WHERE id = property_id AND owner_id = auth.uid()
  );
$$;

-- Helper: check if specialist is assigned to property via jobs (bypasses RLS on jobs)
CREATE OR REPLACE FUNCTION public.specialist_has_job_on_property(prop_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
  SELECT EXISTS (
    SELECT 1 FROM jobs
    WHERE property_id = prop_id AND specialist_id = auth.uid()
  );
$$;

-- Helper: check if user has access to a job
CREATE OR REPLACE FUNCTION public.user_can_access_job(j_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
  SELECT EXISTS (
    SELECT 1 FROM jobs j
    JOIN properties p ON p.id = j.property_id
    WHERE j.id = j_id
    AND (j.specialist_id = auth.uid() OR p.owner_id = auth.uid())
  );
$$;

-- Drop all existing policies that cause circular refs
DROP POLICY IF EXISTS "Owners can view their own properties" ON properties;
DROP POLICY IF EXISTS "Owners can insert their own properties" ON properties;
DROP POLICY IF EXISTS "Owners can update their own properties" ON properties;
DROP POLICY IF EXISTS "Specialists can view properties they have jobs for" ON properties;

DROP POLICY IF EXISTS "Owners can view jobs on their properties" ON jobs;
DROP POLICY IF EXISTS "Specialists can view their assigned jobs" ON jobs;
DROP POLICY IF EXISTS "Specialists can update their assigned jobs" ON jobs;
DROP POLICY IF EXISTS "Owners can insert jobs on their properties" ON jobs;

DROP POLICY IF EXISTS "Owners can view attachments on their property jobs" ON attachments;
DROP POLICY IF EXISTS "Specialists can view attachments on their jobs" ON attachments;
DROP POLICY IF EXISTS "Specialists can upload attachments to their jobs" ON attachments;
DROP POLICY IF EXISTS "Uploaders can delete their own attachments" ON attachments;

DROP POLICY IF EXISTS "Owners can view timeline for their properties" ON timeline_events;
DROP POLICY IF EXISTS "Specialists can view timeline for properties they work on" ON timeline_events;
DROP POLICY IF EXISTS "Authenticated users can insert timeline events" ON timeline_events;

-- Recreate properties policies (no cross-table references)
CREATE POLICY "owners_view_properties" ON properties
  FOR SELECT USING (owner_id = auth.uid());

CREATE POLICY "specialists_view_properties" ON properties
  FOR SELECT USING (public.specialist_has_job_on_property(id));

CREATE POLICY "owners_insert_properties" ON properties
  FOR INSERT WITH CHECK (owner_id = auth.uid());

CREATE POLICY "owners_update_properties" ON properties
  FOR UPDATE USING (owner_id = auth.uid());

-- Recreate jobs policies (use helper function)
CREATE POLICY "owners_view_jobs" ON jobs
  FOR SELECT USING (public.user_owns_property(property_id));

CREATE POLICY "specialists_view_jobs" ON jobs
  FOR SELECT USING (specialist_id = auth.uid());

CREATE POLICY "specialists_update_jobs" ON jobs
  FOR UPDATE USING (specialist_id = auth.uid());

CREATE POLICY "owners_insert_jobs" ON jobs
  FOR INSERT WITH CHECK (public.user_owns_property(property_id));

-- Recreate attachments policies (use helper function)
CREATE POLICY "users_view_attachments" ON attachments
  FOR SELECT USING (public.user_can_access_job(job_id));

CREATE POLICY "specialists_insert_attachments" ON attachments
  FOR INSERT WITH CHECK (
    uploaded_by = auth.uid()
    AND EXISTS (
      SELECT 1 FROM jobs WHERE id = job_id AND specialist_id = auth.uid()
    )
  );

CREATE POLICY "uploaders_delete_attachments" ON attachments
  FOR DELETE USING (uploaded_by = auth.uid());

-- Recreate timeline policies (use helper function)
CREATE POLICY "owners_view_timeline" ON timeline_events
  FOR SELECT USING (public.user_owns_property(property_id));

CREATE POLICY "specialists_view_timeline" ON timeline_events
  FOR SELECT USING (public.specialist_has_job_on_property(property_id));

CREATE POLICY "users_insert_timeline" ON timeline_events
  FOR INSERT WITH CHECK (actor_id = auth.uid());
