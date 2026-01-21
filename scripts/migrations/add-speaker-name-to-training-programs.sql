-- Migration: Add speaker_name to training_programs
-- Date: 2025-12-26
-- Description: Adds speaker/instructor name field to training programs for certificate generation
-- Author: Claude Code
-- Task: E2 - Panel Request (PESO)

-- Add speaker_name column to training_programs table
ALTER TABLE training_programs
ADD COLUMN IF NOT EXISTS speaker_name TEXT;

-- Add column comment for documentation
COMMENT ON COLUMN training_programs.speaker_name IS 'Name of the speaker/instructor conducting the training (displayed on certificates). Nullable to support existing programs.';

-- Create index for efficient searching by speaker name
CREATE INDEX IF NOT EXISTS idx_training_programs_speaker_name
ON training_programs(speaker_name)
WHERE speaker_name IS NOT NULL;

-- Log migration completion
DO $$
BEGIN
  RAISE NOTICE 'Migration completed: Added speaker_name column to training_programs table';
END $$;
