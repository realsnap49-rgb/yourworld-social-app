DROP POLICY IF EXISTS "Users can join only their own or new threads" ON public.thread_participants;

CREATE POLICY "Users can join only their own threads"
ON public.thread_participants
FOR INSERT
TO authenticated
WITH CHECK (
  user_id = auth.uid()
  AND (
    thread_id = (auth.uid())::text
    OR private.is_thread_member(thread_id, auth.uid())
  )
);