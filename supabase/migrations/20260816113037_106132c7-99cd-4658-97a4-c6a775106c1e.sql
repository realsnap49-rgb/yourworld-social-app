DROP POLICY IF EXISTS "Authenticated users can view profiles for discovery" ON public.profiles;

CREATE OR REPLACE FUNCTION public.search_profiles(search text DEFAULT '')
RETURNS TABLE (id uuid, username text, display_name text, avatar_url text)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT p.id, p.username, p.display_name, p.avatar_url
  FROM public.profiles p
  WHERE auth.uid() IS NOT NULL
    AND p.id <> auth.uid()
    AND (
      coalesce(search, '') = ''
      OR p.username ILIKE '%' || search || '%'
      OR p.display_name ILIKE '%' || search || '%'
    )
  ORDER BY p.display_name
  LIMIT 30
$$;

REVOKE ALL ON FUNCTION public.search_profiles(text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.search_profiles(text) TO authenticated;

DROP POLICY IF EXISTS "Authenticated can read reel files" ON storage.objects;
CREATE POLICY "Owners and viewers can read reel files" ON storage.objects
FOR SELECT TO authenticated
USING (
  bucket_id = 'reels'
  AND (
    owner = auth.uid()
    OR EXISTS (
      SELECT 1 FROM public.posts p
      WHERE p.kind = 'reel'
        AND p.media_url LIKE '%' || storage.objects.name || '%'
    )
  )
);