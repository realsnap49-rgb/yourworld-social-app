CREATE TABLE public.direct_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  thread_id text NOT NULL,
  sender_id uuid NOT NULL,
  content text NOT NULL DEFAULT '',
  media_url text,
  media_type text NOT NULL DEFAULT 'text',
  is_read boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX direct_messages_thread_idx ON public.direct_messages (thread_id, created_at);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.direct_messages TO authenticated;
GRANT ALL ON public.direct_messages TO service_role;

ALTER TABLE public.direct_messages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Participants can read thread messages" ON public.direct_messages
  FOR SELECT TO authenticated
  USING (
    sender_id = auth.uid()
    OR thread_id LIKE '%' || auth.uid()::text || '%'
    OR EXISTS (
      SELECT 1 FROM public.direct_messages m
      WHERE m.thread_id = direct_messages.thread_id AND m.sender_id = auth.uid()
    )
  );

CREATE POLICY "Users can send their own messages" ON public.direct_messages
  FOR INSERT TO authenticated WITH CHECK (sender_id = auth.uid());

CREATE POLICY "Senders can update their messages" ON public.direct_messages
  FOR UPDATE TO authenticated USING (sender_id = auth.uid()) WITH CHECK (sender_id = auth.uid());

CREATE POLICY "Senders can delete their messages" ON public.direct_messages
  FOR DELETE TO authenticated USING (sender_id = auth.uid());

CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

CREATE TRIGGER update_direct_messages_updated_at
  BEFORE UPDATE ON public.direct_messages
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();