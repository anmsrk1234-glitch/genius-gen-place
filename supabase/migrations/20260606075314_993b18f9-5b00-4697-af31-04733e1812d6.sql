REVOKE EXECUTE ON FUNCTION public.get_analytics_events(text) FROM anon, authenticated;
GRANT EXECUTE ON FUNCTION public.get_analytics_events(text) TO service_role;