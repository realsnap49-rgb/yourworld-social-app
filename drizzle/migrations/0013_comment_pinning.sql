ALTER TABLE public.post_comments
  ADD COLUMN IF NOT EXISTS pinned boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS pinned_at timestamptz;

CREATE INDEX IF NOT EXISTS post_comments_pinned_idx ON public.post_comments (post_id, pinned, pinned_at);

-- Post owner can moderate comments on their own posts.
DROP POLICY IF EXISTS "Post owners can delete comments on their posts" ON public.post_comments;
CREATE POLICY "Post owners can delete comments on their posts"
ON public.post_comments FOR DELETE TO authenticated
USING (EXISTS (SELECT 1 FROM public.posts p WHERE p.id = post_comments.post_id AND p.user_id = auth.uid()));

DROP POLICY IF EXISTS "Post owners can pin comments on their posts" ON public.post_comments;
CREATE POLICY "Post owners can pin comments on their posts"
ON public.post_comments FOR UPDATE TO authenticated
USING (EXISTS (SELECT 1 FROM public.posts p WHERE p.id = post_comments.post_id AND p.user_id = auth.uid()))
WITH CHECK (EXISTS (SELECT 1 FROM public.posts p WHERE p.id = post_comments.post_id AND p.user_id = auth.uid()));

-- Owners may only flip pin state via that policy; body/identity stay immutable for them.
CREATE OR REPLACE FUNCTION public.guard_comment_pin()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
DECLARE
  pins integer;
BEGIN
  IF auth.uid() IS NOT NULL AND OLD.user_id <> auth.uid() THEN
    IF NEW.body IS DISTINCT FROM OLD.body
       OR NEW.user_id IS DISTINCT FROM OLD.user_id
       OR NEW.post_id IS DISTINCT FROM OLD.post_id THEN
      RAISE EXCEPTION 'Post owners may only pin or unpin comments';
    END IF;
  END IF;

  IF NEW.pinned IS TRUE AND OLD.pinned IS DISTINCT FROM TRUE THEN
    SELECT count(*) INTO pins FROM public.post_comments
      WHERE post_id = NEW.post_id AND pinned IS TRUE AND id <> NEW.id;
    IF pins >= 4 THEN
      RAISE EXCEPTION 'Only 4 comments can be pinned per post';
    END IF;
    NEW.pinned_at := now();
  ELSIF NEW.pinned IS NOT TRUE THEN
    NEW.pinned_at := NULL;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS guard_comment_pin_trg ON public.post_comments;
CREATE TRIGGER guard_comment_pin_trg
BEFORE UPDATE ON public.post_comments
FOR EACH ROW EXECUTE FUNCTION public.guard_comment_pin();