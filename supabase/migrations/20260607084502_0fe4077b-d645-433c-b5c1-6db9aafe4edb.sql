CREATE TABLE public.feedback (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at timestamptz NOT NULL DEFAULT now(),
  feedback_type text NOT NULL,
  session_id text,
  run_id text,
  CONSTRAINT feedback_type_check CHECK (feedback_type IN ('yes','no')),
  CONSTRAINT feedback_session_id_len CHECK (session_id IS NULL OR char_length(session_id) <= 120),
  CONSTRAINT feedback_run_id_len CHECK (run_id IS NULL OR char_length(run_id) <= 120)
);

GRANT INSERT ON public.feedback TO anon, authenticated;
GRANT ALL ON public.feedback TO service_role;

ALTER TABLE public.feedback ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can insert feedback"
  ON public.feedback
  FOR INSERT
  TO anon, authenticated
  WITH CHECK (feedback_type IN ('yes','no'));

CREATE INDEX feedback_created_at_idx ON public.feedback (created_at DESC);