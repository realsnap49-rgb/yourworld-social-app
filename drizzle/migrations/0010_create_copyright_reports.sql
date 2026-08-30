DO $$ BEGIN
  CREATE TYPE public.app_role AS ENUM ('admin', 'moderator', 'user');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

CREATE TABLE IF NOT EXISTS public.user_roles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  role public.app_role NOT NULL,
  UNIQUE (user_id, role)
);
GRANT SELECT ON public.user_roles TO authenticated;
GRANT ALL ON public.user_roles TO service_role;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role public.app_role)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = _user_id AND role = _role
  )
$$;

CREATE TABLE IF NOT EXISTS public.copyright_reports (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  reporter_user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  reported_post_id uuid REFERENCES public.posts(id) ON DELETE SET NULL,
  reported_moment_id uuid REFERENCES public.moments(id) ON DELETE SET NULL,
  original_work_link text,
  infringing_content_link text,
  reason text,
  contact_email text,
  status text NOT NULL DEFAULT 'pending',
  created_at timestamp with time zone NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT ON public.copyright_reports TO authenticated;
GRANT ALL ON public.copyright_reports TO service_role;
ALTER TABLE public.copyright_reports ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can insert their own copyright reports"
ON public.copyright_reports FOR INSERT TO authenticated
WITH CHECK (auth.uid() = reporter_user_id);

CREATE POLICY "Admins can view copyright reports"
ON public.copyright_reports FOR SELECT TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Reporters can view their own copyright reports"
ON public.copyright_reports FOR SELECT TO authenticated
USING (auth.uid() = reporter_user_id);