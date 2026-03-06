-- Create notification cleanup function and schedule cron jobs
-- Applied via Supabase migration on 2026-03-06

-- Notification cleanup: deletes read notifications older than 30 days
-- and all notifications older than 90 days
CREATE OR REPLACE FUNCTION cleanup_old_notifications()
RETURNS integer LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE deleted_count integer;
BEGIN
  DELETE FROM notifications
  WHERE (is_read = true AND created_at < NOW() - INTERVAL '30 days')
     OR (created_at < NOW() - INTERVAL '90 days');
  GET DIAGNOSTICS deleted_count = ROW_COUNT;
  RETURN deleted_count;
END; $$;

-- Enable pg_cron extension
CREATE EXTENSION IF NOT EXISTS pg_cron WITH SCHEMA extensions;

-- Schedule audit trail cleanup: Sundays at 3 AM UTC
SELECT cron.schedule('cleanup-audit-trail', '0 3 * * 0', $$SELECT cleanup_old_audit_trail()$$);

-- Schedule notification cleanup: Sundays at 4 AM UTC
SELECT cron.schedule('cleanup-notifications', '0 4 * * 0', $$SELECT cleanup_old_notifications()$$);
