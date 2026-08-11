CREATE SCHEMA IF NOT EXISTS private;
REVOKE ALL ON SCHEMA private FROM PUBLIC, anon, authenticated;
GRANT USAGE ON SCHEMA private TO authenticated, service_role;

CREATE OR REPLACE FUNCTION private.is_thread_member(_thread_id text, _user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $function$
  SELECT _user_id = auth.uid()
     AND EXISTS (
       SELECT 1 FROM public.thread_participants tp
       WHERE tp.thread_id = _thread_id AND tp.user_id = _user_id
     );
$function$;

CREATE OR REPLACE FUNCTION private.shares_thread_with(_other_user uuid)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $function$
  SELECT EXISTS (
    SELECT 1
    FROM public.thread_participants me
    JOIN public.thread_participants them ON them.thread_id = me.thread_id
    WHERE me.user_id = auth.uid()
      AND them.user_id = _other_user
  );
$function$;

REVOKE ALL ON FUNCTION private.is_thread_member(text, uuid) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION private.shares_thread_with(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION private.is_thread_member(text, uuid) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION private.shares_thread_with(uuid) TO authenticated, service_role;

DROP POLICY IF EXISTS "Members can view thread participants" ON public.thread_participants;
CREATE POLICY "Members can view thread participants" ON public.thread_participants
  FOR SELECT TO authenticated
  USING (private.is_thread_member(thread_id, auth.uid()));

DROP POLICY IF EXISTS "Participants can read thread messages" ON public.direct_messages;
CREATE POLICY "Participants can read thread messages" ON public.direct_messages
  FOR SELECT TO authenticated
  USING ((sender_id = auth.uid()) OR private.is_thread_member(thread_id, auth.uid()));

DROP POLICY IF EXISTS "Users can view profiles of chat contacts" ON public.profiles;
CREATE POLICY "Users can view profiles of chat contacts" ON public.profiles
  FOR SELECT TO authenticated
  USING (private.shares_thread_with(id));

DROP POLICY IF EXISTS "Thread members can read chat files" ON storage.objects;
CREATE POLICY "Thread members can read chat files" ON storage.objects
  FOR SELECT TO authenticated
  USING (
    bucket_id = 'chat-files'
    AND (
      owner = auth.uid()
      OR (storage.foldername(name))[1] = (auth.uid())::text
      OR private.is_thread_member((storage.foldername(name))[2], auth.uid())
    )
  );

DROP FUNCTION IF EXISTS public.is_thread_member(text, uuid);
DROP FUNCTION IF EXISTS public.shares_thread_with(uuid);