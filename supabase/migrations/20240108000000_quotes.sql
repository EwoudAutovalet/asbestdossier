-- Offertemodule: quotes en quote_lines

CREATE TABLE quotes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  job_id UUID NOT NULL REFERENCES jobs(id) ON DELETE CASCADE,
  specialist_id UUID NOT NULL REFERENCES profiles(id),
  status TEXT NOT NULL CHECK (status IN ('draft', 'submitted', 'approved', 'rejected')) DEFAULT 'draft',
  description TEXT,
  labor_cost NUMERIC(10,2) NOT NULL DEFAULT 0,
  material_cost NUMERIC(10,2) NOT NULL DEFAULT 0,
  disposal_cost NUMERIC(10,2) NOT NULL DEFAULT 0,
  total_cost NUMERIC(10,2) GENERATED ALWAYS AS (labor_cost + material_cost + disposal_cost) STORED,
  valid_until DATE,
  notes TEXT,
  submitted_at TIMESTAMPTZ,
  responded_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE quote_lines (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  quote_id UUID NOT NULL REFERENCES quotes(id) ON DELETE CASCADE,
  description TEXT NOT NULL,
  quantity NUMERIC(10,2) NOT NULL DEFAULT 1,
  unit TEXT NOT NULL DEFAULT 'stuk',
  unit_price NUMERIC(10,2) NOT NULL,
  total NUMERIC(10,2) GENERATED ALWAYS AS (quantity * unit_price) STORED,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Indexes
CREATE INDEX idx_quotes_job ON quotes(job_id);
CREATE INDEX idx_quotes_specialist ON quotes(specialist_id);
CREATE INDEX idx_quote_lines_quote ON quote_lines(quote_id);

-- Updated_at trigger
CREATE TRIGGER quotes_updated_at
  BEFORE UPDATE ON quotes
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- RLS
ALTER TABLE quotes ENABLE ROW LEVEL SECURITY;
ALTER TABLE quote_lines ENABLE ROW LEVEL SECURITY;

-- Specialists: full CRUD on own quotes
CREATE POLICY "Specialists can view their own quotes"
  ON quotes FOR SELECT
  USING (specialist_id = auth.uid());

CREATE POLICY "Specialists can insert their own quotes"
  ON quotes FOR INSERT
  WITH CHECK (specialist_id = auth.uid());

CREATE POLICY "Specialists can update their own quotes"
  ON quotes FOR UPDATE
  USING (specialist_id = auth.uid());

CREATE POLICY "Specialists can delete their own draft quotes"
  ON quotes FOR DELETE
  USING (specialist_id = auth.uid() AND status = 'draft');

-- Owners: read quotes on their properties
CREATE POLICY "Owners can view quotes on their properties"
  ON quotes FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM jobs j
      JOIN properties p ON p.id = j.property_id
      WHERE j.id = quotes.job_id
      AND p.owner_id = auth.uid()
    )
  );

-- Owners: update status to approved/rejected
CREATE POLICY "Owners can respond to quotes"
  ON quotes FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM jobs j
      JOIN properties p ON p.id = j.property_id
      WHERE j.id = quotes.job_id
      AND p.owner_id = auth.uid()
    )
  );

-- Quote lines: inherit access via quote
CREATE POLICY "Users can view quote lines via quote access"
  ON quote_lines FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM quotes q
      WHERE q.id = quote_lines.quote_id
      AND (
        q.specialist_id = auth.uid()
        OR EXISTS (
          SELECT 1 FROM jobs j
          JOIN properties p ON p.id = j.property_id
          WHERE j.id = q.job_id
          AND p.owner_id = auth.uid()
        )
      )
    )
  );

CREATE POLICY "Specialists can insert quote lines on their quotes"
  ON quote_lines FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM quotes q
      WHERE q.id = quote_lines.quote_id
      AND q.specialist_id = auth.uid()
    )
  );

CREATE POLICY "Specialists can update quote lines on their quotes"
  ON quote_lines FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM quotes q
      WHERE q.id = quote_lines.quote_id
      AND q.specialist_id = auth.uid()
    )
  );

CREATE POLICY "Specialists can delete quote lines on their quotes"
  ON quote_lines FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM quotes q
      WHERE q.id = quote_lines.quote_id
      AND q.specialist_id = auth.uid()
    )
  );
