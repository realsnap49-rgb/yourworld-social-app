import { useCallback, useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

/**
 * Shared Secret Chat Lock helpers used by both Social and Orbit message lists.
 * Locked conversations disappear from the list/search until the exact PIN is
 * typed into the search bar; opening them still requires the PIN.
 */

export function randomPinSalt() {
  const bytes = crypto.getRandomValues(new Uint8Array(16));
  return Array.from(bytes, (byte) => byte.toString(16).padStart(2, "0")).join("");
}

export async function hashPin(salt: string, pin: string) {
  const bytes = new TextEncoder().encode(`${salt}:${pin}`);
  const digest = await crypto.subtle.digest("SHA-256", bytes);
  return Array.from(new Uint8Array(digest), (byte) => byte.toString(16).padStart(2, "0")).join("");
}

export type LockedChat = { peerId: string; salt: string | null; hash: string | null };

async function fetchLocked(): Promise<LockedChat[]> {
  const { data: auth } = await supabase.auth.getUser();
  const me = auth.user?.id;
  if (!me) return [];
  const { data } = await supabase
    .from("orbit_chat_settings")
    .select("peer_id,secret_pin_salt,secret_pin_hash,secret_lock_enabled")
    .eq("user_id", me)
    .eq("secret_lock_enabled", true);
  return ((data ?? []) as Array<Record<string, unknown>>).map((r) => ({
    peerId: String(r['peer_id']),
    salt: (r['secret_pin_salt'] as string | null) ?? null,
    hash: (r['secret_pin_hash'] as string | null) ?? null,
  }));
}

/**
 * @param query current text in the message search bar — an exact PIN match
 *              temporarily reveals the matching locked chat(s).
 */
export function useSecretChats(query: string) {
  const [locked, setLocked] = useState<LockedChat[]>([]);
  const [revealed, setRevealed] = useState<string[]>([]);

  useEffect(() => {
    let alive = true;
    const refresh = () => {
      void fetchLocked().then((rows) => {
        if (alive) setLocked(rows);
      });
    };
    refresh();
    // Keep the hidden set fresh when a lock is toggled elsewhere.
    const channel = supabase
      .channel("secret-chats")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "orbit_chat_settings" },
        refresh,
      )
      .subscribe();
    window.addEventListener("focus", refresh);
    document.addEventListener("visibilitychange", refresh);
    return () => {
      alive = false;
      window.removeEventListener("focus", refresh);
      document.removeEventListener("visibilitychange", refresh);
      void supabase.removeChannel(channel);
    };
  }, []);

  const pin = query.trim();

  useEffect(() => {
    let alive = true;
    if (!/^\d{4,8}$/.test(pin) || locked.length === 0) {
      setRevealed((prev) => (prev.length ? [] : prev));
      return;
    }
    void (async () => {
      const hits: string[] = [];
      for (const row of locked) {
        if (!row.salt || !row.hash) continue;
        if ((await hashPin(row.salt, pin)) === row.hash) hits.push(row.peerId);
      }
      if (alive) setRevealed(hits);
    })();
    return () => {
      alive = false;
    };
  }, [pin, locked]);

  const lockedIds = useMemo(() => locked.map((l) => l.peerId), [locked]);

  /** True when this chat must stay out of the list/search results. */
  const isHidden = useCallback(
    (peerId?: string | null) =>
      !!peerId && lockedIds.includes(peerId) && !revealed.includes(peerId),
    [lockedIds, revealed],
  );

  return { lockedIds, revealed, isHidden, hasReveal: revealed.length > 0 };
}
