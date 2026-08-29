GRANT EXECUTE ON FUNCTION public.get_follow_counts(uuid[]) TO authenticated;
GRANT EXECUTE ON FUNCTION public.list_follows(uuid, text, integer) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_public_profiles(uuid[]) TO anon, authenticated;