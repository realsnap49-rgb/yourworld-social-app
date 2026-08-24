-- 1. Orbit reports: reporters may create and read, never modify or delete
DROP POLICY IF EXISTS "Users manage own Orbit reports" ON public.orbit_reports;

CREATE POLICY "Reporters can file Orbit reports"
ON public.orbit_reports
FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = reporter_id);

CREATE POLICY "Reporters can read their Orbit reports"
ON public.orbit_reports
FOR SELECT
TO authenticated
USING (auth.uid() = reporter_id);

REVOKE UPDATE, DELETE ON public.orbit_reports FROM authenticated;

-- 2. Post views: only signed-in users may log a view, and only as themselves
DROP POLICY IF EXISTS "Anyone can log a view for themselves" ON public.post_views;

CREATE POLICY "Signed-in users can log their own view"
ON public.post_views
FOR INSERT
TO authenticated
WITH CHECK (viewer_id = auth.uid());

REVOKE ALL ON public.post_views FROM anon;

-- 3. can_view_post is only used inside RLS policies; no direct API access needed
REVOKE EXECUTE ON FUNCTION public.can_view_post(uuid) FROM PUBLIC, anon, authenticated;