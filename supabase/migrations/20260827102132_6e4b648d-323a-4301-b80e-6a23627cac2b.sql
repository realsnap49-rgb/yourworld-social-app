CREATE POLICY "posts_public_read" ON public.posts FOR SELECT TO anon USING (audience = 'everyone');
CREATE POLICY "profiles_public_read" ON public.profiles FOR SELECT TO anon USING (true);
CREATE POLICY "post_likes_public_read" ON public.post_likes FOR SELECT TO anon USING (public.can_view_post(post_id));
CREATE POLICY "post_comments_public_read" ON public.post_comments FOR SELECT TO anon USING (public.can_view_post(post_id));