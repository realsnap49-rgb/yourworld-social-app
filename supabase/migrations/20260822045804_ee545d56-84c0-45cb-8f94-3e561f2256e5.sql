DROP POLICY IF EXISTS "Recipients can burn view once messages" ON public.direct_messages;

CREATE POLICY "Recipients can burn view once messages"
ON public.direct_messages
FOR DELETE
TO authenticated
USING (
  media_type = 'image_once'
  AND sender_id <> auth.uid()
  AND private.is_thread_member(thread_id, auth.uid())
);

CREATE OR REPLACE FUNCTION public.burn_view_once(_msg_id uuid)
RETURNS void
LANGUAGE sql
SECURITY INVOKER
SET search_path = public, private
AS $$
  DELETE FROM public.direct_messages
  WHERE id = _msg_id
    AND media_type = 'image_once'
    AND sender_id <> auth.uid();
$$;

REVOKE ALL ON FUNCTION public.burn_view_once(uuid) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.burn_view_once(uuid) FROM anon;
GRANT EXECUTE ON FUNCTION public.burn_view_once(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.burn_view_once(uuid) TO service_role;