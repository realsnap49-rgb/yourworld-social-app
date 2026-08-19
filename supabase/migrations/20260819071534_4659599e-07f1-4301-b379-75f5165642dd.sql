CREATE OR REPLACE FUNCTION private.burn_view_once(_msg_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, private
AS $$
DECLARE
  _tid text;
BEGIN
  SELECT thread_id INTO _tid FROM public.direct_messages WHERE id = _msg_id;
  IF _tid IS NULL THEN RETURN; END IF;
  IF NOT private.is_thread_member(_tid, auth.uid())
     AND NOT EXISTS (SELECT 1 FROM public.direct_messages WHERE id = _msg_id AND sender_id = auth.uid())
  THEN
    RAISE EXCEPTION 'not allowed';
  END IF;
  UPDATE public.direct_messages
     SET media_url = NULL, media_type = 'image_once_opened', content = ''
   WHERE id = _msg_id;
END;
$$;

REVOKE ALL ON FUNCTION private.burn_view_once(uuid) FROM PUBLIC;

CREATE OR REPLACE FUNCTION public.burn_view_once(_msg_id uuid)
RETURNS void
LANGUAGE sql
SECURITY INVOKER
SET search_path = public, private
AS $$ SELECT private.burn_view_once(_msg_id); $$;

REVOKE ALL ON FUNCTION public.burn_view_once(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.burn_view_once(uuid) TO authenticated;