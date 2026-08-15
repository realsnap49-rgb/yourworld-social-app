CREATE POLICY "Authenticated users can view profiles for discovery"
ON public.profiles
FOR SELECT
TO authenticated
USING (true);