CREATE OR REPLACE FUNCTION public.guard_direct_message_update()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public, private
AS $$
BEGIN
  IF auth.uid() IS NULL THEN
    RETURN NEW;
  END IF;

  IF NEW.id IS DISTINCT FROM OLD.id
     OR NEW.thread_id IS DISTINCT FROM OLD.thread_id
     OR NEW.sender_id IS DISTINCT FROM OLD.sender_id
     OR NEW.created_at IS DISTINCT FROM OLD.created_at THEN
    RAISE EXCEPTION 'Message identity cannot be changed';
  END IF;

  IF OLD.sender_id = auth.uid() THEN
    -- Sender may only edit the text body.
    IF NEW.media_url IS DISTINCT FROM OLD.media_url
       OR NEW.media_type IS DISTINCT FROM OLD.media_type
       OR NEW.is_read IS DISTINCT FROM OLD.is_read THEN
      RAISE EXCEPTION 'Senders may only edit message text';
    END IF;
  ELSE
    -- Recipients may only flip the read receipt to true.
    IF NEW.content IS DISTINCT FROM OLD.content
       OR NEW.media_url IS DISTINCT FROM OLD.media_url
       OR NEW.media_type IS DISTINCT FROM OLD.media_type THEN
      RAISE EXCEPTION 'Recipients may only mark messages as read';
    END IF;
    IF NEW.is_read IS DISTINCT FROM OLD.is_read AND NEW.is_read IS NOT TRUE THEN
      RAISE EXCEPTION 'Read receipts cannot be unset';
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS guard_direct_message_update_trg ON public.direct_messages;
CREATE TRIGGER guard_direct_message_update_trg
BEFORE UPDATE ON public.direct_messages
FOR EACH ROW EXECUTE FUNCTION public.guard_direct_message_update();

DROP POLICY IF EXISTS "Recipients can mark messages read" ON public.direct_messages;
CREATE POLICY "Recipients can mark messages read"
ON public.direct_messages
FOR UPDATE
TO authenticated
USING (sender_id <> auth.uid() AND private.is_thread_member(thread_id, auth.uid()))
WITH CHECK (sender_id <> auth.uid() AND private.is_thread_member(thread_id, auth.uid()));

DROP POLICY IF EXISTS "Participants can leave threads" ON public.thread_participants;
CREATE POLICY "Participants can leave threads"
ON public.thread_participants
FOR DELETE
TO authenticated
USING (user_id = auth.uid());

GRANT DELETE ON public.thread_participants TO authenticated;