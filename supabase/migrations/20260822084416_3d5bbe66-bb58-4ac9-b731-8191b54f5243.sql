CREATE TABLE public.orbit_chat_settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  peer_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  display_name text,
  secret_lock_enabled boolean NOT NULL DEFAULT false,
  secret_pin_salt text,
  secret_pin_hash text,
  view_once_mode boolean NOT NULL DEFAULT false,
  auto_delete_seconds integer NOT NULL DEFAULT 0 CHECK (auto_delete_seconds IN (0, 60, 300, 3600, 86400)),
  screenshot_alert boolean NOT NULL DEFAULT true,
  recording_alert boolean NOT NULL DEFAULT true,
  muted boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, peer_id),
  CHECK (user_id <> peer_id),
  CHECK ((secret_lock_enabled = false) OR (secret_pin_salt IS NOT NULL AND secret_pin_hash IS NOT NULL))
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.orbit_chat_settings TO authenticated;
GRANT ALL ON public.orbit_chat_settings TO service_role;
ALTER TABLE public.orbit_chat_settings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users manage own Orbit chat settings"
ON public.orbit_chat_settings FOR ALL TO authenticated
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);
CREATE TRIGGER update_orbit_chat_settings_updated_at
BEFORE UPDATE ON public.orbit_chat_settings
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TABLE public.orbit_reports (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  reporter_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  reported_user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  reason text NOT NULL CHECK (char_length(reason) BETWEEN 3 AND 500),
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'reviewed', 'resolved')),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (reporter_id, reported_user_id),
  CHECK (reporter_id <> reported_user_id)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.orbit_reports TO authenticated;
GRANT ALL ON public.orbit_reports TO service_role;
ALTER TABLE public.orbit_reports ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users manage own Orbit reports"
ON public.orbit_reports FOR ALL TO authenticated
USING (auth.uid() = reporter_id)
WITH CHECK (auth.uid() = reporter_id);
CREATE TRIGGER update_orbit_reports_updated_at
BEFORE UPDATE ON public.orbit_reports
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

ALTER TABLE public.orbit_messages
ADD COLUMN expires_at timestamptz;
CREATE INDEX orbit_messages_expires_at_idx ON public.orbit_messages (expires_at) WHERE expires_at IS NOT NULL;

CREATE OR REPLACE FUNCTION public.delete_expired_orbit_messages()
RETURNS integer
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public
AS $$
DECLARE deleted_count integer;
BEGIN
  DELETE FROM public.orbit_messages
  WHERE expires_at IS NOT NULL
    AND expires_at <= now()
    AND (sender_id = auth.uid() OR recipient_id = auth.uid());
  GET DIAGNOSTICS deleted_count = ROW_COUNT;
  RETURN deleted_count;
END;
$$;
REVOKE ALL ON FUNCTION public.delete_expired_orbit_messages() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.delete_expired_orbit_messages() TO authenticated;