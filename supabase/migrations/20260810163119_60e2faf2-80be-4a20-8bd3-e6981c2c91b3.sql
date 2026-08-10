CREATE OR REPLACE FUNCTION public.is_thread_member(_thread_id text, _user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT _user_id = auth.uid()
     AND EXISTS (
       SELECT 1 FROM public.thread_participants tp
       WHERE tp.thread_id = _thread_id AND tp.user_id = _user_id
     );
$$;