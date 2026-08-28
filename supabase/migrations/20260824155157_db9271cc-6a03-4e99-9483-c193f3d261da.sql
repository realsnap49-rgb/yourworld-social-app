DROP POLICY IF EXISTS "moment media read allowed viewers" ON storage.objects;

CREATE POLICY "moment media read allowed viewers"
ON storage.objects
FOR SELECT
TO authenticated
USING (
  bucket_id = 'moments'
  AND (
    (storage.foldername(name))[1] = auth.uid()::text
    OR EXISTS (
      SELECT 1
      FROM public.moments m
      WHERE (
          m.media_url = name
          OR m.payload ->> 'musicUrl' = name
        )
        AND m.archived = false
        AND m.expires_at > now()
        AND (
          m.privacy = 'everyone'
          OR (
            m.privacy IN ('followers', 'close')
            AND EXISTS (
              SELECT 1 FROM public.follows f
              WHERE f.following_id = m.user_id
                AND f.follower_id = auth.uid()
            )
          )
        )
    )
  )
);