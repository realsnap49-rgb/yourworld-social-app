CREATE TABLE IF NOT EXISTS public.calls (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  call_id text NOT NULL,
  caller_id uuid NOT NULL,
  callee_id uuid NOT NULL,
  caller_name text,
  mode text NOT NULL DEFAULT 'audio',
  thread_id uuid,
  status text NOT NULL DEFAULT 'ringing',
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS calls_callee_idx ON public.calls (callee_id, created_at DESC);

GRANT SELECT, INSERT, UPDATE ON public.calls TO authenticated;
GRANT ALL ON public.calls TO service_role;

ALTER TABLE public.calls ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "calls_select_participants" ON public.calls;
CREATE POLICY "calls_select_participants" ON public.calls FOR SELECT TO authenticated
  USING (auth.uid() = caller_id OR auth.uid() = callee_id);

DROP POLICY IF EXISTS "calls_insert_caller" ON public.calls;
CREATE POLICY "calls_insert_caller" ON public.calls FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = caller_id AND caller_id <> callee_id);

DROP POLICY IF EXISTS "calls_update_participants" ON public.calls;
CREATE POLICY "calls_update_participants" ON public.calls FOR UPDATE TO authenticated
  USING (auth.uid() = caller_id OR auth.uid() = callee_id)
  WITH CHECK (auth.uid() = caller_id OR auth.uid() = callee_id);

ALTER TABLE public.calls REPLICA IDENTITY FULL;
DO $$ BEGIN
  EXECUTE 'ALTER PUBLICATION supabase_realtime ADD TABLE public.calls';
EXCEPTION WHEN duplicate_object THEN NULL; END $$;