ALTER TABLE public.creator_earnings REPLICA IDENTITY FULL;
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime' AND schemaname = 'public' AND tablename = 'creator_earnings'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.creator_earnings;
  END IF;
END $$;