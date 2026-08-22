GRANT SELECT, INSERT, UPDATE, DELETE ON public.orbit_chat_requests TO authenticated;
GRANT ALL ON public.orbit_chat_requests TO service_role;

GRANT SELECT, INSERT ON public.orbit_request_messages TO authenticated;
GRANT ALL ON public.orbit_request_messages TO service_role;

GRANT SELECT, INSERT, UPDATE, DELETE ON public.orbit_connections TO authenticated;
GRANT ALL ON public.orbit_connections TO service_role;