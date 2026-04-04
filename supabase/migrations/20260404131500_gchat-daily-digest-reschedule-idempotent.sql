-- Recreate gchat daily digest cron jobs in an idempotent way.
-- This ensures all schedules point to the same production project/function URL.

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'gchat-daily-digest-morning') THEN
    PERFORM cron.unschedule('gchat-daily-digest-morning');
  END IF;

  IF EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'gchat-daily-digest-afternoon') THEN
    PERFORM cron.unschedule('gchat-daily-digest-afternoon');
  END IF;

  IF EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'gchat-daily-digest-evening') THEN
    PERFORM cron.unschedule('gchat-daily-digest-evening');
  END IF;
END $$;

-- Schedule for 09:00 BRT (06:00 UTC), Monday-Friday
SELECT cron.schedule(
  'gchat-daily-digest-morning',
  '0 6 * * 1-5',
  $$SELECT net.http_post(
    url := 'https://wcxybuietfmaaqzmcmnq.supabase.co/functions/v1/gchat-daily-digest',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || current_setting('app.service_role_key', true)
    ),
    body := jsonb_build_object('time', 'scheduled-morning')
  )$$
);

-- Schedule for 13:00 BRT (10:00 UTC), Monday-Friday
SELECT cron.schedule(
  'gchat-daily-digest-afternoon',
  '0 10 * * 1-5',
  $$SELECT net.http_post(
    url := 'https://wcxybuietfmaaqzmcmnq.supabase.co/functions/v1/gchat-daily-digest',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || current_setting('app.service_role_key', true)
    ),
    body := jsonb_build_object('time', 'scheduled-afternoon')
  )$$
);

-- Schedule for 18:00 BRT (15:00 UTC), Monday-Friday
SELECT cron.schedule(
  'gchat-daily-digest-evening',
  '0 15 * * 1-5',
  $$SELECT net.http_post(
    url := 'https://wcxybuietfmaaqzmcmnq.supabase.co/functions/v1/gchat-daily-digest',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || current_setting('app.service_role_key', true)
    ),
    body := jsonb_build_object('time', 'scheduled-evening')
  )$$
);
