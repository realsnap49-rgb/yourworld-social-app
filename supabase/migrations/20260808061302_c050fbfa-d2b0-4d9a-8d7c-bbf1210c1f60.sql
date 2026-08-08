CREATE TABLE IF NOT EXISTS public.thread_participants (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  thread_id text NOT NULL,
  user_id uuid NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (thread_id, user_id)
);

GRANT SELECT, INSERT ON public.thread_participants TO authenticated;
GRANT ALL ON public.thread_participants TO service_role;

ALTER TABLE public.thread_participants ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.is_thread_member(_thread_id text, _user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.thread_participants tp
    WHERE tp.thread_id = _thread_id AND tp.user_id = _user_id
  );
$$;

CREATE POLICY "Members can view thread participants"
ON public.thread_participants FOR SELECT TO authenticated
USING (public.is_thread_member(thread_id, auth.uid()));

CREATE POLICY "Users can join a thread as themselves"
ON public.thread_participants FOR INSERT TO authenticated
WITH CHECK (user_id = auth.uid());

INSERT INTO public.thread_participants (thread_id, user_id)
SELECT DISTINCT thread_id, sender_id FROM public.direct_messages
ON CONFLICT DO NOTHING;

CREATE OR REPLACE FUNCTION public.add_thread_participant()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.thread_participants (thread_id, user_id)
  VALUES (NEW.thread_id, NEW.sender_id)
  ON CONFLICT DO NOTHING;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS direct_messages_add_participant ON public.direct_messages;
CREATE TRIGGER direct_messages_add_participant
AFTER INSERT ON public.direct_messages
FOR EACH ROW EXECUTE FUNCTION public.add_thread_participant();

DROP POLICY IF EXISTS "Participants can read thread messages" ON public.direct_messages;
CREATE POLICY "Participants can read thread messages"
ON public.direct_messages FOR SELECT TO authenticated
USING (sender_id = auth.uid() OR public.is_thread_member(thread_id, auth.uid()));

DROP POLICY IF EXISTS "Authenticated can read chat files" ON storage.objects;
CREATE POLICY "Thread members can read chat files"
ON storage.objects FOR SELECT TO authenticated
USING (
  bucket_id = 'chat-files'
  AND (
    owner = auth.uid()
    OR (storage.foldername(name))[1] = auth.uid()::text
    OR public.is_thread_member((storage.foldername(name))[2], auth.uid())
  )
);