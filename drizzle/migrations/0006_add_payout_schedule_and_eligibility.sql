ALTER TABLE public.creator_payout_details
  ADD COLUMN IF NOT EXISTS payout_schedule text NOT NULL DEFAULT '15',
  ADD COLUMN IF NOT EXISTS monetization_eligible boolean NOT NULL DEFAULT false;

ALTER TABLE public.creator_payout_details
  DROP CONSTRAINT IF EXISTS creator_payout_details_payout_schedule_check;
ALTER TABLE public.creator_payout_details
  ADD CONSTRAINT creator_payout_details_payout_schedule_check CHECK (payout_schedule IN ('15','30'));