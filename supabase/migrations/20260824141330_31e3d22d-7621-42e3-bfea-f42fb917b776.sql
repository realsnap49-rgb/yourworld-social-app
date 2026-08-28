CREATE TABLE public.moments (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  kind text not null default 'photo',
  media_url text,
  media_type text,
  text text not null default '',
  text_bg text not null default '',
  payload jsonb not null default '{}'::jsonb,
  privacy text not null default 'everyone',
  duration integer not null default 24,
  allow_download boolean not null default true,
  screenshot_alert boolean not null default false,
  poll jsonb,
  archived boolean not null default false,
  created_at timestamptz not null default now(),
  expires_at timestamptz not null default now() + interval '24 hours'
);

CREATE TABLE public.moment_views (
  moment_id uuid not null references public.moments(id) on delete cascade,
  viewer_id uuid not null references auth.users(id) on delete cascade,
  liked boolean not null default false,
  screenshot boolean not null default false,
  created_at timestamptz not null default now(),
  primary key (moment_id, viewer_id)
);

CREATE TABLE public.moment_replies (
  id uuid primary key default gen_random_uuid(),
  moment_id uuid not null references public.moments(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  text text not null,
  created_at timestamptz not null default now()
);

CREATE INDEX moments_user_created_idx ON public.moments (user_id, created_at DESC);
CREATE INDEX moments_expiry_idx ON public.moments (expires_at DESC);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.moments TO authenticated;
GRANT ALL ON public.moments TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.moment_views TO authenticated;
GRANT ALL ON public.moment_views TO service_role;
GRANT SELECT, INSERT, DELETE ON public.moment_replies TO authenticated;
GRANT ALL ON public.moment_replies TO service_role;

ALTER TABLE public.moments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.moment_views ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.moment_replies ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.can_view_moment(_moment_id uuid, _viewer uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.moments m
    WHERE m.id = _moment_id
      AND (
        m.user_id = _viewer
        OR (
          m.archived = false
          AND m.expires_at > now()
          AND (
            m.privacy = 'everyone'
            OR (
              m.privacy IN ('followers', 'close')
              AND EXISTS (
                SELECT 1 FROM public.follows f
                WHERE f.following_id = m.user_id AND f.follower_id = _viewer
              )
            )
          )
        )
      )
  )
$$;

REVOKE ALL ON FUNCTION public.can_view_moment(uuid, uuid) FROM PUBLIC, anon, authenticated;

CREATE POLICY "own moments full access" ON public.moments
  FOR ALL TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "live moments visible to allowed viewers" ON public.moments
  FOR SELECT TO authenticated
  USING (
    archived = false
    AND expires_at > now()
    AND (
      privacy = 'everyone'
      OR (
        privacy IN ('followers', 'close')
        AND EXISTS (
          SELECT 1 FROM public.follows f
          WHERE f.following_id = moments.user_id AND f.follower_id = auth.uid()
        )
      )
    )
  );

CREATE POLICY "insert own view" ON public.moment_views
  FOR INSERT TO authenticated
  WITH CHECK (viewer_id = auth.uid() AND public.can_view_moment(moment_id, auth.uid()));

CREATE POLICY "update own view" ON public.moment_views
  FOR UPDATE TO authenticated
  USING (viewer_id = auth.uid())
  WITH CHECK (viewer_id = auth.uid());

CREATE POLICY "views visible to author and viewer" ON public.moment_views
  FOR SELECT TO authenticated
  USING (
    viewer_id = auth.uid()
    OR EXISTS (SELECT 1 FROM public.moments m WHERE m.id = moment_views.moment_id AND m.user_id = auth.uid())
  );

CREATE POLICY "insert own reply" ON public.moment_replies
  FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid() AND public.can_view_moment(moment_id, auth.uid()));

CREATE POLICY "delete own reply" ON public.moment_replies
  FOR DELETE TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "replies visible to author and sender" ON public.moment_replies
  FOR SELECT TO authenticated
  USING (
    user_id = auth.uid()
    OR EXISTS (SELECT 1 FROM public.moments m WHERE m.id = moment_replies.moment_id AND m.user_id = auth.uid())
  );

CREATE POLICY "moment media upload own folder" ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'moments' AND (storage.foldername(name))[1] = auth.uid()::text);

CREATE POLICY "moment media read authenticated" ON storage.objects
  FOR SELECT TO authenticated
  USING (bucket_id = 'moments');

CREATE POLICY "moment media delete own" ON storage.objects
  FOR DELETE TO authenticated
  USING (bucket_id = 'moments' AND (storage.foldername(name))[1] = auth.uid()::text);

ALTER PUBLICATION supabase_realtime ADD TABLE public.moments;
ALTER PUBLICATION supabase_realtime ADD TABLE public.moment_views;
ALTER PUBLICATION supabase_realtime ADD TABLE public.moment_replies;