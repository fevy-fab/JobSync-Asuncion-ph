/**
 * Update Training Program Status Enum
 *
 * This migration updates the training_program_status enum to support
 * the complete program lifecycle workflow.
 *
 * Changes:
 * - Removes unused 'scheduled' status (redundant with 'upcoming')
 * - Keeps 6 statuses: active, upcoming, ongoing, completed, cancelled, archived
 * - Migrates any existing 'scheduled' records to 'upcoming'
 *
 * Valid Transition Workflow:
 * upcoming → active → ongoing → completed
 *    ↓        ↓        ↓         ↓
 * cancelled  cancelled cancelled cancelled
 *    ↓        ↓        ↓         ↓
 * archived  archived  archived  archived
 *
 * Created: 2025-12-27
 * Task: M3 - Fix Training Program Status Workflow
 */

BEGIN;

-- Step 1: Migrate any existing 'scheduled' records to 'upcoming' in both tables
UPDATE training_programs
SET status = 'upcoming'
WHERE status = 'scheduled';

UPDATE training_programs_backup
SET status = 'upcoming'
WHERE status = 'scheduled';

-- Step 2: Drop RLS policy that depends on status enum
DROP POLICY IF EXISTS "Anyone can view active and upcoming programs" ON training_programs;

-- Step 3: Drop the default value temporarily on main table
ALTER TABLE training_programs
  ALTER COLUMN status DROP DEFAULT;

-- Step 4: Create new enum type with 6 statuses (without 'scheduled')
CREATE TYPE training_program_status_new AS ENUM (
  'active',      -- Accepting enrollments
  'upcoming',    -- Scheduled, not started
  'ongoing',     -- In progress, training started
  'completed',   -- Finished successfully
  'cancelled',   -- Cancelled before/during execution
  'archived'     -- Historical, old programs
);

-- Step 5: Alter both tables to use new enum
ALTER TABLE training_programs
  ALTER COLUMN status TYPE training_program_status_new
  USING status::text::training_program_status_new;

ALTER TABLE training_programs_backup
  ALTER COLUMN status TYPE training_program_status_new
  USING status::text::training_program_status_new;

-- Step 6: Drop old enum and rename new one
DROP TYPE training_program_status;
ALTER TYPE training_program_status_new RENAME TO training_program_status;

-- Step 7: Restore the default value with new enum
ALTER TABLE training_programs
  ALTER COLUMN status SET DEFAULT 'active'::training_program_status;

-- Step 8: Recreate RLS policy with new enum
CREATE POLICY "Anyone can view active and upcoming programs"
  ON training_programs
  FOR SELECT
  USING (status = ANY (ARRAY['active'::training_program_status, 'upcoming'::training_program_status]));

-- Step 9: Add comment documenting valid transitions
COMMENT ON TYPE training_program_status IS
'Training program lifecycle statuses. Valid transitions:
upcoming → active → ongoing → completed
   ↓        ↓        ↓         ↓
cancelled  cancelled cancelled cancelled
   ↓        ↓        ↓         ↓
archived  archived  archived  archived';

COMMIT;

-- Verification query (run separately):
-- SELECT status, COUNT(*)
-- FROM training_programs
-- GROUP BY status
-- ORDER BY status;
