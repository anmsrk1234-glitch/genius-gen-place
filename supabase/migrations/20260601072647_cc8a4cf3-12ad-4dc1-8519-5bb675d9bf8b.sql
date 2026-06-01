CREATE EXTENSION IF NOT EXISTS pgcrypto WITH SCHEMA extensions;

CREATE OR REPLACE FUNCTION public.get_promptprobe_analytics(admin_key text)
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public, extensions
AS $$
DECLARE
  expected_key_hash constant text := 'dcdb86f6135a619f74870201abcd6901ff6cd8829cbe5aef265c2a1752906d4c';
  provided_key_hash text;
  result jsonb;
BEGIN
  provided_key_hash := encode(extensions.digest(coalesce(admin_key, ''), 'sha256'), 'hex');

  IF provided_key_hash <> expected_key_hash THEN
    RAISE EXCEPTION 'Unauthorized' USING ERRCODE = '42501';
  END IF;

  WITH events AS (
    SELECT event_name, model, run_count, reliability_score, session_id, created_at
    FROM public.analytics_events
    ORDER BY created_at DESC
    LIMIT 10000
  ), metrics AS (
    SELECT
      count(DISTINCT session_id) FILTER (WHERE session_id IS NOT NULL)::int AS total_visitors,
      count(*) FILTER (WHERE event_name = 'page_view')::int AS total_page_views,
      count(*) FILTER (WHERE event_name = 'prompt_test_started')::int AS total_tests_started,
      count(*) FILTER (WHERE event_name = 'prompt_test_completed')::int AS total_tests_completed,
      coalesce(round(avg(run_count) FILTER (WHERE event_name = 'prompt_test_started' AND run_count IS NOT NULL)::numeric, 1), 0)::numeric AS avg_run_count,
      round(avg(reliability_score) FILTER (WHERE event_name = 'prompt_test_completed' AND reliability_score IS NOT NULL))::int AS avg_reliability_score
    FROM events
  ), model_usage AS (
    SELECT coalesce(jsonb_agg(jsonb_build_object('model', model, 'count', count) ORDER BY count DESC), '[]'::jsonb) AS items
    FROM (
      SELECT model, count(*)::int AS count
      FROM events
      WHERE event_name = 'prompt_test_started' AND model IS NOT NULL
      GROUP BY model
      ORDER BY count(*) DESC
    ) ranked
  ), recent_events AS (
    SELECT coalesce(jsonb_agg(jsonb_build_object(
      'created_at', created_at,
      'event_name', event_name,
      'model', model,
      'run_count', run_count,
      'reliability_score', reliability_score
    ) ORDER BY created_at DESC), '[]'::jsonb) AS items
    FROM (
      SELECT created_at, event_name, model, run_count, reliability_score
      FROM events
      ORDER BY created_at DESC
      LIMIT 50
    ) recent
  )
  SELECT jsonb_build_object(
    'totalVisitors', m.total_visitors,
    'totalPageViews', m.total_page_views,
    'totalTestsStarted', m.total_tests_started,
    'totalTestsCompleted', m.total_tests_completed,
    'completionRate', CASE WHEN m.total_tests_started > 0 THEN round((m.total_tests_completed::numeric / m.total_tests_started::numeric) * 100)::int ELSE 0 END,
    'avgRunCount', m.avg_run_count,
    'avgReliabilityScore', m.avg_reliability_score,
    'modelUsage', mu.items,
    'recentEvents', re.items
  )
  INTO result
  FROM metrics m
  CROSS JOIN model_usage mu
  CROSS JOIN recent_events re;

  RETURN result;
END;
$$;

REVOKE ALL ON FUNCTION public.get_promptprobe_analytics(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_promptprobe_analytics(text) TO anon, authenticated;