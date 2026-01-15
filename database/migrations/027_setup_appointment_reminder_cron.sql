-- Migration: Set up cron job for appointment reminders
-- This schedules automatic email reminders for multi-appointment services
-- Safe to run multiple times (idempotent)

-- Enable pg_cron extension (if not already enabled)
-- Note: This requires superuser privileges. If you get a permission error,
-- you may need to enable it manually in Supabase Dashboard > Database > Extensions
DO $$
BEGIN
  CREATE EXTENSION IF NOT EXISTS pg_cron;
EXCEPTION
  WHEN insufficient_privilege THEN
    RAISE NOTICE 'pg_cron extension requires superuser privileges. Please enable it manually in Supabase Dashboard > Database > Extensions.';
  WHEN OTHERS THEN
    -- Extension might already exist or not be available
    RAISE NOTICE 'pg_cron extension: %', SQLERRM;
END $$;

-- Enable pg_net extension for calling Edge Functions via HTTP
-- Note: Supabase uses pg_net extension, not http
DO $$
BEGIN
  CREATE EXTENSION IF NOT EXISTS pg_net;
EXCEPTION
  WHEN insufficient_privilege THEN
    RAISE NOTICE 'pg_net extension requires superuser privileges. Please enable it manually in Supabase Dashboard > Database > Extensions.';
  WHEN OTHERS THEN
    RAISE NOTICE 'pg_net extension: %', SQLERRM;
END $$;

-- Schedule appointment reminder check to run daily at 9:00 AM UTC
-- This calls the Supabase Edge Function which handles both checking and sending reminders
-- The Edge Function: supabase/functions/send-appointment-reminders/index.ts
-- 
-- IMPORTANT: Replace YOUR_PROJECT_REF and YOUR_ANON_KEY with your actual values
-- You can find these in Supabase Dashboard > Settings > API
-- 
-- Option 1: Call Edge Function via HTTP (recommended)
-- This requires the pg_net extension and your project's anon key
DO $$
BEGIN
  -- Unschedule existing job if it exists
  IF EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'appointment-reminder-check') THEN
    PERFORM cron.unschedule('appointment-reminder-check');
  END IF;
  
  -- Schedule the new job
  -- Using different dollar-quote tag ($cmd$) for the command to avoid nesting issues
  PERFORM cron.schedule(
    'appointment-reminder-check',
    '0 9 * * *', -- 9:00 AM UTC daily (adjust timezone as needed)
    $cmd$
    SELECT
      net.http_post(
        url := 'https://YOUR_PROJECT_REF.supabase.co/functions/v1/send-appointment-reminders',
        headers := jsonb_build_object(
          'Content-Type', 'application/json',
          'Authorization', 'Bearer YOUR_ANON_KEY'
        ),
        body := '{}'::jsonb
      ) AS request_id;
    $cmd$
  );
END $$;

-- Note: If pg_net is not available, you can use an external cron service instead
-- See CRON_SETUP_INSTRUCTIONS.md for alternative setup methods

-- Option 2: Alternative - Call RPC function directly (emails won't be sent, only logged)
-- Uncomment this if you prefer to handle email sending separately
-- DO $$
-- BEGIN
--   IF EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'appointment-reminder-check-rpc') THEN
--     PERFORM cron.unschedule('appointment-reminder-check-rpc');
--   END IF;
--   PERFORM cron.schedule(
--     'appointment-reminder-check-rpc',
--     '0 9 * * *',
--     $cmd$
--     SELECT check_and_send_appointment_reminders();
--     $cmd$
--   );
-- END $$;

-- Add comment
COMMENT ON EXTENSION pg_cron IS 'Enables scheduled jobs for appointment and booking reminders';

-- Note: To view scheduled cron jobs, run:
-- SELECT * FROM cron.job;
--
-- To view cron job history, run:
-- SELECT * FROM cron.job_run_details ORDER BY start_time DESC LIMIT 10;
--
-- To unschedule a job, run:
-- SELECT cron.unschedule('appointment-reminder-check');
--
-- To manually trigger the reminder check, you can:
-- 1. Call the Edge Function directly via HTTP POST
-- 2. Or call the RPC function: SELECT check_and_send_appointment_reminders();
