-- 1. Replace the publicly executable SECURITY DEFINER view counter with a
--    write-only view log plus a trigger (triggers are not API-callable).
DROP FUNCTION IF EXISTS public.increment_post_views(uuid);

CREATE TABLE IF NOT EXISTS public.post_views (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  post_id uuid NOT NULL REFERENCES public.posts(id) ON DELETE CASCADE,
  viewer_id uuid,
  created_at timestamptz NOT NULL DEFAULT now()
);

GRANT INSERT ON public.post_views TO anon, authenticated;
GRANT ALL ON public.post_views TO service_role;

ALTER TABLE public.post_views ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can log a view for themselves"
  ON public.post_views FOR INSERT
  TO anon, authenticated
  WITH CHECK (viewer_id IS NOT DISTINCT FROM auth.uid());

CREATE POLICY "Post owners can read their view log"
  ON public.post_views FOR SELECT
  TO authenticated
  USING (EXISTS (SELECT 1 FROM public.posts p WHERE p.id = post_id AND p.user_id = auth.uid()));

CREATE OR REPLACE FUNCTION public.bump_post_views()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE public.posts SET views = views + 1 WHERE id = NEW.post_id;
  RETURN NEW;
END;
$$;

REVOKE ALL ON FUNCTION public.bump_post_views() FROM PUBLIC, anon, authenticated;

DROP TRIGGER IF EXISTS post_views_bump ON public.post_views;
CREATE TRIGGER post_views_bump
AFTER INSERT ON public.post_views
FOR EACH ROW EXECUTE FUNCTION public.bump_post_views();

-- 2. Re-assert strict scoping of the helper functions used by the
--    thread_participants and orbit media access policies.
CREATE OR REPLACE FUNCTION private.is_thread_member(_thread_id text, _user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT _user_id IS NOT NULL
     AND _user_id = auth.uid()
     AND EXISTS (
       SELECT 1 FROM public.thread_participants tp
       WHERE tp.thread_id = _thread_id
         AND tp.user_id = auth.uid()
     );
$$;

CREATE OR REPLACE FUNCTION private.orbit_is_matched(_a uuid, _b uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT _a IS NOT NULL AND _b IS NOT NULL AND (
    _a = _b OR EXISTS (
      SELECT 1 FROM public.orbit_connections c
      WHERE c.status = 'accepted'
        AND ((c.requester_id = _a AND c.addressee_id = _b)
          OR (c.requester_id = _b AND c.addressee_id = _a))
    )
  );
$$;