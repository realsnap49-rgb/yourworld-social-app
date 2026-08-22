CREATE OR REPLACE FUNCTION private.orbit_visible_photos(_photos jsonb, _privacy text, _allowed boolean)
RETURNS jsonb
LANGUAGE sql
IMMUTABLE
SET search_path = public
AS $$
  SELECT CASE
    WHEN _allowed OR _privacy = 'everyone' THEN COALESCE(_photos, '[]'::jsonb)
    ELSE COALESCE(
      (SELECT jsonb_agg(p) FROM jsonb_array_elements(COALESCE(_photos, '[]'::jsonb)) p
        WHERE COALESCE(p ->> 'style', 'real') <> 'real'),
      '[]'::jsonb)
  END;
$$;