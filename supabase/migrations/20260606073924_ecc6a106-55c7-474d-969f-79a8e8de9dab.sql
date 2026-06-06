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
     <> 'dcdb86f6135a619f74870201abcd6901ff6cd8829cbe5aef265c2a1752906d4c' THEN
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