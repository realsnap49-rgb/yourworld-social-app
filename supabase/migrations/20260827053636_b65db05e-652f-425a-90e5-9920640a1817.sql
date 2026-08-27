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
      WHERE p.kind IN ('reel', 'video')
        AND (
          p.media_url = storage.objects.name
          OR split_part(split_part(p.media_url, '/reels/', 2), '?', 1) = storage.objects.name
          OR p.thumbnail_url = storage.objects.name
          OR split_part(split_part(COALESCE(p.thumbnail_url, ''), '/reels/', 2), '?', 1) = storage.objects.name
        )
        AND (
          p.audience = 'everyone'
          OR p.user_id = auth.uid()
          OR auth.uid() = ANY (p.viewer_user_ids)
        )
    )
  )
);