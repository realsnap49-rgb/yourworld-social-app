ALTER TABLE public.copyright_reports
  ADD COLUMN IF NOT EXISTS reporter_full_name text,
  ADD COLUMN IF NOT EXISTS reporter_flagged boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS resolved_at timestamptz;

DROP POLICY IF EXISTS "Admins can update copyright reports" ON public.copyright_reports;
CREATE POLICY "Admins can update copyright reports"
ON public.copyright_reports
FOR UPDATE
TO authenticated
USING (public.has_role(auth.uid(), 'admin'))
WITH CHECK (public.has_role(auth.uid(), 'admin'));

DROP POLICY IF EXISTS "Admins can delete posts" ON public.posts;
CREATE POLICY "Admins can delete posts"
ON public.posts
FOR DELETE
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

DROP POLICY IF EXISTS "Admins can delete moments" ON public.moments;
CREATE POLICY "Admins can delete moments"
ON public.moments
FOR DELETE
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

DROP POLICY IF EXISTS "Users can read own roles" ON public.user_roles;
CREATE POLICY "Users can read own roles"
ON public.user_roles
FOR SELECT
TO authenticated
USING (auth.uid() = user_id);
