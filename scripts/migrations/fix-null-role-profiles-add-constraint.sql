-- Fix NULL role profiles and add NOT NULL constraint
-- Applied via Supabase migration on 2026-03-06

-- Set any NULL roles to APPLICANT
UPDATE profiles SET role = 'APPLICANT' WHERE role IS NULL;

-- Set default for future inserts
ALTER TABLE profiles ALTER COLUMN role SET DEFAULT 'APPLICANT';

-- Add NOT NULL constraint to prevent future NULLs
ALTER TABLE profiles ADD CONSTRAINT profiles_role_not_null CHECK (role IS NOT NULL);
