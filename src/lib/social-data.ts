import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { cacheGet, cacheSet } from "@/lib/local-cache";
import { loadCachedThread, saveCachedThread, PAGE_SIZE } from "@/lib/chat-db";
import { uploadWithProgress } from "@/lib/storage-upload";
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
  views?: number | null;
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
  // Keep the server and first client render identical, then hydrate the local
  // cache after mount. Reading localStorage during render breaks mobile SSR.
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

    const next: SocialPost[] = posts.map((p) => ({
      ...(p as DbPost),
      author: toUser(profileById.get(p.user_id), p.user_id),
      likeCount: (likes ?? []).filter((l) => l.post_id === p.id).length,
      commentCount: (comments ?? []).filter((c) => c.post_id === p.id).length,
      likedByMe: !!uid && (likes ?? []).some((l) => l.post_id === p.id && l.user_id === uid),
    }));
    setRows(next);
    cacheSet(`feed:${kind}`, next.slice(0, 20));
    setLoading(false);
  }, [kind]);

  useEffect(() => {
    const cached = cacheGet<SocialPost[]>(`feed:${kind}`, 10 * 60_000);
    if (cached?.length) {
      setRows(cached);
      setLoading(false);
    }
    void load();
    // Coalesce realtime bursts so a flood of likes never triggers a refetch storm.
    let timer: number | undefined;
    const queue = () => {
      window.clearTimeout(timer);
      timer = window.setTimeout(() => void load(), 500);
    };
    let channel: ReturnType<typeof supabase.channel> | null = null;
    // Subscribe after first paint so the socket handshake doesn't delay render.
    const boot = window.setTimeout(() => {
      channel = supabase
        .channel(`social-${kind}`)
        .on("postgres_changes", { event: "*", schema: "public", table: "posts" }, queue)
        .on("postgres_changes", { event: "*", schema: "public", table: "post_likes" }, queue)
        .on("postgres_changes", { event: "*", schema: "public", table: "post_comments" }, queue)
        .subscribe();
    }, 300);
    return () => {
      window.clearTimeout(boot);
      window.clearTimeout(timer);
      if (channel) void supabase.removeChannel(channel);
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
  onProgress?: (percent: number) => void;
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
      const { url, error: upErr } = await uploadWithProgress(
        "reels",
        path,
        blob,
        blob.type || "video/mp4",
        opts.onProgress,
      );
      if (upErr || !url) return { error: upErr ?? "Upload failed" };
      mediaUrl = url;
    } catch (e) {
      return { error: e instanceof Error ? e.message : "Upload failed" };
    }
  } else {
    opts.onProgress?.(100);
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

/** Uploads a photo/video and inserts it into the posts table (kind = "post"). */
export async function publishPost(opts: {
  fileUrl: string;
  mediaType: "image" | "video";
  caption?: string;
  hashtags?: string[];
  location?: string | null;
  allowDownload?: boolean;
  audience?: "everyone" | "close_friends";
  onProgress?: (percent: number) => void;
}): Promise<{ error: string | null }> {
  const { data: sessionData } = await supabase.auth.getSession();
  const uid = sessionData.session?.user.id;
  if (!uid) return { error: "You need to sign in to create a post." };

  let mediaUrl = opts.fileUrl;

  if (/^(blob:|data:)/.test(opts.fileUrl)) {
    try {
      const blob = await (await fetch(opts.fileUrl)).blob();
      const type = blob.type || (opts.mediaType === "video" ? "video/mp4" : "image/jpeg");
      const ext = type.split("/")[1]?.split(";")[0] || (opts.mediaType === "video" ? "mp4" : "jpg");
      const path = `${uid}/post-${Date.now()}.${ext}`;
      const { url, error: upErr } = await uploadWithProgress(
        "reels",
        path,
        blob,
        type,
        opts.onProgress,
      );
      if (upErr || !url) return { error: upErr ?? "Upload failed" };
      mediaUrl = url;
    } catch (e) {
      return { error: e instanceof Error ? e.message : "Upload failed" };
    }
  } else {
    opts.onProgress?.(100);
  }

  const { error } = await supabase.from("posts").insert({
    user_id: uid,
    kind: "post",
    media_url: mediaUrl,
    media_type: opts.mediaType,
    caption: opts.caption ?? "",
    hashtags: opts.hashtags ?? [],
    location: opts.location ?? null,
    allow_download: opts.allowDownload ?? true,
    audience: opts.audience ?? "everyone",
    tagged_user_ids: [],
    viewer_user_ids: [],
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
  const [hasMore, setHasMore] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const messagesRef = useRef<DbMessage[]>([]);
  useEffect(() => {
    messagesRef.current = messages;
    // Persist a small tail of the thread for the next instant open.
    const persistable = messages.filter((m) => !m.id.startsWith("tmp-"));
    cacheSet(`thread:${threadId}`, persistable.slice(-40));
    saveCachedThread(`dm:${threadId}`, persistable);
  }, [messages, threadId]);

  // Deeper offline history lives in IndexedDB — merge it in as soon as it reads.
  useEffect(() => {
    let alive = true;
    void loadCachedThread<DbMessage>(`dm:${threadId}`).then((rows) => {
      if (!alive || !rows?.length) return;
      setMessages((prev) => {
        const map = new Map(rows.map((r) => [r.id, r]));
        for (const m of prev) map.set(m.id, m);
        return [...map.values()].sort((a, b) => a.created_at.localeCompare(b.created_at));
      });
      setLoading(false);
    });
    return () => {
      alive = false;
    };
  }, [threadId]);

  const load = useCallback(async () => {
    const { data } = await supabase
      .from("direct_messages")
      .select("id,thread_id,sender_id,content,media_url,media_type,is_read,created_at")
      .eq("thread_id", threadId)
      .order("created_at", { ascending: false })
      .limit(PAGE_SIZE);
    const rows = ((data ?? []) as DbMessage[]).slice().reverse();
    setHasMore(rows.length >= PAGE_SIZE);
    // Keep any still-pending optimistic messages plus older pages already loaded.
    setMessages((prev) => {
      const map = new Map(prev.filter((m) => !m.id.startsWith("tmp-")).map((m) => [m.id, m]));
      const oldest = rows[0]?.created_at;
      // Drop stale cached rows that the server no longer returns in this window.
      if (oldest) for (const [id, m] of map) if (m.created_at >= oldest) map.delete(id);
      for (const r of rows) map.set(r.id, r);
      const merged = [...map.values()].sort((a, b) => a.created_at.localeCompare(b.created_at));
      return [...merged, ...prev.filter((m) => m.id.startsWith("tmp-"))];
    });
    setLoading(false);
  }, [threadId]);

  /** Infinite scroll: pull the previous page of older messages. */
  const loadOlder = useCallback(async () => {
    const oldest = messagesRef.current.find((m) => !m.id.startsWith("tmp-"))?.created_at;
    if (!oldest || loadingMore || !hasMore) return;
    setLoadingMore(true);
    const { data } = await supabase
      .from("direct_messages")
      .select("id,thread_id,sender_id,content,media_url,media_type,is_read,created_at")
      .eq("thread_id", threadId)
      .lt("created_at", oldest)
      .order("created_at", { ascending: false })
      .limit(PAGE_SIZE);
    const rows = ((data ?? []) as DbMessage[]).slice().reverse();
    setHasMore(rows.length >= PAGE_SIZE);
    if (rows.length) {
      setMessages((prev) => {
        const map = new Map(rows.map((r) => [r.id, r] as const));
        for (const m of prev) map.set(m.id, m);
        return [...map.values()].sort((a, b) => a.created_at.localeCompare(b.created_at));
      });
    }
    setLoadingMore(false);
  }, [threadId, loadingMore, hasMore]);


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
            const failedChannel = channel;
            channel = null;
            // Never remove synchronously from a CLOSED callback: Realtime emits
            // CLOSED during removal, which can recurse until mobile Safari's
            // call stack is exhausted.
            if (failedChannel && status !== "CLOSED") {
              window.setTimeout(() => void supabase.removeChannel(failedChannel), 0);
            }
            if (!alive) return;
            if (!retry) {
              retry = setTimeout(() => {
                retry = null;
                subscribe();
              }, 1500);
            }
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
    const remaining = messagesRef.current.filter((m) => m.id !== id);
    messagesRef.current = remaining;
    setMessages(remaining);
    // Update the persistent cache immediately so reopening the chat cannot
    // briefly restore media that has already been viewed.
    cacheSet(`thread:${threadId}`, remaining.filter((m) => !m.id.startsWith("tmp-")).slice(-40));
    await supabase.rpc("burn_view_once", { _msg_id: id });
    // Remove the underlying storage object when the media lived in a bucket.
    const url = row?.media_url;
    if (url && /^https?:/.test(url)) {
      for (const bucket of ["chat-files", "reels"]) {
        const path = storagePathFrom(url, bucket);
        if (path && path !== url) {
          await supabase.storage.from(bucket).remove([path]);
          break;
        }
      }
    }
  }, [threadId]);

  return useMemo(
    () => ({ messages, loading, loadingMore, hasMore, loadOlder, currentUserId: me, send, remove, markRead, burnMedia, reload: load }),
    [messages, loading, loadingMore, hasMore, loadOlder, me, send, remove, markRead, burnMedia, load],
  );
}

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** Deterministic thread id for a 1:1 chat — identical for both users. */
export function dmThreadId(a: string, b: string) {
  return `dm_${[a, b].sort().join("_")}`;
}

/** Reads the two user ids out of a canonical thread id. */
export function dmThreadPair(threadId: string): [string, string] | null {
  const m = /^dm_([0-9a-f-]{36})_([0-9a-f-]{36})$/i.exec(threadId);
  return m ? [m[1]!, m[2]!] : null;
}

/** Resolves the other participant of a DM thread (id + display name). */
export async function resolveThreadPeer(
  threadId: string,
  me: string | null,
): Promise<{ peerId: string | null; peerName: string; avatarUrl: string | null }> {
  let peerId: string | null = null;

  // Canonical thread ids carry both user ids — no extra round trip needed.
  const pair = dmThreadPair(threadId);
  if (pair) peerId = pair.find((id) => id !== me) ?? pair[0];

  if (!peerId) {
    const { data: parts } = await supabase
      .from("thread_participants")
      .select("user_id")
      .eq("thread_id", threadId);
    peerId = (parts ?? []).map((p) => p.user_id).find((id) => id !== me) ?? null;
  }

  if (!peerId) {
    // Fall back to whoever has sent a message in this thread.
    const { data: msgs } = await supabase
      .from("direct_messages")
      .select("sender_id")
      .eq("thread_id", threadId)
      .limit(50);
    peerId = (msgs ?? []).map((m) => m.sender_id).find((id) => id !== me) ?? null;
  }

  // A thread id can also simply be the peer's user id (legacy deep link).
  if (!peerId && UUID_RE.test(threadId) && threadId !== me) peerId = threadId;

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

export type PostComment = {
  id: string;
  userId: string;
  username: string;
  displayName: string;
  avatarUrl: string | null;
  body: string;
  createdAt: string;
};

/** Real comments for a post or reel: live fetch, optimistic post, realtime sync. */
export function usePostComments(postId: string | null) {
  const [comments, setComments] = useState<PostComment[]>([]);
  const [me, setMe] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    if (!postId) {
      setComments([]);
      setLoading(false);
      return;
    }
    const { data: sessionData } = await supabase.auth.getSession();
    const uid = sessionData.session?.user.id ?? null;
    setMe(uid);

    const { data: rows } = await supabase
      .from("post_comments")
      .select("id,post_id,user_id,body,created_at")
      .eq("post_id", postId)
      .order("created_at", { ascending: true });

    if (!rows?.length) {
      setComments([]);
      setLoading(false);
      return;
    }

    const authorIds = [...new Set(rows.map((r) => r.user_id))];
    const { data: profiles } = await supabase.rpc("get_public_profiles", {
      ids: authorIds,
    });
    const profileById = new Map(
      ((profiles ?? []) as DbProfile[]).map((p) => [p.id, p]),
    );

    setComments(
      rows.map((r) => {
        const p = profileById.get(r.user_id);
        return {
          id: r.id,
          userId: r.user_id,
          username: p?.username ?? `user${r.user_id.slice(0, 4)}`,
          displayName: p?.display_name ?? p?.username ?? "YourWorld user",
          avatarUrl: p?.avatar_url ?? null,
          body: r.body,
          createdAt: r.created_at,
        };
      }),
    );
    setLoading(false);
  }, [postId]);

  useEffect(() => {
    void load();
    if (!postId) return;
    // Unique channel name per hook instance: reusing the same topic across two
    // mounted cards makes supabase-js hand back an already-subscribed channel,
    // which throws "cannot add postgres_changes callbacks after subscribe()".
    const topic = `post-comments-${postId}-${Math.random().toString(36).slice(2)}`;
    let channel: ReturnType<typeof supabase.channel> | null = null;
    try {
      channel = supabase
        .channel(topic)
        .on(
          "postgres_changes",
          { event: "*", schema: "public", table: "post_comments", filter: `post_id=eq.${postId}` },
          () => void load(),
        )
        .subscribe();
    } catch (err) {
      console.error("[usePostComments] realtime unavailable", err);
    }
    return () => {
      const ch = channel;
      channel = null;
      if (ch) setTimeout(() => void supabase.removeChannel(ch), 0);
    };
  }, [postId, load]);


  const send = useCallback(
    async (body: string) => {
      if (!postId || !me || !body.trim()) return;
      const text = body.trim();
      const tempId = `tmp-${Date.now()}-${Math.random().toString(36).slice(2)}`;
      // Optimistic: show the comment instantly.
      setComments((prev) => [
        ...prev,
        {
          id: tempId,
          userId: me,
          username: "you",
          displayName: "You",
          avatarUrl: null,
          body: text,
          createdAt: new Date().toISOString(),
        },
      ]);
      const { error } = await supabase
        .from("post_comments")
        .insert({ post_id: postId, user_id: me, body: text })
        .select("id,created_at")
        .maybeSingle();
      if (error) {
        setComments((prev) => prev.filter((c) => c.id !== tempId));
      } else {
        // Replace the optimistic row with the real one (keeps order).
        void load();
      }
    },
    [postId, me, load],
  );

  /** Delete one of my own comments. */
  const remove = useCallback(
    async (id: string) => {
      const snapshot = comments;
      setComments((prev) => prev.filter((c) => c.id !== id));
      const { error } = await supabase.from("post_comments").delete().eq("id", id);
      if (error) setComments(snapshot);
    },
    [comments],
  );

  return { comments, loading, send, remove, me };
}

