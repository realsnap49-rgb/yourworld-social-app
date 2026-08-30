CREATE TABLE IF NOT EXISTS public.chat_compliance_flags (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  surface text NOT NULL,
  thread_id text,
  peer_id uuid,
  message_id uuid,
  matched_terms text[] NOT NULL DEFAULT '{}',
  excerpt text,
  created_at timestamptz NOT NULL DEFAULT now()
);

GRANT INSERT ON public.chat_compliance_flags TO authenticated;
GRANT ALL ON public.chat_compliance_flags TO service_role;

ALTER TABLE public.chat_compliance_flags ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can record their own compliance flags" ON public.chat_compliance_flags;
CREATE POLICY "Users can record their own compliance flags"
ON public.chat_compliance_flags FOR INSERT TO authenticated
WITH CHECK (auth.uid() = user_id);

CREATE INDEX IF NOT EXISTS chat_compliance_flags_user_idx ON public.chat_compliance_flags (user_id, created_at DESC);

ALTER TABLE public.posts ADD COLUMN IF NOT EXISTS paid_promotion boolean NOT NULL DEFAULT false;
ALTER TABLE public.posts ADD COLUMN IF NOT EXISTS review_status text NOT NULL DEFAULT 'approved';
ALTER TABLE public.posts ADD COLUMN IF NOT EXISTS review_note text;