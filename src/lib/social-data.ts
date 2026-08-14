import { useCallback, useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import type { User } from "@/lib/yw-data";

export type DbProfile = {
  id: string;
  username: string | null;
  display_name: string | null;
  avatar_url: string | null;
};

export type DbPost = {
  id: string;
  user_id: string;
  kind: string;
  media_url: string;
  media_type: string;
  caption: string;
  hashtags: string[];
  location: string | null;
  audio: string | null;
  allow_download: boolean;
  created_at: string;
};

export type SocialPost = DbPost & {
  author: User;
  likeCount: number;
  commentCount: number;
  likedByMe: boolean;
};

const hueFromId = (id: string) => {
  let h = 0;
  for (let i = 0; i < id.length; i++) h = (h * 31 + id.charCodeAt(i)) % 360;
  return h;
};

const toUser = (p: DbProfile | undefined, id: string): User => ({
  id,
  username: p?.username ?? `user${id.slice(0, 4)}`,
  name: p?.display_name ?? p?.username ?? "YourWorld user",
  hue: hueFromId(id),
});

export function timeAgo(iso: string) {
  const s = Math.max(1, Math.round((Date.now() - new Date(iso).getTime()) / 1000));
  if (s < 60) return `${s}s ago`;
  if (s < 3600) return `${Math.round(s / 60)}m ago`;
  if (s < 86400) return `${Math.round(s / 3600)}h ago`;
  return `${Math.round(s / 86400)}d ago`;
}

/** Live list of posts of a given kind, with author, like and comment counts. */
export function useSocialPosts(kind: "post" | "reel") {
  const [rows, setRows] = useState<SocialPost[]>([]);
  const [loading, setLoading] = useState(true);
  const [me, setMe] = useState<string | null>(null);

  const load = useCallback(async () => {
    const { data: sessionData } = await supabase.auth.getSession();
    const uid = sessionData.session?.user.id ?? null;
    setMe(uid);

    const { data: posts, error } = await supabase
      .from("posts")
      .select("*")
      .eq("kind", kind)
      .order("created_at", { ascending: false })
      .limit(50);

    if (error || !posts?.length) {
      setRows([]);
      setLoading(false);
      return;
    }

    const ids = posts.map((p) => p.id);
    const authorIds = [...new Set(posts.map((p) => p.user_id))];

    const [{ data: profiles }, { data: likes }, { data: comments }] = await Promise.all([
      supabase.from("profiles").select("id,username,display_name,avatar_url").in("id", authorIds),
      supabase.from("post_likes").select("post_id,user_id").in("post_id", ids),
      supabase.from("post_comments").select("post_id").in("post_id", ids),
    ]);

    const profileById = new Map((profiles ?? []).map((p) => [p.id, p as DbProfile]));

    setRows(
      posts.map((p) => ({
        ...(p as DbPost),
        author: toUser(profileById.get(p.user_id), p.user_id),
        likeCount: (likes ?? []).filter((l) => l.post_id === p.id).length,
        commentCount: (comments ?? []).filter((c) => c.post_id === p.id).length,
        likedByMe: !!uid && (likes ?? []).some((l) => l.post_id === p.id && l.user_id === uid),
      })),
    );
    setLoading(false);
  }, [kind]);

  useEffect(() => {
    void load();
    const channel = supabase
      .channel(`social-${kind}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "posts" }, () => void load())
      .on("postgres_changes", { event: "*", schema: "public", table: "post_likes" }, () => void load())
      .on("postgres_changes", { event: "*", schema: "public", table: "post_comments" }, () => void load())
      .subscribe();
    return () => {
      void supabase.removeChannel(channel);
    };
  }, [kind, load]);

  const toggleLike = useCallback(
    async (postId: string) => {
      if (!me) return;
      const row = rows.find((r) => r.id === postId);
      if (!row) return;
      // optimistic
      setRows((prev) =>
        prev.map((r) =>
          r.id === postId
            ? { ...r, likedByMe: !r.likedByMe, likeCount: r.likeCount + (r.likedByMe ? -1 : 1) }
            : r,
        ),
      );
      if (row.likedByMe) {
        await supabase.from("post_likes").delete().eq("post_id", postId).eq("user_id", me);
      } else {
        await supabase.from("post_likes").insert({ post_id: postId, user_id: me });
      }
    },
    [me, rows],
  );

  return { posts: rows, loading, currentUserId: me, toggleLike, reload: load };
}

export type DbMessage = {
  id: string;
  thread_id: string;
  sender_id: string;
  content: string;
  media_url: string | null;
  media_type: string;
  is_read: boolean;
  created_at: string;
};

/** Live messages for one chat thread. */
export function useThreadMessages(threadId: string) {
  const [messages, setMessages] = useState<DbMessage[]>([]);
  const [me, setMe] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    const { data } = await supabase
      .from("direct_messages")
      .select("*")
      .eq("thread_id", threadId)
      .order("created_at", { ascending: true })
      .limit(200);
    setMessages((data ?? []) as DbMessage[]);
    setLoading(false);
  }, [threadId]);

  useEffect(() => {
    void supabase.auth.getSession().then(({ data }) => setMe(data.session?.user.id ?? null));
    void load();
    const channel = supabase
      .channel(`thread-${threadId}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "direct_messages", filter: `thread_id=eq.${threadId}` },
        () => void load(),
      )
      .subscribe();
    return () => {
      void supabase.removeChannel(channel);
    };
  }, [threadId, load]);

  const send = useCallback(
    async (payload: { content?: string; media_url?: string | null; media_type?: string }) => {
      if (!me) return { error: "no-session" as const };
      const { error } = await supabase.from("direct_messages").insert({
        thread_id: threadId,
        sender_id: me,
        content: payload.content ?? "",
        media_url: payload.media_url ?? null,
        media_type: payload.media_type ?? "text",
      });
      return { error: error?.message ?? null };
    },
    [me, threadId],
  );

  const remove = useCallback(async (ids: string[]) => {
    if (!ids.length) return;
    setMessages((prev) => prev.filter((m) => !ids.includes(m.id)));
    await supabase.from("direct_messages").delete().in("id", ids);
  }, []);

  return useMemo(
    () => ({ messages, loading, currentUserId: me, send, remove, reload: load }),
    [messages, loading, me, send, remove, load],
  );
}
