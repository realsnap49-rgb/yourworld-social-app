DO $$
DECLARE t record;
BEGIN
  FOR t IN SELECT c.relname FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace
           WHERE n.nspname='public' AND c.relkind='r' LOOP
    IF t.relname = 'wallets' THEN
      EXECUTE format('GRANT SELECT ON public.%I TO authenticated', t.relname);
    ELSE
      EXECUTE format('GRANT SELECT, INSERT, UPDATE, DELETE ON public.%I TO authenticated', t.relname);
    END IF;
    EXECUTE format('GRANT ALL ON public.%I TO service_role', t.relname);
  END LOOP;
END;
$$;