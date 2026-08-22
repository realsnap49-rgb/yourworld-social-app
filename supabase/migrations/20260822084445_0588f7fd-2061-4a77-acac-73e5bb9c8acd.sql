ALTER TABLE public.orbit_chat_settings
ADD COLUMN cleared_before timestamptz;

CREATE POLICY "Participants can delete expired Orbit messages"
ON public.orbit_messages FOR DELETE TO authenticated
USING (
  expires_at IS NOT NULL
  AND expires_at <= now()
  AND (auth.uid() = sender_id OR auth.uid() = recipient_id)
);