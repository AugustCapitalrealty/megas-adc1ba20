-- Add cron job for Google Chat daily digest (09:00, 13:00, 18:00 Brazil Time)
-- This will automatically send the daily digest to Google Chat Space

-- Schedule for 09:00 (6:00 UTC/BRT-3)
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

-- Schedule for 13:00 (10:00 UTC/BRT-3)
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

-- Schedule for 18:00 (15:00 UTC/BRT-3)
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
