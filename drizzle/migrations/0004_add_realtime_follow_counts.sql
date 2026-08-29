REVOKE EXECUTE ON FUNCTION public.get_follow_counts(uuid[]) FROM authenticated;

CREATE TABLE public.follow_counts (
  user_id uuid PRIMARY KEY,
  followers bigint NOT NULL DEFAULT 0,
  following bigint NOT NULL DEFAULT 0,
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.follow_counts TO authenticated;
GRANT ALL ON public.follow_counts TO service_role;
ALTER TABLE public.follow_counts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated users read follow counts"
ON public.follow_counts FOR SELECT TO authenticated USING (true);

INSERT INTO public.follow_counts (user_id, followers, following)
SELECT ids.user_id,
       (SELECT count(*) FROM public.follows f WHERE f.following_id = ids.user_id),
       (SELECT count(*) FROM public.follows f WHERE f.follower_id = ids.user_id)
FROM (
  SELECT follower_id AS user_id FROM public.follows
  UNION
  SELECT following_id AS user_id FROM public.follows
) ids;

CREATE OR REPLACE FUNCTION public.sync_follow_counts()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  follower uuid := CASE WHEN TG_OP = 'DELETE' THEN OLD.follower_id ELSE NEW.follower_id END;
  following uuid := CASE WHEN TG_OP = 'DELETE' THEN OLD.following_id ELSE NEW.following_id END;
  delta bigint := CASE WHEN TG_OP = 'DELETE' THEN -1 ELSE 1 END;
BEGIN
  INSERT INTO public.follow_counts (user_id, following)
  VALUES (follower, greatest(delta, 0))
  ON CONFLICT (user_id) DO UPDATE
  SET following = greatest(0, public.follow_counts.following + delta), updated_at = now();

  INSERT INTO public.follow_counts (user_id, followers)
  VALUES (following, greatest(delta, 0))
  ON CONFLICT (user_id) DO UPDATE
  SET followers = greatest(0, public.follow_counts.followers + delta), updated_at = now();
  RETURN COALESCE(NEW, OLD);
END;
$$;
REVOKE ALL ON FUNCTION public.sync_follow_counts() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.sync_follow_counts() TO service_role;

CREATE TRIGGER sync_follow_counts_trg
AFTER INSERT OR DELETE ON public.follows
FOR EACH ROW EXECUTE FUNCTION public.sync_follow_counts();

ALTER PUBLICATION supabase_realtime ADD TABLE public.follow_counts;
ALTER TABLE public.follow_counts REPLICA IDENTITY FULL;