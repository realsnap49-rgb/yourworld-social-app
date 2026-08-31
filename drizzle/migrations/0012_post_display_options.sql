ALTER TABLE public.posts
  ADD COLUMN IF NOT EXISTS hide_like_count boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS hide_share_count boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS comments_off boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS pinned boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS archived boolean NOT NULL DEFAULT false;