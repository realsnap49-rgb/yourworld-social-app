CREATE OR REPLACE FUNCTION private.burn_view_once(_msg_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, private
AS $$
DECLARE
  _message public.direct_messages%ROWTYPE;
BEGIN
  SELECT * INTO _message
  FROM public.direct_messages
  WHERE id = _msg_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RETURN;
  END IF;

  IF _message.media_type <> 'image_once' THEN
    RAISE EXCEPTION 'message is not view once';
  END IF;

  IF _message.sender_id = auth.uid() THEN
    RAISE EXCEPTION 'sender cannot open view once media';
  END IF;

  IF NOT private.is_thread_member(_message.thread_id, auth.uid()) THEN
    RAISE EXCEPTION 'not allowed';
  END IF;

  DELETE FROM public.direct_messages WHERE id = _msg_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.burn_view_once(_msg_id uuid)
RETURNS void
LANGUAGE sql
SECURITY DEFINER
SET search_path = public, private
AS $$
  SELECT private.burn_view_once(_msg_id);
$$;

REVOKE ALL ON FUNCTION public.burn_view_once(uuid) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.burn_view_once(uuid) FROM anon;
GRANT EXECUTE ON FUNCTION public.burn_view_once(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.burn_view_once(uuid) TO service_role;