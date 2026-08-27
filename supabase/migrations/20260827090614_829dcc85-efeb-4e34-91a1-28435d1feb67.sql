-- Private realtime channels: scope who may read/write broadcast topics.
DROP POLICY IF EXISTS "authenticated can read own call topics" ON realtime.messages;
DROP POLICY IF EXISTS "authenticated can write call topics" ON realtime.messages;

CREATE POLICY "authenticated can read own call topics"
ON realtime.messages
FOR SELECT
TO authenticated
USING (
  realtime.topic() = 'calls-user-' || (auth.uid())::text
  OR realtime.topic() LIKE 'rtc-%'
);

CREATE POLICY "authenticated can write call topics"
ON realtime.messages
FOR INSERT
TO authenticated
WITH CHECK (
  realtime.topic() LIKE 'calls-user-%'
  OR realtime.topic() LIKE 'rtc-%'
);