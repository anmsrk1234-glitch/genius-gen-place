CREATE OR REPLACE FUNCTION public.get_analytics_events(_admin_key text)
RETURNS TABLE (
  created_at timestamptz,
  event_name text,
  model text,
  run_count integer,
  reliability_score integer,
  session_id text
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public, extensions
AS $$
BEGIN
  IF encode(extensions.digest(coalesce(_admin_key, ''), 'sha256'), 'hex')
     <> '3ccc79f5b4786a0b5796a5af7b702386af3f763bcd74f3878fb216647bee1b3d' THEN
    RAISE EXCEPTION 'Unauthorized' USING ERRCODE = '42501';
  END IF;

  RETURN QUERY
  SELECT e.created_at, e.event_name, e.model, e.run_count, e.reliability_score, e.session_id
  FROM public.analytics_events e
  ORDER BY e.created_at DESC
  LIMIT 10000;
END;
$$;

REVOKE ALL ON FUNCTION public.get_analytics_events(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_analytics_events(text) TO anon, authenticated, service_role;

DROP POLICY IF EXISTS "Admin key can read analytics events" ON public.analytics_events;
REVOKE SELECT ON public.analytics_events FROM anon, authenticated;