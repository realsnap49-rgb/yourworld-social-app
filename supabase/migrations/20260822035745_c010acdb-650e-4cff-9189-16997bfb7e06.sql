-- Privacy-aware Orbit discovery ------------------------------------------------

CREATE SCHEMA IF NOT EXISTS private;

-- Are two users matched (accepted connection either direction)?
CREATE OR REPLACE FUNCTION private.orbit_is_matched(_a uuid, _b uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT _a = _b OR EXISTS (
    SELECT 1 FROM public.orbit_connections c
    WHERE c.status = 'accepted'
      AND ((c.requester_id = _a AND c.addressee_id = _b)
        OR (c.requester_id = _b AND c.addressee_id = _a))
  );
$$;

-- Strip original ("real") photos unless the viewer is allowed to see them.
CREATE OR REPLACE FUNCTION private.orbit_visible_photos(_photos jsonb, _privacy text, _allowed boolean)
RETURNS jsonb
LANGUAGE sql
IMMUTABLE
AS $$
  SELECT CASE
    WHEN _allowed OR _privacy = 'everyone' THEN COALESCE(_photos, '[]'::jsonb)
    ELSE COALESCE(
      (SELECT jsonb_agg(p) FROM jsonb_array_elements(COALESCE(_photos, '[]'::jsonb)) p
        WHERE COALESCE(p ->> 'style', 'real') <> 'real'),
      '[]'::jsonb)
  END;
$$;

CREATE OR REPLACE FUNCTION private.discover_orbit_profiles(_ids uuid[] DEFAULT NULL)
RETURNS TABLE(
  user_id uuid, name text, age integer, country text, state text, city text,
  about text, hobbies text[], looking_for text, gender text, photos jsonb,
  original_photo_privacy text, mood text, orbit_enabled boolean, visible boolean,
  updated_at timestamptz
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    p.user_id, p.name, p.age, p.country, p.state, p.city, p.about, p.hobbies,
    p.looking_for, p.gender,
    private.orbit_visible_photos(
      p.photos, p.original_photo_privacy,
      private.orbit_is_matched(auth.uid(), p.user_id)
    ) AS photos,
    p.original_photo_privacy, p.mood, p.orbit_enabled, p.visible, p.updated_at
  FROM public.orbit_profiles p
  WHERE auth.uid() IS NOT NULL
    AND (p.orbit_enabled AND p.visible OR p.user_id = auth.uid())
    AND (_ids IS NULL OR p.user_id = ANY(_ids))
  ORDER BY p.updated_at DESC
  LIMIT 100;
$$;

CREATE OR REPLACE FUNCTION public.discover_orbit_profiles(ids uuid[] DEFAULT NULL)
RETURNS TABLE(
  user_id uuid, name text, age integer, country text, state text, city text,
  about text, hobbies text[], looking_for text, gender text, photos jsonb,
  original_photo_privacy text, mood text, orbit_enabled boolean, visible boolean,
  updated_at timestamptz
)
LANGUAGE sql
STABLE
SET search_path = public, private
AS $$ SELECT * FROM private.discover_orbit_profiles(ids) $$;

REVOKE ALL ON FUNCTION public.discover_orbit_profiles(uuid[]) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.discover_orbit_profiles(uuid[]) TO authenticated;

-- Direct table reads no longer expose everyone's photos.
DROP POLICY IF EXISTS "Discover visible orbit profiles" ON public.orbit_profiles;

CREATE POLICY "Matched connections can read orbit profiles"
ON public.orbit_profiles
FOR SELECT
TO authenticated
USING (
  auth.uid() = user_id
  OR (orbit_enabled AND visible AND private.orbit_is_matched(auth.uid(), user_id))
);