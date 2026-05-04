-- Marktplaats: open aanvragen van eigenaars + biedingen van specialisten

CREATE TYPE marketplace_work_type AS ENUM ('inspection', 'removal', 'full', 'other');
CREATE TYPE marketplace_request_status AS ENUM ('open', 'closed', 'cancelled');
CREATE TYPE marketplace_bid_status AS ENUM ('submitted', 'accepted', 'rejected', 'withdrawn');
CREATE TYPE marketplace_urgency AS ENUM ('flexible', 'soon', 'urgent');

CREATE TABLE marketplace_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  property_id UUID NOT NULL REFERENCES properties(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  work_type marketplace_work_type NOT NULL DEFAULT 'inspection',
  urgency marketplace_urgency NOT NULL DEFAULT 'flexible',
  deadline DATE,
  budget_indication NUMERIC(10,2),
  postal_code TEXT NOT NULL,
  city TEXT NOT NULL,
  bouwjaar INTEGER,
  oppervlakte NUMERIC(10,2),
  status marketplace_request_status NOT NULL DEFAULT 'open',
  accepted_bid_id UUID,
  resulting_job_id UUID REFERENCES jobs(id) ON DELETE SET NULL,
  closed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE marketplace_bids (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  request_id UUID NOT NULL REFERENCES marketplace_requests(id) ON DELETE CASCADE,
  specialist_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  amount NUMERIC(10,2) NOT NULL,
  message TEXT,
  valid_until DATE,
  estimated_duration_days INTEGER,
  status marketplace_bid_status NOT NULL DEFAULT 'submitted',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (request_id, specialist_id)
);

ALTER TABLE marketplace_requests
  ADD CONSTRAINT marketplace_requests_accepted_bid_fk
  FOREIGN KEY (accepted_bid_id) REFERENCES marketplace_bids(id) ON DELETE SET NULL;

CREATE INDEX idx_marketplace_requests_owner ON marketplace_requests(owner_id);
CREATE INDEX idx_marketplace_requests_property ON marketplace_requests(property_id);
CREATE INDEX idx_marketplace_requests_status ON marketplace_requests(status);
CREATE INDEX idx_marketplace_requests_postal ON marketplace_requests(postal_code);
CREATE INDEX idx_marketplace_bids_request ON marketplace_bids(request_id);
CREATE INDEX idx_marketplace_bids_specialist ON marketplace_bids(specialist_id);
CREATE INDEX idx_marketplace_bids_status ON marketplace_bids(status);

CREATE TRIGGER marketplace_requests_updated_at
  BEFORE UPDATE ON marketplace_requests
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER marketplace_bids_updated_at
  BEFORE UPDATE ON marketplace_bids
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- Helper: heeft user toegang tot een marktplaats-aanvraag (eigenaar of bieder)
CREATE OR REPLACE FUNCTION public.user_can_access_marketplace_request(req_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
  SELECT EXISTS (
    SELECT 1 FROM marketplace_requests r
    WHERE r.id = req_id
    AND (
      r.owner_id = auth.uid()
      OR EXISTS (SELECT 1 FROM marketplace_bids b WHERE b.request_id = r.id AND b.specialist_id = auth.uid())
      OR (r.status = 'open' AND EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role = 'specialist'))
    )
  );
$$;

-- RLS
ALTER TABLE marketplace_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE marketplace_bids ENABLE ROW LEVEL SECURITY;

-- Owners: full CRUD on their own requests
CREATE POLICY "owners_view_own_requests" ON marketplace_requests
  FOR SELECT USING (owner_id = auth.uid());

CREATE POLICY "owners_insert_requests" ON marketplace_requests
  FOR INSERT WITH CHECK (
    owner_id = auth.uid()
    AND public.user_owns_property(property_id)
  );

CREATE POLICY "owners_update_own_requests" ON marketplace_requests
  FOR UPDATE USING (owner_id = auth.uid());

CREATE POLICY "owners_delete_own_open_requests" ON marketplace_requests
  FOR DELETE USING (owner_id = auth.uid() AND status = 'open');

-- Specialists: view all open requests + their own historic ones (where they bid)
CREATE POLICY "specialists_view_open_requests" ON marketplace_requests
  FOR SELECT USING (
    status = 'open'
    AND EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role = 'specialist')
  );

CREATE POLICY "specialists_view_their_bid_requests" ON marketplace_requests
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM marketplace_bids b WHERE b.request_id = marketplace_requests.id AND b.specialist_id = auth.uid())
  );

-- Brokers: view requests of their managed owners
CREATE POLICY "brokers_view_managed_requests" ON marketplace_requests
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM broker_owners bo
      WHERE bo.broker_id = auth.uid()
      AND bo.owner_id = marketplace_requests.owner_id
      AND bo.status = 'active'
    )
  );

-- Bids policies
CREATE POLICY "specialists_view_own_bids" ON marketplace_bids
  FOR SELECT USING (specialist_id = auth.uid());

