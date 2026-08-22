DROP POLICY IF EXISTS "Orbit media readable by authenticated" ON storage.objects;

CREATE POLICY "Orbit media readable by owner or matched"
ON storage.objects FOR SELECT TO authenticated
USING (
  bucket_id = 'orbit-media'
  AND (storage.foldername(name))[1] ~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
  AND (
    (storage.foldername(name))[1] = auth.uid()::text
    OR private.orbit_is_matched(auth.uid(), ((storage.foldername(name))[1])::uuid)
    OR EXISTS (
      SELECT 1 FROM public.orbit_profiles op
      WHERE op.user_id = ((storage.foldername(name))[1])::uuid
        AND op.original_photo_privacy = 'everyone'
        AND op.orbit_enabled
        AND op.visible
    )
  )
);