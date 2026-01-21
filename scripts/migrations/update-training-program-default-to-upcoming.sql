-- Migration: Update training_program default status to 'upcoming'
-- Date: 2025-12-27
-- Description: Changes the default status for new training programs from 'active' to 'upcoming'
--              This ensures new programs start as scheduled/upcoming rather than immediately accepting applications

-- Step 1: Update the default value for the status column
ALTER TABLE training_programs
  ALTER COLUMN status SET DEFAULT 'upcoming'::training_program_status;

-- Step 2: Also update the backup table to maintain consistency
ALTER TABLE training_programs_backup
  ALTER COLUMN status SET DEFAULT 'upcoming'::training_program_status;

-- Verification query (optional - can be run separately to check):
-- SELECT column_name, column_default
-- FROM information_schema.columns
-- WHERE table_name = 'training_programs' AND column_name = 'status';
