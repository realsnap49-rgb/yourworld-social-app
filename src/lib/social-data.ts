import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { cacheGet, cacheSet } from "@/lib/local-cache";
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

/* -------------------------------------------------------------------------
 * Media URL resolution for reels/posts
 * ---------------------------------------------------------------------- */

/** Local blob URLs kept for media the current session just uploaded. */
const localMedia = new Map<string, string>();

/** Remember a local blob/object URL as a fallback for a remote media URL. */
export function rememberLocalMedia(remoteUrl: string, localUrl: string) {
  if (remoteUrl && /^(blob:|data:)/.test(localUrl)) localMedia.set(remoteUrl, localUrl);
}

export function getLocalMedia(remoteUrl: string) {
  return localMedia.get(remoteUrl) ?? null;
}

const signedCache = new Map<string, string>();

function storagePathFrom(url: string, bucket: string): string | null {
  if (!/^https?:/.test(url)) return url.replace(/^\/+/, "");
  const m = url.match(new RegExp(`/storage/v1/object/(?:sign|public)/${bucket}/([^?]+)`));
  return m ? decodeURIComponent(m[1]) : null;
}

/**
 * Turns a stored media reference into a URL the <video>/<img> tag can load.
 * Handles bare storage paths and expired signed URLs by re-signing, and falls
 * back to the bucket's public URL.
 */
export async function resolveMediaUrl(url: string, bucket = "reels"): Promise<string> {
  if (!url) return url;
  if (/^(blob:|data:)/.test(url)) return url;
  const cached = signedCache.get(url);
  if (cached) return cached;

  const path = storagePathFrom(url, bucket);
  if (!path) return url;

  const { data } = await supabase.storage.from(bucket).createSignedUrl(path, 60 * 60 * 24);
  const next =
    data?.signedUrl ?? supabase.storage.from(bucket).getPublicUrl(path).data.publicUrl ?? url;
  signedCache.set(url, next);
  return next;
}

/** Live list of posts of a given kind, with author, like and comment counts. */
export function useSocialPosts(kind: "post" | "reel") {
  const [rows, setRows] = useState<SocialPost[]>([]);
  const [loading, setLoading] = useState(true);
  const [me, setMe] = useState<string | null>(null);
  // While the user is interacting we keep the optimistic state and skip
  // realtime refetches so the UI never flickers back to the old value.
  const muteUntil = useRef(0);

  const load = useCallback(async () => {
    if (Date.now() < muteUntil.current) return;
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
      supabase.rpc("get_public_profiles", { ids: authorIds }),
      supabase.from("post_likes").select("post_id,user_id").in("post_id", ids),
      supabase.from("post_comments").select("post_id").in("post_id", ids),
    ]);

    const profileById = new Map(
      ((profiles ?? []) as DbProfile[]).map((p) => [p.id, p]),
    );

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
      muteUntil.current = Date.now() + 1500;
      let wasLiked = false;
      // optimistic, instant
      setRows((prev) =>
        prev.map((r) => {
          if (r.id !== postId) return r;
          wasLiked = !!r.likedByMe;
          return { ...r, likedByMe: !r.likedByMe, likeCount: r.likeCount + (r.likedByMe ? -1 : 1) };
        }),
      );
      if (wasLiked) {
        await supabase.from("post_likes").delete().eq("post_id", postId).eq("user_id", me);
      } else {
        await supabase.from("post_likes").insert({ post_id: postId, user_id: me });
      }
    },
    [me],
  );

  /** Optimistically bump a post's comment count (call when a comment is posted). */
  const bumpComment = useCallback((postId: string, delta = 1) => {
    muteUntil.current = Date.now() + 1500;
    setRows((prev) =>
      prev.map((r) =>
        r.id === postId
          ? { ...r, commentCount: Math.max(0, r.commentCount + delta) }
          : r,
      ),
    );
  }, []);

  return { posts: rows, loading, currentUserId: me, toggleLike, bumpComment, reload: load };
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

/** Uploads a rendered reel and inserts it into the posts table (kind = "reel"). */
export async function publishReel(opts: {
  fileUrl: string;
  caption?: string;
  hashtags?: string[];
  audio?: string | null;
  allowDownload?: boolean;
  location?: string | null;
  link?: string | null;
  audience?: "everyone" | "close_friends";
  taggedUserIds?: string[];
  viewerUserIds?: string[];
}): Promise<{ error: string | null }> {
  const { data: sessionData } = await supabase.auth.getSession();
  const uid = sessionData.session?.user.id;
  if (!uid) return { error: "You need to sign in to post a reel." };

  let mediaUrl = opts.fileUrl;

  // Blob/object URLs must be uploaded to storage first.
  if (/^(blob:|data:)/.test(opts.fileUrl)) {
    try {
      const blob = await (await fetch(opts.fileUrl)).blob();
      const ext = blob.type.includes("webm") ? "webm" : "mp4";
      const path = `${uid}/${Date.now()}.${ext}`;
      const { error: upErr } = await supabase.storage
        .from("reels")
        .upload(path, blob, { contentType: blob.type || "video/mp4", upsert: false });
      if (upErr) return { error: upErr.message };
      const { data: signed } = await supabase.storage
        .from("reels")
        .createSignedUrl(path, 60 * 60 * 24 * 365);
      mediaUrl = signed?.signedUrl ?? path;
    } catch (e) {
      return { error: e instanceof Error ? e.message : "Upload failed" };
    }
  }

  const { error } = await supabase.from("posts").insert({
    user_id: uid,
    kind: "reel",
    media_url: mediaUrl,
    media_type: "video",
    caption: opts.caption ?? "",
    hashtags: opts.hashtags ?? [],
    audio: opts.audio ?? null,
    allow_download: opts.allowDownload ?? true,
    location: opts.location ?? null,
    link: opts.link ?? null,
    audience: opts.audience ?? "everyone",
    tagged_user_ids: opts.taggedUserIds ?? [],
    viewer_user_ids: opts.viewerUserIds ?? [],
  });
  if (!error) rememberLocalMedia(mediaUrl, opts.fileUrl);
  return { error: error?.message ?? null };
}

