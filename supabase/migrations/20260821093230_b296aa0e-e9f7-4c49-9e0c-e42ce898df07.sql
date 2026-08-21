CREATE TABLE public.orbit_profiles (
  user_id uuid PRIMARY KEY,
  name text NOT NULL,
  age int NOT NULL CHECK (age >= 18),
  country text NOT NULL DEFAULT '',
  state text NOT NULL DEFAULT '',
  city text NOT NULL DEFAULT '',
  about text NOT NULL DEFAULT '',
  hobbies text[] NOT NULL DEFAULT '{}',
  looking_for text NOT NULL DEFAULT '',
  gender text NOT NULL DEFAULT '',
  photos jsonb NOT NULL DEFAULT '[]'::jsonb,
  original_photo_privacy text NOT NULL DEFAULT 'matched',
  mood text,
  orbit_enabled boolean NOT NULL DEFAULT true,
  visible boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.orbit_profiles TO authenticated;
GRANT ALL ON public.orbit_profiles TO service_role;
ALTER TABLE public.orbit_profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Own orbit profile" ON public.orbit_profiles FOR ALL TO authenticated
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Discover visible orbit profiles" ON public.orbit_profiles FOR SELECT TO authenticated
  USING (orbit_enabled AND visible);
CREATE TRIGGER update_orbit_profiles_updated_at BEFORE UPDATE ON public.orbit_profiles
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TABLE public.orbit_settings (
  user_id uuid PRIMARY KEY,
  privacy jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.orbit_settings TO authenticated;
GRANT ALL ON public.orbit_settings TO service_role;
ALTER TABLE public.orbit_settings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Own orbit settings" ON public.orbit_settings FOR ALL TO authenticated
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE TRIGGER update_orbit_settings_updated_at BEFORE UPDATE ON public.orbit_settings
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TABLE public.orbit_likes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  target_id uuid NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, target_id)
);
GRANT SELECT, INSERT, DELETE ON public.orbit_likes TO authenticated;
GRANT ALL ON public.orbit_likes TO service_role;
ALTER TABLE public.orbit_likes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Read own or received likes" ON public.orbit_likes FOR SELECT TO authenticated
  USING (auth.uid() = user_id OR auth.uid() = target_id);
CREATE POLICY "Create own likes" ON public.orbit_likes FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Delete own likes" ON public.orbit_likes FOR DELETE TO authenticated
  USING (auth.uid() = user_id);

CREATE TABLE public.orbit_connections (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  requester_id uuid NOT NULL,
  addressee_id uuid NOT NULL,
  status text NOT NULL DEFAULT 'pending',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (requester_id, addressee_id)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.orbit_connections TO authenticated;
GRANT ALL ON public.orbit_connections TO service_role;
ALTER TABLE public.orbit_connections ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Read own connections" ON public.orbit_connections FOR SELECT TO authenticated
  USING (auth.uid() IN (requester_id, addressee_id));
CREATE POLICY "Create connections as requester" ON public.orbit_connections FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = requester_id);
CREATE POLICY "Update own connections" ON public.orbit_connections FOR UPDATE TO authenticated
  USING (auth.uid() IN (requester_id, addressee_id)) WITH CHECK (auth.uid() IN (requester_id, addressee_id));
CREATE POLICY "Delete own connections" ON public.orbit_connections FOR DELETE TO authenticated
  USING (auth.uid() = requester_id);
CREATE TRIGGER update_orbit_connections_updated_at BEFORE UPDATE ON public.orbit_connections
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TABLE public.orbit_chat_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  requester_id uuid NOT NULL,
  addressee_id uuid NOT NULL,
  intro text,
  status text NOT NULL DEFAULT 'pending',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (requester_id, addressee_id)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.orbit_chat_requests TO authenticated;
GRANT ALL ON public.orbit_chat_requests TO service_role;
ALTER TABLE public.orbit_chat_requests ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Read own chat requests" ON public.orbit_chat_requests FOR SELECT TO authenticated
  USING (auth.uid() IN (requester_id, addressee_id));
CREATE POLICY "Create chat requests as requester" ON public.orbit_chat_requests FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = requester_id);
CREATE POLICY "Update own chat requests" ON public.orbit_chat_requests FOR UPDATE TO authenticated
  USING (auth.uid() IN (requester_id, addressee_id)) WITH CHECK (auth.uid() IN (requester_id, addressee_id));
CREATE POLICY "Delete own chat requests" ON public.orbit_chat_requests FOR DELETE TO authenticated
  USING (auth.uid() = requester_id);
CREATE TRIGGER update_orbit_chat_requests_updated_at BEFORE UPDATE ON public.orbit_chat_requests
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TABLE public.orbit_request_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  request_id uuid NOT NULL REFERENCES public.orbit_chat_requests(id) ON DELETE CASCADE,
  sender_id uuid NOT NULL,
  kind text NOT NULL DEFAULT 'text',
  text text,
  url text,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT ON public.orbit_request_messages TO authenticated;
GRANT ALL ON public.orbit_request_messages TO service_role;
ALTER TABLE public.orbit_request_messages ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Read messages of own requests" ON public.orbit_request_messages FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM public.orbit_chat_requests r WHERE r.id = request_id AND auth.uid() IN (r.requester_id, r.addressee_id)));
CREATE POLICY "Send messages in own requests" ON public.orbit_request_messages FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = sender_id AND EXISTS (SELECT 1 FROM public.orbit_chat_requests r WHERE r.id = request_id AND auth.uid() IN (r.requester_id, r.addressee_id)));

CREATE INDEX orbit_request_messages_request_idx ON public.orbit_request_messages (request_id, created_at);