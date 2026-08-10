-- 1) Lock down SECURITY DEFINER / internal functions from direct calls by clients
REVOKE ALL ON FUNCTION public.handle_new_user() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.add_thread_participant() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.update_updated_at_column() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.is_thread_member(text, uuid) FROM PUBLIC, anon;

-- 2) Helper: do two users share a chat thread?
CREATE OR REPLACE FUNCTION public.shares_thread_with(_other_user uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.thread_participants me
    JOIN public.thread_participants them ON them.thread_id = me.thread_id
    WHERE me.user_id = auth.uid()
      AND them.user_id = _other_user
  );
$$;

REVOKE ALL ON FUNCTION public.shares_thread_with(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.shares_thread_with(uuid) TO authenticated;

-- 3) Restrict profile visibility
DROP POLICY IF EXISTS "Profiles are viewable by authenticated users" ON public.profiles;

CREATE POLICY "Users can view their own profile"
ON public.profiles
FOR SELECT
TO authenticated
USING (auth.uid() = id);

CREATE POLICY "Users can view profiles of chat contacts"
ON public.profiles
FOR SELECT
TO authenticated
USING (public.shares_thread_with(id));