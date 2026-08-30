import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

export type FollowCounts = { followers: number; following: number };

export type FollowUser = {
  id: string;
  username: string;
  display_name: string;
  avatar_url: string | null;
};

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
export const isRealUserId = (id: string) => UUID.test(id);

/** Ids the signed-in user currently follows. */
export async function fetchMyFollowing(): Promise<string[]> {
  const { data: s } = await supabase.auth.getSession();
  const uid = s.session?.user.id;
  if (!uid) return [];
  const { data } = await supabase.from("follows").select("following_id").eq("follower_id", uid);
  return (data ?? []).map((r) => r.following_id as string);
}

/** Follow / unfollow a real user. Throws when signed out or on a DB error. */
export async function setFollow(targetId: string, on: boolean) {
  const { data: s } = await supabase.auth.getSession();
  const uid = s.session?.user.id;
  if (!uid) throw new Error("Sign in to follow people");
  if (uid === targetId) throw new Error("You can't follow yourself");

  if (on) {
    const { error } = await supabase
      .from("follows")
      .upsert(
        { follower_id: uid, following_id: targetId },
        { onConflict: "follower_id,following_id", ignoreDuplicates: true },
      );
    if (error) throw new Error(error.message);
  } else {
    const { error } = await supabase
      .from("follows")
      .delete()
      .eq("follower_id", uid)
      .eq("following_id", targetId);
    if (error) throw new Error(error.message);
  }
}

async function counts(userId: string): Promise<FollowCounts> {
  // Public counts go through the security-definer RPC; direct table reads are
  // RLS-restricted to the row owner only.
  const { data: rows } = await supabase.rpc("get_follow_counts", { ids: [userId] });
  const row = (rows ?? [])[0];
  return { followers: Number(row?.followers ?? 0), following: Number(row?.following ?? 0) };
}

/** Live follower / following counts for a user, kept fresh via realtime. */
export function useFollowCounts(userId: string | null) {
  const [data, setData] = useState<FollowCounts>({ followers: 0, following: 0 });

  const reload = useCallback(async () => {
    if (!userId) return setData({ followers: 0, following: 0 });
    setData(await counts(userId));
  }, [userId]);

  useEffect(() => {
    void reload();
    if (!userId) return;
    let ch: ReturnType<typeof supabase.channel> | null = null;
    try {
      // follow_counts direct reads are owner-only now; watch the publicly
      // readable follows table instead and refetch counts via the RPC.
      ch = supabase
        .channel(`follows:${userId}:${crypto.randomUUID()}`)
        .on(
          "postgres_changes",
          { event: "*", schema: "public", table: "follows", filter: `following_id=eq.${userId}` },
          () => void reload(),
        )
        .on(
          "postgres_changes",
          { event: "*", schema: "public", table: "follows", filter: `follower_id=eq.${userId}` },
          () => void reload(),
        )
        .subscribe();
    } catch (err) {
      console.error("[useFollowCounts] realtime unavailable", err);
    }
    return () => {
      const c = ch;
      ch = null;
      if (c) setTimeout(() => void supabase.removeChannel(c), 0);
    };
  }, [userId, reload]);


  return { ...data, reload };
}

/** People who follow `userId`, or people `userId` follows. */
export function useFollowList(userId: string | null, kind: "followers" | "following", open: boolean) {
  const [users, setUsers] = useState<FollowUser[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!open || !userId) return;
    let cancelled = false;
    (async () => {
      setLoading(true);
      const { data: rows } = await supabase.rpc("list_follows", {
        _user_id: userId,
        _kind: kind,
        _limit: 500,
      });
      const ids = (rows ?? []).map((r) => r.id as string).filter(Boolean);
      if (!ids.length) {
        if (!cancelled) {
          setUsers([]);
          setLoading(false);
        }
        return;
      }
      const { data: profiles } = await supabase.rpc("get_public_profiles", { ids });
      if (cancelled) return;
      const byId = new Map((profiles ?? []).map((p) => [p.id, p]));
      setUsers(
        ids.map((id) => {
          const p = byId.get(id);
          return {
            id,
            username: p?.username ?? "user",
            display_name: p?.display_name ?? p?.username ?? "YourWorld user",
            avatar_url: p?.avatar_url ?? null,
          };
        }),
      );
      setLoading(false);
    })();
    return () => {
      cancelled = true;
    };
  }, [userId, kind, open]);

  return { users, loading };
}
