import { supabase } from "@/integrations/supabase/client";

/**
 * Deleting a conversation is always "delete for me":
 * my own messages are removed everywhere, and the rest of the thread is
 * hidden from my side only. The other person keeps their copy.
 */

const isUuid = (v: string) =>
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(v);

const HIDDEN_DM_KEY = "yw-hidden-threads";
const HIDDEN_ORBIT_KEY = "yw-hidden-orbit-chats";

function readHidden(key: string): string[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(key);
    const list = raw ? (JSON.parse(raw) as unknown) : [];
    return Array.isArray(list) ? list.filter((v): v is string => typeof v === "string") : [];
  } catch {
    return [];
  }
}

function writeHidden(key: string, ids: string[]) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(key, JSON.stringify([...new Set(ids)].slice(-500)));
  } catch {
    /* storage full or blocked — hiding is best effort */
  }
}

export const hiddenThreadIds = () => readHidden(HIDDEN_DM_KEY);
export const hiddenOrbitPeerIds = () => readHidden(HIDDEN_ORBIT_KEY);

/** Delete one or many direct-message threads for the signed-in user. */
export async function deleteDirectThreads(threadIds: string[]) {
  const ids = [...new Set(threadIds)].filter(Boolean);
  if (!ids.length) return;

  writeHidden(HIDDEN_DM_KEY, [...readHidden(HIDDEN_DM_KEY), ...ids]);

  const { data: auth } = await supabase.auth.getUser();
  const me = auth.user?.id;
  if (!me) return;

  // My messages go for good; then I leave the thread so nothing else reaches me.
  await supabase.from("direct_messages").delete().in("thread_id", ids).eq("sender_id", me);
  await supabase.from("thread_participants").delete().in("thread_id", ids).eq("user_id", me);
}

/** Delete one or many Orbit conversations for the signed-in user. */
export async function deleteOrbitConversations(peerIds: string[]) {
  const ids = [...new Set(peerIds)].filter(isUuid);
  if (!ids.length) return;

  writeHidden(HIDDEN_ORBIT_KEY, [...readHidden(HIDDEN_ORBIT_KEY), ...ids]);

  const { data: auth } = await supabase.auth.getUser();
  const me = auth.user?.id;
  if (!me) return;

  const now = new Date().toISOString();

  await supabase
    .from("orbit_messages")
    .delete()
    .eq("sender_id", me)
    .in("recipient_id", ids);

  // Everything received before now stays hidden on my side.
  await supabase.from("orbit_chat_settings").upsert(
    ids.map((peer_id) => ({ user_id: me, peer_id, cleared_before: now })) as never,
    { onConflict: "user_id,peer_id" },
  );
}

/** Undo the local hide, e.g. when a chat is opened again on purpose. */
export function unhideOrbitConversation(peerId: string) {
  writeHidden(
    HIDDEN_ORBIT_KEY,
    readHidden(HIDDEN_ORBIT_KEY).filter((id) => id !== peerId),
  );
}
