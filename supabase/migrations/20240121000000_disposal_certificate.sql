-- GAP 2: VLAREMA disposal certificate tracking
-- disposal_certificate = proof of legal asbestos waste disposal (traceability document)
ALTER TYPE attachment_type ADD VALUE IF NOT EXISTS 'disposal_certificate';

ALTER TABLE attachments ADD COLUMN IF NOT EXISTS disposal_reference TEXT;
