-- 1. Wallets: remove self-write ability
DO $$
DECLARE p record;
BEGIN
  FOR p IN SELECT policyname FROM pg_policies WHERE schemaname='public' AND tablename='wallets' LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.wallets', p.policyname);
  END LOOP;
END $$;

REVOKE INSERT, UPDATE, DELETE ON public.wallets FROM authenticated;
GRANT SELECT ON public.wallets TO authenticated;
GRANT ALL ON public.wallets TO service_role;

CREATE POLICY "Users can view their own wallet"
ON public.wallets FOR SELECT TO authenticated
USING (auth.uid() = user_id);

-- Defense in depth: block any balance mutation that is not made by a trusted role
CREATE OR REPLACE FUNCTION public.guard_wallet_balance()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF current_setting('role', true) = 'service_role' OR auth.role() = 'service_role' THEN
    RETURN NEW;
  END IF;
  IF TG_OP = 'INSERT' AND NEW.balance IS DISTINCT FROM 0 THEN
    RAISE EXCEPTION 'Wallet balance can only be set by the server';
  END IF;
  IF TG_OP = 'UPDATE' AND NEW.balance IS DISTINCT FROM OLD.balance THEN
    RAISE EXCEPTION 'Wallet balance can only be changed by the server';
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS guard_wallet_balance_trg ON public.wallets;
CREATE TRIGGER guard_wallet_balance_trg
BEFORE INSERT OR UPDATE ON public.wallets
FOR EACH ROW EXECUTE FUNCTION public.guard_wallet_balance();

-- 2. Orbit request messages: owner-scoped delete
DROP POLICY IF EXISTS "Senders can delete their own request messages" ON public.orbit_request_messages;
CREATE POLICY "Senders can delete their own request messages"
ON public.orbit_request_messages FOR DELETE TO authenticated
USING (auth.uid() = sender_id);
