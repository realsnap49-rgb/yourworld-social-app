ALTER TABLE public.posts
  ADD COLUMN IF NOT EXISTS audience text NOT NULL DEFAULT 'everyone',
  ADD COLUMN IF NOT EXISTS tagged_user_ids uuid[] NOT NULL DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS viewer_user_ids uuid[] NOT NULL DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS link text;

DO $$ BEGIN
  ALTER TABLE public.posts ADD CONSTRAINT posts_audience_check CHECK (audience IN ('everyone','close_friends'));
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DROP POLICY IF EXISTS "Posts are viewable by everyone" ON public.posts;
DROP POLICY IF EXISTS "posts_select_public" ON public.posts;
DROP POLICY IF EXISTS "posts_public_read" ON public.posts;

CREATE POLICY "posts_visibility_read" ON public.posts
FOR SELECT
USING (
  audience = 'everyone'
  OR auth.uid() = user_id
  OR (auth.uid() IS NOT NULL AND auth.uid() = ANY (viewer_user_ids))
);