REVOKE ALL ON FUNCTION public.is_thread_member(text, uuid) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.add_thread_participant() FROM PUBLIC, anon, authenticated;