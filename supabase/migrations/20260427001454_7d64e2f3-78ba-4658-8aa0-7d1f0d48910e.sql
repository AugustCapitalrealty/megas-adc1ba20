-- Cron job overview (admin only)
CREATE OR REPLACE FUNCTION public.get_system_health_cron()
RETURNS TABLE (
  jobid bigint,
  jobname text,
  schedule text,
  active boolean,
  last_run_start timestamp with time zone,
  last_run_end timestamp with time zone,
  last_status text,
  last_duration_ms numeric,
  runs_last_24h bigint,
  failures_last_24h bigint
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path TO 'public', 'cron'
AS $$
BEGIN
  IF NOT has_role(auth.uid(), 'admin') THEN
    RAISE EXCEPTION 'Acesso negado';
  END IF;

  RETURN QUERY
  WITH latest AS (
    SELECT DISTINCT ON (jrd.jobid)
      jrd.jobid,
      jrd.start_time,
      jrd.end_time,
      jrd.status
    FROM cron.job_run_details jrd
    ORDER BY jrd.jobid, jrd.start_time DESC
  ),
  agg AS (
    SELECT
      jrd.jobid,
      COUNT(*) FILTER (WHERE jrd.start_time >= now() - interval '24 hours') AS runs_24h,
      COUNT(*) FILTER (
        WHERE jrd.start_time >= now() - interval '24 hours'
          AND jrd.status <> 'succeeded'
      ) AS fails_24h
    FROM cron.job_run_details jrd
    GROUP BY jrd.jobid
  )
  SELECT
    j.jobid,
    j.jobname::text,
    j.schedule::text,
    j.active,
    l.start_time,
    l.end_time,
    COALESCE(l.status, 'never_ran'),
    CASE
      WHEN l.end_time IS NOT NULL AND l.start_time IS NOT NULL
        THEN EXTRACT(EPOCH FROM (l.end_time - l.start_time)) * 1000
      ELSE NULL
    END,
    COALESCE(a.runs_24h, 0),
    COALESCE(a.fails_24h, 0)
  FROM cron.job j
  LEFT JOIN latest l ON l.jobid = j.jobid
  LEFT JOIN agg a ON a.jobid = j.jobid
  ORDER BY j.jobid;
END;
$$;

REVOKE ALL ON FUNCTION public.get_system_health_cron() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_system_health_cron() TO authenticated;

-- Quick summary (admin only)
CREATE OR REPLACE FUNCTION public.get_system_health_summary()
RETURNS json
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path TO 'public', 'cron'
AS $$
DECLARE
  v_active_jobs int;
  v_fails_24h int;
  v_stuck_pendentes int;
  v_unread_action int;
  v_errors_24h int;
  v_errors_7d int;
BEGIN
  IF NOT has_role(auth.uid(), 'admin') THEN
    RAISE EXCEPTION 'Acesso negado';
  END IF;

  SELECT COUNT(*) INTO v_active_jobs FROM cron.job WHERE active = true;

  SELECT COUNT(*) INTO v_fails_24h
  FROM cron.job_run_details
  WHERE start_time >= now() - interval '24 hours'
    AND status <> 'succeeded';

  SELECT COUNT(*) INTO v_stuck_pendentes
  FROM public.solicitacoes
  WHERE status IN ('pendente_correcao', 'aguardando_informacoes')
    AND data_pendente_correcao IS NOT NULL
    AND data_pendente_correcao < now() - interval '5 days';

  SELECT COUNT(*) INTO v_unread_action
  FROM public.notifications
  WHERE tipo = 'action_required'
    AND lida = false
    AND created_at < now() - interval '24 hours';

  SELECT COUNT(*) INTO v_errors_24h
  FROM public.error_logs
  WHERE created_at >= now() - interval '24 hours'
    AND resolved = false;

  SELECT COUNT(*) INTO v_errors_7d
  FROM public.error_logs
  WHERE created_at >= now() - interval '7 days';

  RETURN json_build_object(
    'cron_active_jobs', v_active_jobs,
    'cron_failures_24h', v_fails_24h,
    'stuck_pendentes', v_stuck_pendentes,
    'unread_action_24h', v_unread_action,
    'errors_24h', v_errors_24h,
    'errors_7d', v_errors_7d,
    'generated_at', now()
  );
END;
$$;

REVOKE ALL ON FUNCTION public.get_system_health_summary() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_system_health_summary() TO authenticated;