ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS gender text;
CREATE UNIQUE INDEX IF NOT EXISTS profiles_username_lower_key ON public.profiles (lower(username));

CREATE OR REPLACE FUNCTION public.is_username_available(_username text)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT NOT EXISTS (
    SELECT 1 FROM public.profiles WHERE lower(username) = lower(trim(_username))
  )
$$;

GRANT EXECUTE ON FUNCTION public.is_username_available(text) TO authenticated, anon;