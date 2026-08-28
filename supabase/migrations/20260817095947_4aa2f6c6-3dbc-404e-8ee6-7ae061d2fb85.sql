CREATE SCHEMA IF NOT EXISTS private;

CREATE OR REPLACE FUNCTION private.search_profiles(search text DEFAULT ''::text)
RETURNS TABLE(id uuid, username text, display_name text, avatar_url text)
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT p.id, p.username, p.display_name, p.avatar_url
  FROM public.profiles p
  WHERE auth.uid() IS NOT NULL
    AND p.id <> auth.uid()
    AND (
      coalesce(search, '') = ''
      OR p.username ILIKE '%' || search || '%'
      OR p.display_name ILIKE '%' || search || '%'
    )
  ORDER BY p.display_name
  LIMIT 30
$$;

CREATE OR REPLACE FUNCTION private.get_public_profiles(ids uuid[])
RETURNS TABLE(id uuid, username text, display_name text, avatar_url text)
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT p.id, p.username, p.display_name, p.avatar_url
  FROM public.profiles p
  WHERE auth.uid() IS NOT NULL
    AND p.id = ANY(ids)
  LIMIT 200
$$;

DROP FUNCTION IF EXISTS public.search_profiles(text);
DROP FUNCTION IF EXISTS public.get_public_profiles(uuid[]);

CREATE OR REPLACE FUNCTION public.search_profiles(search text DEFAULT ''::text)
RETURNS TABLE(id uuid, username text, display_name text, avatar_url text)
LANGUAGE sql
STABLE SECURITY INVOKER
SET search_path TO 'public'
AS $$
  SELECT * FROM private.search_profiles(search)
$$;

CREATE OR REPLACE FUNCTION public.get_public_profiles(ids uuid[])
RETURNS TABLE(id uuid, username text, display_name text, avatar_url text)
LANGUAGE sql
STABLE SECURITY INVOKER
SET search_path TO 'public'
AS $$
  SELECT * FROM private.get_public_profiles(ids)
$$;

REVOKE ALL ON FUNCTION private.search_profiles(text) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION private.get_public_profiles(uuid[]) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.search_profiles(text) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.get_public_profiles(uuid[]) FROM PUBLIC, anon;

GRANT USAGE ON SCHEMA private TO authenticated;
GRANT EXECUTE ON FUNCTION private.search_profiles(text) TO authenticated;
GRANT EXECUTE ON FUNCTION private.get_public_profiles(uuid[]) TO authenticated;
GRANT EXECUTE ON FUNCTION public.search_profiles(text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_public_profiles(uuid[]) TO authenticated;