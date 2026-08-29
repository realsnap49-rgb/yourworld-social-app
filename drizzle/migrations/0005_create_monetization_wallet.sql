-- Payout / bank details for creators
CREATE TABLE IF NOT EXISTS public.creator_payout_details (
  user_id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  creator_email text,
  upi_id text,
  bank_account text,
  ifsc_code text,
  account_holder text,
  pan_number text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.creator_payout_details TO authenticated;
GRANT ALL ON public.creator_payout_details TO service_role;

ALTER TABLE public.creator_payout_details ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Owner reads payout details" ON public.creator_payout_details
  FOR SELECT TO authenticated USING (user_id = auth.uid());
CREATE POLICY "Owner inserts payout details" ON public.creator_payout_details
  FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());
CREATE POLICY "Owner updates payout details" ON public.creator_payout_details
  FOR UPDATE TO authenticated USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());
CREATE POLICY "Owner deletes payout details" ON public.creator_payout_details
  FOR DELETE TO authenticated USING (user_id = auth.uid());

-- Gross revenue events credited to a creator
CREATE TABLE IF NOT EXISTS public.creator_earnings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  source text NOT NULL CHECK (source IN ('ads', 'course', 'vip')),
  gross_amount numeric(14,2) NOT NULL CHECK (gross_amount >= 0),
  description text,
  payout_id uuid,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS creator_earnings_user_idx ON public.creator_earnings (user_id, created_at DESC);

GRANT SELECT ON public.creator_earnings TO authenticated;
GRANT ALL ON public.creator_earnings TO service_role;

ALTER TABLE public.creator_earnings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Owner reads earnings" ON public.creator_earnings
  FOR SELECT TO authenticated USING (user_id = auth.uid());

-- Payout statements (server-written only)
CREATE TABLE IF NOT EXISTS public.creator_payouts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  statement_id text NOT NULL UNIQUE,
  gross_amount numeric(14,2) NOT NULL DEFAULT 0,
  gst_amount numeric(14,2) NOT NULL DEFAULT 0,
  platform_share numeric(14,2) NOT NULL DEFAULT 0,
  tds_amount numeric(14,2) NOT NULL DEFAULT 0,
  net_amount numeric(14,2) NOT NULL DEFAULT 0,
  ads_gross numeric(14,2) NOT NULL DEFAULT 0,
  course_gross numeric(14,2) NOT NULL DEFAULT 0,
  vip_gross numeric(14,2) NOT NULL DEFAULT 0,
  pan_number text,
  status text NOT NULL DEFAULT 'processing',
  email_sent boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS creator_payouts_user_idx ON public.creator_payouts (user_id, created_at DESC);

GRANT SELECT ON public.creator_payouts TO authenticated;
GRANT ALL ON public.creator_payouts TO service_role;

ALTER TABLE public.creator_payouts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Owner reads payouts" ON public.creator_payouts
  FOR SELECT TO authenticated USING (user_id = auth.uid());
