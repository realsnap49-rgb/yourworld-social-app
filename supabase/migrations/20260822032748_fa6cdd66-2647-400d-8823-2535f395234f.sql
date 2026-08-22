-- 1. Avatars: only well-formed per-user avatar objects are readable
DROP POLICY IF EXISTS "avatars_read_authenticated" ON storage.objects;
CREATE POLICY "avatars_read_authenticated"
ON storage.objects FOR SELECT TO authenticated
USING (
  bucket_id = 'avatars'
  AND array_length(storage.foldername(name), 1) >= 1
  AND (storage.foldername(name))[1] ~ '^[0-9a-fA-F-]{36}$'
);

-- 2. Reels: exact path match instead of LIKE substring match
DROP POLICY IF EXISTS "Owners and viewers can read reel files" ON storage.objects;
CREATE POLICY "Owners and viewers can read reel files"
ON storage.objects FOR SELECT TO authenticated
USING (
  bucket_id = 'reels'
  AND (
    owner = auth.uid()
    OR (storage.foldername(name))[1] = (auth.uid())::text
    OR EXISTS (
      SELECT 1 FROM public.posts p
      WHERE p.kind = 'reel'
        AND (
          p.media_url = objects.name
          OR split_part(split_part(p.media_url, '/reels/', 2), '?', 1) = objects.name
        )
        AND (
          p.audience = 'everyone'
          OR p.user_id = auth.uid()
          OR auth.uid() = ANY (p.viewer_user_ids)
        )
    )
  )
);

-- 3. Posts: remove the blanket read policy and scope visibility policy to authenticated
DROP POLICY IF EXISTS "Authenticated can read posts" ON public.posts;
DROP POLICY IF EXISTS "posts_visibility_read" ON public.posts;
CREATE POLICY "posts_visibility_read"
ON public.posts FOR SELECT TO authenticated
USING (
  audience = 'everyone'
  OR auth.uid() = user_id
  OR auth.uid() = ANY (viewer_user_ids)
);