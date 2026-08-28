DROP POLICY IF EXISTS "Users can join a thread as themselves" ON public.thread_participants;

CREATE POLICY "Users can join only their own or new threads"
ON public.thread_participants
FOR INSERT
TO authenticated
WITH CHECK (
  user_id = auth.uid()
  AND (
    -- your own personal thread anchor
    thread_id = auth.uid()::text
    -- brand new thread with no participants yet
    OR NOT EXISTS (
      SELECT 1 FROM public.thread_participants tp
      WHERE tp.thread_id = thread_participants.thread_id
    )
    -- already a member (idempotent re-join)
    OR private.is_thread_member(thread_id, auth.uid())
  )
);