-- Add partial index on applications.re_routed_by for FK lookups
-- Applied via Supabase migration on 2026-03-06
CREATE INDEX IF NOT EXISTS idx_applications_re_routed_by
  ON applications(re_routed_by) WHERE re_routed_by IS NOT NULL;
