-- Can the current user view a given post?
CREATE OR REPLACE FUNCTION public.can_view_post(_post_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.posts p
    WHERE p.id = _post_id
      AND (p.audience = 'everyone' OR p.user_id = auth.uid() OR auth.uid() = ANY (p.viewer_user_ids))
  )
$$;

REVOKE ALL ON FUNCTION public.can_view_post(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.can_view_post(uuid) TO authenticated;

-- post_comments: only on viewable posts
DROP POLICY IF EXISTS "Authenticated can read comments" ON public.post_comments;
CREATE POLICY "Read comments on viewable posts"
ON public.post_comments FOR SELECT TO authenticated
USING (public.can_view_post(post_id));

-- post_likes: only on viewable posts
DROP POLICY IF EXISTS "Authenticated can read likes" ON public.post_likes;
CREATE POLICY "Read likes on viewable posts"
ON public.post_likes FOR SELECT TO authenticated
USING (public.can_view_post(post_id));

-- follows: direct reads limited to rows involving the requester
DROP POLICY IF EXISTS "Authenticated can read follows" ON public.follows;
CREATE POLICY "Read own follow relationships"
ON public.follows FOR SELECT TO authenticated
USING (auth.uid() = follower_id OR auth.uid() = following_id);

-- Counts stay available for any profile via a definer helper
CREATE OR REPLACE FUNCTION public.get_follow_counts(ids uuid[])
RETURNS TABLE(user_id uuid, followers bigint, following bigint)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT u AS user_id,
    (SELECT count(*) FROM public.follows f WHERE f.following_id = u) AS followers,
    (SELECT count(*) FROM public.follows f WHERE f.follower_id = u) AS following
  FROM unnest(ids) AS u
$$;

REVOKE ALL ON FUNCTION public.get_follow_counts(uuid[]) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_follow_counts(uuid[]) TO authenticated;

-- Follower / following lists via a definer helper (ids only, capped)
CREATE OR REPLACE FUNCTION public.list_follows(_user_id uuid, _kind text, _limit int DEFAULT 500)
RETURNS TABLE(id uuid)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT CASE WHEN _kind = 'followers' THEN f.follower_id ELSE f.following_id END AS id
  FROM public.follows f
  WHERE (_kind = 'followers' AND f.following_id = _user_id)
     OR (_kind = 'following' AND f.follower_id = _user_id)
  ORDER BY f.created_at DESC
  LIMIT LEAST(GREATEST(COALESCE(_limit, 500), 1), 500)
$$;

REVOKE ALL ON FUNCTION public.list_follows(uuid, text, int) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.list_follows(uuid, text, int) TO authenticated;