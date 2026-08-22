CREATE OR REPLACE FUNCTION public.get_follow_counts(ids uuid[])
RETURNS TABLE(user_id uuid, followers bigint, following bigint)
LANGUAGE sql
STABLE
SECURITY INVOKER
SET search_path = public
AS $$
  SELECT u AS user_id,
    (SELECT count(*) FROM public.follows f WHERE f.following_id = u) AS followers,
    (SELECT count(*) FROM public.follows f WHERE f.follower_id = u) AS following
  FROM unnest(ids) AS u
$$;