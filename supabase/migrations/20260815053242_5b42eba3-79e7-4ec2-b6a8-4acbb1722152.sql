DROP POLICY IF EXISTS "Authenticated can read reel files" ON storage.objects;
CREATE POLICY "Authenticated can read reel files" ON storage.objects
  FOR SELECT TO authenticated
  USING (bucket_id = 'reels');

DROP POLICY IF EXISTS "Users can upload their own reel files" ON storage.objects;
CREATE POLICY "Users can upload their own reel files" ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'reels' AND (storage.foldername(name))[1] = (auth.uid())::text);

DROP POLICY IF EXISTS "Users can delete their own reel files" ON storage.objects;
CREATE POLICY "Users can delete their own reel files" ON storage.objects
  FOR DELETE TO authenticated
  USING (bucket_id = 'reels' AND (storage.foldername(name))[1] = (auth.uid())::text);