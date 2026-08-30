-- Remove duplicate views: keep only the earliest view row per (post, viewer)
DELETE FROM public.post_views a
USING public.post_views b
WHERE a.post_id = b.post_id
  AND a.viewer_id IS NOT NULL
  AND a.viewer_id = b.viewer_id
  AND a.created_at > b.created_at;

-- One view per user per post, enforced at the database level
CREATE UNIQUE INDEX IF NOT EXISTS post_views_post_viewer_unique
  ON public.post_views (post_id, viewer_id)
  WHERE viewer_id IS NOT NULL;

-- Recalculate post view counters so past duplicate views stop inflating totals
UPDATE public.posts p
SET views = sub.cnt
FROM (
  SELECT post_id, count(*)::int AS cnt
  FROM public.post_views
  GROUP BY post_id
) sub
WHERE p.id = sub.post_id;