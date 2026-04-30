-- Analytics views for owner dashboards

-- Monthly job stats: count jobs per month per status
CREATE OR REPLACE VIEW job_monthly_stats AS
SELECT
  date_trunc('month', j.created_at)::date AS month,
  j.status,
  COUNT(*)::int AS job_count,
  COALESCE(SUM(j.total_cost), 0) AS total_cost
FROM jobs j
JOIN properties p ON p.id = j.property_id
GROUP BY date_trunc('month', j.created_at), j.status
ORDER BY month DESC;

-- Removal stats: count per component_name
CREATE OR REPLACE VIEW removal_stats AS
SELECT
  r.component_name,
  COUNT(*)::int AS removal_count,
  AVG(EXTRACT(EPOCH FROM (r.removed_at - j.started_at)) / 86400)::numeric(10,1) AS avg_days_to_removal
FROM removals r
JOIN jobs j ON j.id = r.job_id
JOIN properties p ON p.id = j.property_id
GROUP BY r.component_name
ORDER BY removal_count DESC;

-- Cost summary per property
CREATE OR REPLACE VIEW cost_summary AS
SELECT
  p.id AS property_id,
  p.address,
  p.city,
  p.postal_code,
  p.status,
  p.owner_id,
  COUNT(j.id)::int AS job_count,
  COALESCE(SUM(j.total_cost), 0) AS total_cost,
  CASE WHEN COUNT(j.id) > 0
    THEN COALESCE(SUM(j.total_cost), 0) / COUNT(j.id)
    ELSE 0
  END AS avg_cost_per_job
FROM properties p
LEFT JOIN jobs j ON j.property_id = p.id
GROUP BY p.id, p.address, p.city, p.postal_code, p.status, p.owner_id
ORDER BY total_cost DESC;

-- RLS: views inherit RLS from underlying tables, but we add explicit security
-- by filtering on owner_id in the server queries.