CREATE POLICY "specialists_insert_bids" ON marketplace_bids
  FOR INSERT WITH CHECK (
    specialist_id = auth.uid()
    AND EXISTS (
      SELECT 1 FROM marketplace_requests r
      WHERE r.id = request_id AND r.status = 'open'
    )
    AND EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role = 'specialist')
  );

CREATE POLICY "specialists_update_own_bids" ON marketplace_bids
  FOR UPDATE USING (specialist_id = auth.uid());

CREATE POLICY "specialists_delete_own_submitted_bids" ON marketplace_bids
  FOR DELETE USING (specialist_id = auth.uid() AND status = 'submitted');

-- Owners: view bids on their requests + update status (accept/reject)
CREATE POLICY "owners_view_bids_on_their_requests" ON marketplace_bids
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM marketplace_requests r
      WHERE r.id = marketplace_bids.request_id AND r.owner_id = auth.uid()
    )
  );

CREATE POLICY "owners_update_bids_on_their_requests" ON marketplace_bids
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM marketplace_requests r
      WHERE r.id = marketplace_bids.request_id AND r.owner_id = auth.uid()
    )
  );

-- Brokers: view + update bids on requests of their managed owners
CREATE POLICY "brokers_view_managed_bids" ON marketplace_bids
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM marketplace_requests r
      JOIN broker_owners bo ON bo.owner_id = r.owner_id
      WHERE r.id = marketplace_bids.request_id
      AND bo.broker_id = auth.uid()
      AND bo.status = 'active'
    )
  );

CREATE POLICY "brokers_update_managed_bids" ON marketplace_bids
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM marketplace_requests r
      JOIN broker_owners bo ON bo.owner_id = r.owner_id
      WHERE r.id = marketplace_bids.request_id
      AND bo.broker_id = auth.uid()
      AND bo.status = 'active'
    )
  );

-- RPC: accept bid atomically — closes request, rejects other bids, creates job + quote
CREATE OR REPLACE FUNCTION public.accept_marketplace_bid(bid_id UUID)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_bid marketplace_bids%ROWTYPE;
  v_request marketplace_requests%ROWTYPE;
  v_caller_id UUID := auth.uid();
  v_is_authorized BOOLEAN := FALSE;
  v_job_id UUID;
  v_quote_id UUID;
BEGIN
  SELECT * INTO v_bid FROM marketplace_bids WHERE id = bid_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Bid not found';
  END IF;

  SELECT * INTO v_request FROM marketplace_requests WHERE id = v_bid.request_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Request not found';
  END IF;

  -- Authorization: caller must be owner of request OR active broker for that owner
  IF v_request.owner_id = v_caller_id THEN
    v_is_authorized := TRUE;
  ELSE
    SELECT EXISTS (
      SELECT 1 FROM broker_owners bo
      WHERE bo.broker_id = v_caller_id
      AND bo.owner_id = v_request.owner_id
      AND bo.status = 'active'
    ) INTO v_is_authorized;
  END IF;

  IF NOT v_is_authorized THEN
    RAISE EXCEPTION 'Not authorized to accept this bid';
  END IF;

  IF v_request.status <> 'open' THEN
    RAISE EXCEPTION 'Request is not open';
  END IF;

  -- Create job
  INSERT INTO jobs (property_id, specialist_id, status, title, description, total_cost)
  VALUES (
    v_request.property_id,
    v_bid.specialist_id,
    'approved',
    v_request.title,
    v_request.description,
    v_bid.amount
  )
  RETURNING id INTO v_job_id;

  -- Create quote (approved) from bid
  INSERT INTO quotes (job_id, specialist_id, status, description, labor_cost, material_cost, disposal_cost, valid_until, notes, submitted_at, responded_at)
  VALUES (
    v_job_id,
    v_bid.specialist_id,
    'approved',
    v_bid.message,
    v_bid.amount,
    0,
    0,
    v_bid.valid_until,
    'Aanvaard via marktplaats',
    v_bid.created_at,
    now()
  )
  RETURNING id INTO v_quote_id;

  -- Accept this bid
  UPDATE marketplace_bids
    SET status = 'accepted', updated_at = now()
    WHERE id = bid_id;

  -- Reject all other submitted bids on the same request
  UPDATE marketplace_bids
    SET status = 'rejected', updated_at = now()
    WHERE request_id = v_request.id
    AND id <> bid_id
    AND status = 'submitted';

  -- Close the request
  UPDATE marketplace_requests
    SET status = 'closed',
        accepted_bid_id = bid_id,
        resulting_job_id = v_job_id,
        closed_at = now(),
        updated_at = now()
    WHERE id = v_request.id;

  -- Timeline
  INSERT INTO timeline_events (property_id, job_id, actor_id, action, details)
  VALUES (
    v_request.property_id,
    v_job_id,
    v_caller_id,
    'Marktplaats-bod aanvaard',
    jsonb_build_object('bid_id', bid_id, 'amount', v_bid.amount, 'request_id', v_request.id)
  );

  RETURN v_job_id;
END;
$$;

GRANT EXECUTE ON FUNCTION public.accept_marketplace_bid(UUID) TO authenticated;