/** Live messages for one chat thread. */
export function useThreadMessages(threadId: string, opts: { staleTime?: number } = {}) {
  const staleTime = opts.staleTime ?? 0;
  // Hydrate instantly from the local cache so the thread paints with zero wait.
  const [messages, setMessages] = useState<DbMessage[]>(
    () => cacheGet<DbMessage[]>(`thread:${threadId}`) ?? [],
  );
  const [me, setMe] = useState<string | null>(null);
  const [loading, setLoading] = useState(
    () => (cacheGet<DbMessage[]>(`thread:${threadId}`) ?? []).length === 0,
  );
  const messagesRef = useRef<DbMessage[]>([]);
  useEffect(() => {
    messagesRef.current = messages;
    // Persist a small tail of the thread for the next instant open.
    cacheSet(
      `thread:${threadId}`,
      messages.filter((m) => !m.id.startsWith("tmp-")).slice(-40),
    );
  }, [messages, threadId]);

  const load = useCallback(async () => {
    const { data } = await supabase
      .from("direct_messages")
      .select("id,thread_id,sender_id,content,media_url,media_type,is_read,created_at")
      .eq("thread_id", threadId)
      .order("created_at", { ascending: false })
      .limit(20);
    const rows = ((data ?? []) as DbMessage[]).slice().reverse();
    // Keep any still-pending optimistic messages on screen.
    setMessages((prev) => [...rows, ...prev.filter((m) => m.id.startsWith("tmp-"))]);
    setLoading(false);
  }, [threadId]);

  useEffect(() => {
    void supabase.auth.getSession().then(({ data }) => setMe(data.session?.user.id ?? null));
    void load();

    let channel: ReturnType<typeof supabase.channel> | null = null;
    let retry: ReturnType<typeof setTimeout> | null = null;
    let alive = true;
    let subscribeCount = 0;

    const upsert = (row: DbMessage) =>
      setMessages((prev) =>
        prev.some((m) => m.id === row.id)
          ? prev.map((m) => (m.id === row.id ? row : m))
          : [...prev, row].sort((a, b) => a.created_at.localeCompare(b.created_at)),
      );

    const subscribe = () => {
      if (!alive) return;
      subscribeCount++;
      channel = supabase
        .channel(`thread-${threadId}-${Math.random().toString(36).slice(2)}`)
        .on(
          "postgres_changes",
          { event: "*", schema: "public", table: "direct_messages", filter: `thread_id=eq.${threadId}` },
          (payload) => {
            // Apply the change instantly from the payload, no round-trip needed.
            if (payload.eventType === "DELETE") {
              const gone = (payload.old as { id?: string })?.id;
              if (gone) setMessages((prev) => prev.filter((m) => m.id !== gone));
              return;
            }
            const row = payload.new as DbMessage | undefined;
            if (row?.id) upsert(row);
            else void load();
          },
        )
        .subscribe((status) => {
          // Realtime sockets drop on sleep / network changes — rejoin and resync.
          if (status === "CHANNEL_ERROR" || status === "TIMED_OUT" || status === "CLOSED") {
            if (channel) void supabase.removeChannel(channel);
            channel = null;
            if (!alive) return;
            retry = setTimeout(subscribe, 1500);
          } else if (status === "SUBSCRIBED") {
            // Only catch up on a reconnect — never on the first join and never
            // on each new message. Realtime payloads drive live updates, so a
            // full refetch would just flicker the thread back to the old state.
            if (subscribeCount > 1) void load();
          }
        });
    };
    subscribe();

    const resync = () => {
      // With staleTime: Infinity the thread is treated as never stale — realtime
      // reconnects (above) already catch up, so skip the full refetch here.
      if (staleTime === Infinity) return;
      if (document.visibilityState === "visible") void load();
    };
    document.addEventListener("visibilitychange", resync);
    window.addEventListener("online", resync);

    return () => {
      alive = false;
      if (retry) clearTimeout(retry);
      document.removeEventListener("visibilitychange", resync);
      window.removeEventListener("online", resync);
      if (channel) void supabase.removeChannel(channel);
    };
  }, [threadId, load]);

  const send = useCallback(
    async (payload: { content?: string; media_url?: string | null; media_type?: string }) => {
      if (!me) return { error: "no-session" as const };
      // Optimistic: show the message immediately, reconcile when the insert lands.
      const tempId = `tmp-${Date.now()}-${Math.random().toString(36).slice(2)}`;
      const optimistic: DbMessage = {
        id: tempId,
        thread_id: threadId,
        sender_id: me,
        content: payload.content ?? "",
        media_url: payload.media_url ?? null,
        media_type: payload.media_type ?? "text",
        is_read: false,
        created_at: new Date().toISOString(),
      };
      setMessages((prev) => [...prev, optimistic]);

      const { data, error } = await supabase.from("direct_messages").insert({
        thread_id: threadId,
        sender_id: me,
        content: payload.content ?? "",
        media_url: payload.media_url ?? null,
        media_type: payload.media_type ?? "text",
      }).select("*").maybeSingle();
      if (error) {
        setMessages((prev) => prev.filter((m) => m.id !== tempId));
      } else if (data) {
        const row = data as DbMessage;
        setMessages((prev) =>
          prev.some((m) => m.id === row.id)
            ? prev.filter((m) => m.id !== tempId)
            : prev.map((m) => (m.id === tempId ? row : m)),
        );
      }
      return { error: error?.message ?? null };
    },
    [me, threadId],
  );

  const remove = useCallback(async (ids: string[]) => {
    if (!ids.length) return;
    setMessages((prev) => prev.filter((m) => !ids.includes(m.id)));
    await supabase.from("direct_messages").delete().in("id", ids);
  }, []);

  /** Marks incoming messages as read (blue ticks on the sender's side). */
  const markRead = useCallback(
    async (ids: string[]) => {
      if (!me || !ids.length) return;
      setMessages((prev) => prev.map((m) => (ids.includes(m.id) ? { ...m, is_read: true } : m)));
      await supabase.from("direct_messages").update({ is_read: true }).in("id", ids);
    },
    [me],
  );

  /** Burns a view-once photo after the recipient opened it (permanent, both sides). */
  const burnMedia = useCallback(async (id: string) => {
    const row = messagesRef.current.find((m) => m.id === id);
    setMessages((prev) =>
      prev.map((m) =>
        m.id === id ? { ...m, media_url: null, media_type: "image_once_opened", content: "" } : m,
      ),
    );
    // Runs as a security-definer RPC so the *recipient* can erase it too.
    await supabase.rpc("burn_view_once", { _msg_id: id });
    // Remove the underlying storage object when the media lived in a bucket.
    const url = row?.media_url;
    if (url && /^https?:/.test(url)) {
      for (const bucket of ["chat", "reels"]) {
        const path = storagePathFrom(url, bucket);
        if (path && path !== url) {
          await supabase.storage.from(bucket).remove([path]);
          break;
        }
      }
    }
  }, []);

  return useMemo(
    () => ({ messages, loading, currentUserId: me, send, remove, markRead, burnMedia, reload: load }),
    [messages, loading, me, send, remove, markRead, burnMedia, load],
  );
}

