DROP POLICY IF EXISTS "avatars_read_authenticated" ON storage.objects;

CREATE POLICY "avatars_read_authenticated"
  ON storage.objects
  FOR SELECT
  TO authenticated
  USING (
    bucket_id = 'avatars'
    AND (
      (storage.foldername(name))[1] = auth.uid()::text
      OR EXISTS (
        SELECT 1 FROM public.profiles p
        WHERE p.avatar_url IS NOT NULL
          AND (
            p.avatar_url = storage.objects.name
            OR p.avatar_url LIKE '%/avatars/' || storage.objects.name
            OR p.avatar_url LIKE '%/avatars/' || storage.objects.name || '?%'
          )
      )
    )
  );