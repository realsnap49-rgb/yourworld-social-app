ALTER TABLE public.orbit_chat_requests REPLICA IDENTITY FULL;
ALTER TABLE public.orbit_request_messages REPLICA IDENTITY FULL;
ALTER TABLE public.orbit_connections REPLICA IDENTITY FULL;
ALTER TABLE public.orbit_profiles REPLICA IDENTITY FULL;

DO $$
BEGIN
  BEGIN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.orbit_chat_requests;
  EXCEPTION WHEN duplicate_object THEN NULL; END;
  BEGIN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.orbit_request_messages;
  EXCEPTION WHEN duplicate_object THEN NULL; END;
  BEGIN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.orbit_connections;
  EXCEPTION WHEN duplicate_object THEN NULL; END;
  BEGIN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.orbit_profiles;
  EXCEPTION WHEN duplicate_object THEN NULL; END;
END $$;