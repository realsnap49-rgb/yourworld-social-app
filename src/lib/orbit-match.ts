import { useCallback, useEffect, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

const isUuid = (v: string) =>
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(v);

export type OrbitMatchState = {
  /** People I liked. */
  likedByMe: string[];
  /** People who liked me. */
  likesMe: string[];
  /** Mutual likes — real matches. */
  mutual: string[];
  loading: boolean;
  refresh: () => void;
};

/** Live mutual-like matching, straight from the database (both directions). */
export function useOrbitMatches(): OrbitMatchState {
  const [likedByMe, setLikedByMe] = useState<string[]>([]);
  const [likesMe, setLikesMe] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [tick, setTick] = useState(0);

  const refresh = useCallback(() => setTick((t) => t + 1), []);

  useEffect(() => {
    let cancelled = false;

    const load = async () => {
      const { data: auth } = await supabase.auth.getUser();
      const me = auth.user?.id;
      if (!me) {
        if (!cancelled) {
          setLikedByMe([]);
          setLikesMe([]);
          setLoading(false);
        }
        return;
      }
      const [mine, theirs] = await Promise.all([
        supabase.from("orbit_likes").select("target_id").eq("user_id", me),
        supabase.from("orbit_likes").select("user_id").eq("target_id", me),
      ]);
      if (cancelled) return;
      setLikedByMe(((mine.data ?? []) as { target_id: string }[]).map((r) => r.target_id));
      setLikesMe(((theirs.data ?? []) as { user_id: string }[]).map((r) => r.user_id));
      setLoading(false);
    };

    void load();

    const channel = supabase
      .channel("orbit-likes-live")
      .on("postgres_changes", { event: "*", schema: "public", table: "orbit_likes" }, () => {
        void load();
      })
      .subscribe();

    return () => {
      cancelled = true;
      void supabase.removeChannel(channel);
    };
  }, [tick]);

  const set = new Set(likesMe);
  return {
    likedByMe,
    likesMe,
    mutual: likedByMe.filter((id) => set.has(id)),
    loading,
    refresh,
  };
}

/**
 * Sends (or withdraws) a real match like.
 * Returns whether the two people now match each other.
 */
export async function sendOrbitMatch(
  targetId: string,
  liked: boolean,
): Promise<{ ok: boolean; mutual: boolean }> {
  const { data: auth } = await supabase.auth.getUser();
  const me = auth.user?.id;
  if (!me || !isUuid(targetId)) return { ok: false, mutual: false };

  if (!liked) {
    await supabase.from("orbit_likes").delete().eq("user_id", me).eq("target_id", targetId);
    return { ok: true, mutual: false };
  }

  const { error } = await supabase
    .from("orbit_likes")
    .upsert({ user_id: me, target_id: targetId } as never, { onConflict: "user_id,target_id" });
  if (error && !/duplicate/i.test(error.message)) return { ok: false, mutual: false };

  const { data } = await supabase
    .from("orbit_likes")
    .select("user_id")
    .eq("user_id", targetId)
    .eq("target_id", me)
    .maybeSingle();

  const mutual = !!data;
  if (mutual) {
    // A match unlocks chat for both sides.
    await supabase.from("orbit_connections").upsert(
      { requester_id: me, addressee_id: targetId, status: "accepted" } as never,
      { onConflict: "requester_id,addressee_id" },
    );
  }
  return { ok: true, mutual };
}

export type OrbitThreadPreview = {
  peerId: string;
  text: string;
  at: number;
  mine: boolean;
  unread: number;
};

/** Last message per Orbit peer, live. */
export function useOrbitThreadPreviews() {
  const [previews, setPreviews] = useState<Record<string, OrbitThreadPreview>>({});
  const meRef = useRef<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    const load = async () => {
      const { data: auth } = await supabase.auth.getUser();
      const me = auth.user?.id;
      meRef.current = me ?? null;
      if (!me) return;
      const { data } = await supabase
        .from("orbit_messages")
        .select("id,sender_id,recipient_id,kind,text,created_at")
        .or(`sender_id.eq.${me},recipient_id.eq.${me}`)
        .order("created_at", { ascending: false })
        .limit(300);
      if (cancelled || !data) return;

      const next: Record<string, OrbitThreadPreview> = {};
      for (const r of data as {
        sender_id: string;
        recipient_id: string;
        kind: string;
        text: string | null;
        created_at: string;
      }[]) {
        const peer = r.sender_id === me ? r.recipient_id : r.sender_id;
        if (next[peer]) continue;
        const label =
          r.kind === "photo"
            ? "Photo"
            : r.kind === "video"
              ? "Video"
              : r.kind === "audio"
                ? "Voice message"
                : (r.text ?? "");
        next[peer] = {
          peerId: peer,
          text: label,
          at: new Date(r.created_at).getTime(),
          mine: r.sender_id === me,
          unread: 0,
        };
      }
      setPreviews(next);
    };

    void load();

    const channel = supabase
      .channel("orbit-thread-previews")
      .on("postgres_changes", { event: "*", schema: "public", table: "orbit_messages" }, () => {
        void load();
      })
      .subscribe();

    return () => {
      cancelled = true;
      void supabase.removeChannel(channel);
    };
  }, []);

  return previews;
}
