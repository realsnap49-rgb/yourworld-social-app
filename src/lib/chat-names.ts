import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

/**
 * Per-contact custom display names (the "Change Display Name" chat option).
 * Stored in `orbit_chat_settings.display_name` for the signed-in user and
 * mirrored in a tiny in-memory + localStorage map so every screen (chat header,
 * chat lists, profile views) shows the custom name instantly.
 */

const LS_KEY = "yw.chat.names";

let cache: Record<string, string> | null = null;
const listeners = new Set<() => void>();
let localRevision = 0;

function readLocal(): Record<string, string> {
  try {
    const raw = window.localStorage.getItem(LS_KEY);
    return raw ? (JSON.parse(raw) as Record<string, string>) : {};
  } catch {
    return {};
  }
}

function writeLocal(map: Record<string, string>) {
  try {
    window.localStorage.setItem(LS_KEY, JSON.stringify(map));
  } catch {
    /* storage unavailable */
  }
}

function emit() {
  listeners.forEach((l) => l());
}

export function getChatNames(): Record<string, string> {
  if (cache) return cache;
  cache = typeof window === "undefined" ? {} : readLocal();
  return cache;
}

/** Custom name for a contact, or the given fallback. */
export function chatDisplayName(peerId: string | null | undefined, fallback: string) {
  if (!peerId) return fallback;
  const v = getChatNames()[peerId];
  return v && v.trim() ? v : fallback;
}

/** Update locally (instant) — the caller persists to the database. */
export function setChatNameLocal(peerId: string, name: string | null) {
  if (!peerId) return;
  const map = { ...getChatNames() };
  if (name && name.trim()) map[peerId] = name.trim();
  else delete map[peerId];
  cache = map;
  localRevision += 1;
  writeLocal(map);
  emit();
}

/** Persist a custom display name for a contact, forever, until changed again. */
export async function saveChatDisplayName(peerId: string, name: string | null) {
  if (!peerId) return false;
  setChatNameLocal(peerId, name);
  const { data } = await supabase.auth.getUser();
  const me = data.user?.id;
  if (!me) return false;
  const { error } = await supabase.from("orbit_chat_settings").upsert(
    { user_id: me, peer_id: peerId, display_name: name?.trim() || null } as never,
    { onConflict: "user_id,peer_id" },
  );
  return !error;
}

/** Pull every saved custom name for the signed-in user into the local map. */
export async function refreshChatNames() {
  const revisionAtStart = localRevision;
  const { data: auth } = await supabase.auth.getUser();
  const me = auth.user?.id;
  if (!me) return;
  const { data, error } = await supabase
    .from("orbit_chat_settings")
    .select("peer_id,display_name")
    .eq("user_id", me);
  if (error || revisionAtStart !== localRevision) return;
  const rows = (data ?? []) as { peer_id: string; display_name: string | null }[];
  const map: Record<string, string> = {};
  rows.forEach((r) => {
    if (r.display_name && r.display_name.trim()) map[r.peer_id] = r.display_name.trim();
  });
  cache = map;
  writeLocal(map);
  emit();
}

/** Subscribe a component to custom-name changes. */
export function useChatNames() {
  const [names, setNames] = useState<Record<string, string>>(() => getChatNames());

  useEffect(() => {
    const sync = () => setNames({ ...getChatNames() });
    listeners.add(sync);
    void refreshChatNames();
    return () => {
      listeners.delete(sync);
    };
  }, []);

  return {
    names,
    nameFor: (peerId: string | null | undefined, fallback: string) =>
      (peerId ? names[peerId] : undefined) || fallback,
  };
}
