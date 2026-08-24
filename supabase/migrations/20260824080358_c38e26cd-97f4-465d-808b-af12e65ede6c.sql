-- Move elevated follow helpers into the private schema; public API wrappers become SECURITY INVOKER.

CREATE OR REPLACE FUNCTION private.get_follow_counts(ids uuid[])
RETURNS TABLE(user_id uuid, followers bigint, following bigint)
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT u AS user_id,
    (SELECT count(*) FROM public.follows f WHERE f.following_id = u) AS followers,
    (SELECT count(*) FROM public.follows f WHERE f.follower_id = u) AS following
  FROM unnest(COALESCE(ids, '{}'::uuid[])) AS u
  WHERE auth.uid() IS NOT NULL
  LIMIT 200
$$;

CREATE OR REPLACE FUNCTION private.list_follows(_user_id uuid, _kind text, _limit integer DEFAULT 500)
RETURNS TABLE(id uuid)
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT CASE WHEN _kind = 'followers' THEN f.follower_id ELSE f.following_id END AS id
  FROM public.follows f
  WHERE auth.uid() IS NOT NULL
    AND _kind IN ('followers', 'following')
    AND ((_kind = 'followers' AND f.following_id = _user_id)
      OR (_kind = 'following' AND f.follower_id = _user_id))
  ORDER BY f.created_at DESC
  LIMIT LEAST(GREATEST(COALESCE(_limit, 500), 1), 500)
$$;

REVOKE ALL ON FUNCTION private.get_follow_counts(uuid[]) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION private.list_follows(uuid, text, integer) FROM PUBLIC, anon, authenticated;

DROP FUNCTION IF EXISTS public.get_follow_counts(uuid[]);
DROP FUNCTION IF EXISTS public.list_follows(uuid, text, integer);

CREATE OR REPLACE FUNCTION public.get_follow_counts(ids uuid[])
RETURNS TABLE(user_id uuid, followers bigint, following bigint)
LANGUAGE sql
STABLE
SET search_path TO 'public', 'private'
AS $$ SELECT * FROM private.get_follow_counts(ids) $$;

CREATE OR REPLACE FUNCTION public.list_follows(_user_id uuid, _kind text, _limit integer DEFAULT 500)
RETURNS TABLE(id uuid)
LANGUAGE sql
STABLE
SET search_path TO 'public', 'private'
AS $$ SELECT * FROM private.list_follows(_user_id, _kind, _limit) $$;

REVOKE ALL ON FUNCTION public.get_follow_counts(uuid[]) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.list_follows(uuid, text, integer) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_follow_counts(uuid[]) TO authenticated;
GRANT EXECUTE ON FUNCTION public.list_follows(uuid, text, integer) TO authenticated;