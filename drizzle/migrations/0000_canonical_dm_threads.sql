-- Deterministic 1:1 thread id so both users share the same conversation.
CREATE OR REPLACE FUNCTION public.dm_thread_id(_a uuid, _b uuid)
RETURNS text
LANGUAGE sql
IMMUTABLE
AS $$
  SELECT 'dm_' || least(_a::text, _b::text) || '_' || greatest(_a::text, _b::text)
$$;

-- Backfill legacy threads whose id was simply the recipient's user id.
UPDATE public.direct_messages
SET thread_id = public.dm_thread_id(sender_id, thread_id::uuid)
WHERE thread_id ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
  AND thread_id::uuid <> sender_id;

UPDATE public.thread_participants
SET thread_id = public.dm_thread_id(user_id, thread_id::uuid)
WHERE thread_id ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
  AND thread_id::uuid <> user_id;

-- Both participants are registered for canonical threads, so each side sees the chat.
CREATE OR REPLACE FUNCTION public.add_thread_participant()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  a uuid;
  b uuid;
BEGIN
  INSERT INTO public.thread_participants (thread_id, user_id)
  VALUES (NEW.thread_id, NEW.sender_id)
  ON CONFLICT DO NOTHING;

  IF NEW.thread_id ~* '^dm_[0-9a-f-]{36}_[0-9a-f-]{36}$' THEN
    a := substring(NEW.thread_id from 4 for 36)::uuid;
    b := substring(NEW.thread_id from 41 for 36)::uuid;
    INSERT INTO public.thread_participants (thread_id, user_id)
    VALUES (NEW.thread_id, a), (NEW.thread_id, b)
    ON CONFLICT DO NOTHING;
  END IF;

  RETURN NEW;
END;
$$;

-- Register both sides for the threads that already exist.
INSERT INTO public.thread_participants (thread_id, user_id)
SELECT DISTINCT m.thread_id, u.id
FROM public.direct_messages m
CROSS JOIN LATERAL (
  VALUES (substring(m.thread_id from 4 for 36)::uuid), (substring(m.thread_id from 41 for 36)::uuid)
) AS u(id)
WHERE m.thread_id ~* '^dm_[0-9a-f-]{36}_[0-9a-f-]{36}$'
ON CONFLICT DO NOTHING;