/** Resolves the other participant of a DM thread (id + display name). */
export async function resolveThreadPeer(
  threadId: string,
  me: string | null,
): Promise<{ peerId: string | null; peerName: string; avatarUrl: string | null }> {
  let peerId: string | null = null;

  const { data: parts } = await supabase
    .from("thread_participants")
    .select("user_id")
    .eq("thread_id", threadId);
  peerId = (parts ?? []).map((p) => p.user_id).find((id) => id !== me) ?? null;

  if (!peerId) {
    // Fall back to whoever has sent a message in this thread.
    const { data: msgs } = await supabase
      .from("direct_messages")
      .select("sender_id")
      .eq("thread_id", threadId)
      .limit(50);
    peerId = (msgs ?? []).map((m) => m.sender_id).find((id) => id !== me) ?? null;
  }

  // A thread id can also simply be the peer's user id (deep link / new chat).
  if (!peerId && /^[0-9a-f-]{36}$/i.test(threadId) && threadId !== me) peerId = threadId;

  if (!peerId) return { peerId: null, peerName: "Unknown user", avatarUrl: null };

  const { data: profileRows } = await supabase.rpc("get_public_profiles", {
    ids: [peerId],
  });
  const profile = ((profileRows ?? []) as DbProfile[])[0] ?? null;

  return {
    peerId,
    peerName:
      profile?.display_name || profile?.username || `User ${peerId.slice(0, 6)}`,
    avatarUrl: profile?.avatar_url ?? null,
  };
}

export function useThreadPeer(threadId: string, me: string | null) {
  const [peer, setPeer] = useState<{
    peerId: string | null;
    peerName: string;
    avatarUrl: string | null;
  }>({ peerId: null, peerName: "", avatarUrl: null });

  useEffect(() => {
    let alive = true;
    void resolveThreadPeer(threadId, me).then((p) => {
      if (alive) setPeer(p);
    });
    return () => {
      alive = false;
    };
  }, [threadId, me]);

  return peer;
}
