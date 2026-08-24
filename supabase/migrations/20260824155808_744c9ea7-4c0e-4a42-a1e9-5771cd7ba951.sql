DROP POLICY IF EXISTS "avatars_read_authenticated" ON storage.objects;
DROP FUNCTION IF EXISTS public.is_active_avatar(text);

CREATE OR REPLACE FUNCTION private.is_active_avatar(_object_name text)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.profiles p
    WHERE p.avatar_url IS NOT NULL
      AND (
        p.avatar_url = _object_name
        OR p.avatar_url LIKE '%/avatars/' || _object_name
        OR p.avatar_url LIKE '%/avatars/' || _object_name || '?%'
      )
  )
$$;

REVOKE ALL ON FUNCTION private.is_active_avatar(text) FROM public, anon;
GRANT EXECUTE ON FUNCTION private.is_active_avatar(text) TO authenticated, service_role;

CREATE POLICY "avatars_read_authenticated"
  ON storage.objects
  FOR SELECT
  TO authenticated
  USING (
    bucket_id = 'avatars'
    AND (
      (storage.foldername(name))[1] = auth.uid()::text
      OR private.is_active_avatar(name)
    )
  );