CREATE TABLE public.orbit_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  sender_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  recipient_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  kind text NOT NULL DEFAULT 'text' CHECK (kind IN ('text','photo','video','audio','system')),
  text text,
  url text,
  view_once boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX orbit_messages_pair_idx ON public.orbit_messages (sender_id, recipient_id, created_at);
CREATE INDEX orbit_messages_recipient_idx ON public.orbit_messages (recipient_id, created_at);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.orbit_messages TO authenticated;
GRANT ALL ON public.orbit_messages TO service_role;

ALTER TABLE public.orbit_messages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Participants can read orbit messages"
ON public.orbit_messages FOR SELECT TO authenticated
USING (auth.uid() = sender_id OR auth.uid() = recipient_id);

CREATE POLICY "Users send their own orbit messages"
ON public.orbit_messages FOR INSERT TO authenticated
WITH CHECK (auth.uid() = sender_id AND sender_id <> recipient_id);

CREATE POLICY "Senders update their own orbit messages"
ON public.orbit_messages FOR UPDATE TO authenticated
USING (auth.uid() = sender_id) WITH CHECK (auth.uid() = sender_id);

CREATE POLICY "Participants delete orbit messages"
ON public.orbit_messages FOR DELETE TO authenticated
USING (auth.uid() = sender_id OR (auth.uid() = recipient_id AND view_once));

CREATE TRIGGER update_orbit_messages_updated_at
BEFORE UPDATE ON public.orbit_messages
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

ALTER TABLE public.orbit_messages REPLICA IDENTITY FULL;
ALTER PUBLICATION supabase_realtime ADD TABLE public.orbit_messages;