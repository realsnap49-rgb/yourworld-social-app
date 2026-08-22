CREATE TABLE public.follows (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  follower_id uuid NOT NULL,
  following_id uuid NOT NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  UNIQUE (follower_id, following_id),
  CHECK (follower_id <> following_id)
);

CREATE INDEX follows_follower_idx ON public.follows (follower_id);
CREATE INDEX follows_following_idx ON public.follows (following_id);

GRANT SELECT, INSERT, DELETE ON public.follows TO authenticated;
GRANT ALL ON public.follows TO service_role;

ALTER TABLE public.follows ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated can read follows"
  ON public.follows FOR SELECT TO authenticated USING (true);

CREATE POLICY "Users can follow as themselves"
  ON public.follows FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = follower_id AND follower_id <> following_id);

CREATE POLICY "Users can unfollow themselves"
  ON public.follows FOR DELETE TO authenticated USING (auth.uid() = follower_id);

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