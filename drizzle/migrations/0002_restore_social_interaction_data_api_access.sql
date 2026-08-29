GRANT SELECT, INSERT, DELETE ON public.post_likes TO authenticated;
GRANT SELECT ON public.post_likes TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.post_comments TO authenticated;
GRANT SELECT ON public.post_comments TO anon;
GRANT SELECT, INSERT, DELETE ON public.post_saves TO authenticated;
GRANT SELECT, INSERT, DELETE ON public.follows TO authenticated;
GRANT SELECT, INSERT, DELETE ON public.orbit_likes TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.orbit_connections TO authenticated;
GRANT ALL ON public.post_likes, public.post_comments, public.post_saves, public.follows, public.orbit_likes, public.orbit_connections TO service_role;

DROP POLICY IF EXISTS "Read likes on viewable posts" ON public.post_likes;
CREATE POLICY "Read likes on viewable posts"
ON public.post_likes FOR SELECT TO authenticated
USING (EXISTS (
  SELECT 1 FROM public.posts p
  WHERE p.id = post_likes.post_id
    AND (p.audience = 'everyone' OR p.user_id = auth.uid() OR auth.uid() = ANY(p.viewer_user_ids))
));

DROP POLICY IF EXISTS "post_likes_public_read" ON public.post_likes;
CREATE POLICY "post_likes_public_read"
ON public.post_likes FOR SELECT TO anon
USING (EXISTS (
  SELECT 1 FROM public.posts p
  WHERE p.id = post_likes.post_id AND p.audience = 'everyone'
));

DROP POLICY IF EXISTS "Read comments on viewable posts" ON public.post_comments;
CREATE POLICY "Read comments on viewable posts"
ON public.post_comments FOR SELECT TO authenticated
USING (EXISTS (
  SELECT 1 FROM public.posts p
  WHERE p.id = post_comments.post_id
    AND (p.audience = 'everyone' OR p.user_id = auth.uid() OR auth.uid() = ANY(p.viewer_user_ids))
));

DROP POLICY IF EXISTS "post_comments_public_read" ON public.post_comments;
CREATE POLICY "post_comments_public_read"
ON public.post_comments FOR SELECT TO anon
USING (EXISTS (
  SELECT 1 FROM public.posts p
  WHERE p.id = post_comments.post_id AND p.audience = 'everyone'
));