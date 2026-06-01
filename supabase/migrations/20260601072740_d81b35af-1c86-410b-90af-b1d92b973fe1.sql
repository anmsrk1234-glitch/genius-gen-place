DROP FUNCTION IF EXISTS public.get_promptprobe_analytics(text);

DROP POLICY IF EXISTS "Anyone can insert analytics events" ON public.analytics_events;

GRANT SELECT ON public.analytics_events TO anon, authenticated;

CREATE POLICY "Anyone can insert valid analytics events"
ON public.analytics_events
FOR INSERT
TO anon, authenticated
WITH CHECK (
  event_name IN ('page_view', 'prompt_test_started', 'prompt_test_completed', 'model_selected', 'run_count_changed')
  AND (model IS NULL OR char_length(model) <= 120)
  AND (run_count IS NULL OR (run_count >= 0 AND run_count <= 100))
  AND (reliability_score IS NULL OR (reliability_score >= 0 AND reliability_score <= 100))
  AND (prompt_length IS NULL OR (prompt_length >= 0 AND prompt_length <= 100000))
  AND (path IS NULL OR char_length(path) <= 500)
  AND (session_id IS NULL OR char_length(session_id) <= 80)
);

CREATE POLICY "Admin key can read analytics events"
ON public.analytics_events
FOR SELECT
TO anon, authenticated
USING (
  encode(
    extensions.digest(
      coalesce(
        nullif(current_setting('request.headers', true), '')::jsonb ->> 'x-admin-analytics-key',
        ''
      ),
      'sha256'
    ),
    'hex'
  ) = 'dcdb86f6135a619f74870201abcd6901ff6cd8829cbe5aef265c2a1752906d4c'
);