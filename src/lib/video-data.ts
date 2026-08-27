import { useCallback, useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { cacheGet, cacheSet } from "@/lib/local-cache";
import { rememberLocalMedia, timeAgo, type DbProfile } from "@/lib/social-data";
import { uploadWithProgress } from "@/lib/storage-upload";

export const VIDEO_CATEGORIES = [
  "Vlog",
  "Podcast",
  "Tutorial",
  "Tech",
  "Gaming",
  "Music",
  "Travel",
  "Fitness",
  "Comedy",
  "Education",
  "News",
  "Food",
] as const;

export type VideoCategory = (typeof VIDEO_CATEGORIES)[number];

export type LongVideo = {
  id: string;
  userId: string;
  title: string;
  caption: string;
  mediaUrl: string;
  thumbnailUrl: string | null;
  orientation: "landscape" | "portrait";
  durationSeconds: number | null;
  views: number;
  hashtags: string[];
  createdAt: string;
  scheduledAt: string | null;
  author: { name: string; username: string; letter: string };
  likeCount: number;
  commentCount: number;
  likedByMe: boolean;
};

export const formatDuration = (s: number | null | undefined) => {
  if (!s || s < 0) return "0:00";
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = Math.floor(s % 60);
  return h > 0
    ? `${h}:${String(m).padStart(2, "0")}:${String(sec).padStart(2, "0")}`
    : `${m}:${String(sec).padStart(2, "0")}`;
};

export const formatViews = (n: number) =>
  n >= 1_000_000
    ? `${(n / 1_000_000).toFixed(1).replace(/\.0$/, "")}M views`
    : n >= 1_000
      ? `${(n / 1_000).toFixed(1).replace(/\.0$/, "")}K views`
      : `${n} ${n === 1 ? "view" : "views"}`;

export { timeAgo };

async function uploadToStorage(
  blobUrl: string,
  uid: string,
  ext: string,
  fallbackType: string,
  onProgress?: (p: number) => void,
): Promise<string | null> {
  try {
    const blob = await (await fetch(blobUrl)).blob();
    const path = `${uid}/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;
    const { url } = await uploadWithProgress(
      "reels",
      path,
      blob,
      blob.type || fallbackType,
      onProgress,
    );
    return url;
  } catch {
    return null;
  }
}

/** Uploads a long-form video (and optional custom thumbnail) and stores the post. */
export async function publishLongVideo(opts: {
  fileUrl: string;
  thumbnailUrl?: string | null;
  title: string;
  description?: string;
  tags?: string[];
  orientation: "landscape" | "portrait";
  durationSeconds?: number | null;
  scheduledAt?: string | null;
  onProgress?: (percent: number) => void;
}): Promise<{ error: string | null }> {
  const { data: sessionData } = await supabase.auth.getSession();
  const uid = sessionData.session?.user.id;
  if (!uid) return { error: "You need to sign in to publish a video." };

  let mediaUrl = opts.fileUrl;
  if (/^(blob:|data:)/.test(mediaUrl)) {
    // Reserve the last few percent for the thumbnail + database write.
    const up = await uploadToStorage(mediaUrl, uid, "mp4", "video/mp4", (p) =>
      opts.onProgress?.(Math.min(97, Math.round(p * 0.97))),
    );
    if (!up) return { error: "Video upload failed. Please try again." };
    mediaUrl = up;
  }

  let thumb = opts.thumbnailUrl ?? null;
  if (thumb && /^(blob:|data:)/.test(thumb)) {
    thumb = await uploadToStorage(thumb, uid, "jpg", "image/jpeg");
  }

  const { error } = await supabase.from("posts").insert({
    user_id: uid,
    kind: "video",
    media_url: mediaUrl,
    media_type: "video",
    title: opts.title.trim(),
    caption: opts.description ?? "",
    hashtags: opts.tags ?? [],
    thumbnail_url: thumb,
    orientation: opts.orientation,
    duration_seconds: opts.durationSeconds ? Math.round(opts.durationSeconds) : null,
    scheduled_at: opts.scheduledAt ?? null,
    allow_download: true,
    audience: "everyone",
    tagged_user_ids: [],
    viewer_user_ids: [],
  });

  opts.onProgress?.(100);
  if (!error) rememberLocalMedia(mediaUrl, opts.fileUrl);
  return { error: error?.message ?? null };
}

/** Live list of published long videos (scheduled ones appear at their release time). */
export function useLongVideos() {
  const cached = useMemo(() => cacheGet<LongVideo[]>("long-videos", 10 * 60_000), []);
  const [videos, setVideos] = useState<LongVideo[]>(cached ?? []);
  const [loading, setLoading] = useState(!cached?.length);
  const [me, setMe] = useState<string | null>(null);

  const load = useCallback(async () => {
    const { data: sessionData } = await supabase.auth.getSession();
    const uid = sessionData.session?.user.id ?? null;
    setMe(uid);

    const { data: posts } = await supabase
      .from("posts")
      .select("*")
      .eq("kind", "video")
      .order("created_at", { ascending: false })
      .limit(30);

    if (!posts?.length) {
      setVideos([]);
      setLoading(false);
      return;
    }

    const now = Date.now();
    const visible = posts.filter(
      (p) =>
        !p.scheduled_at ||
        new Date(p.scheduled_at).getTime() <= now ||
        (uid && p.user_id === uid),
    );

    const ids = visible.map((p) => p.id);
    const authorIds = [...new Set(visible.map((p) => p.user_id))];

    const [{ data: profiles }, { data: likes }, { data: comments }] = await Promise.all([
      supabase.rpc("get_public_profiles", { ids: authorIds }),
      supabase.from("post_likes").select("post_id,user_id").in("post_id", ids),
      supabase.from("post_comments").select("post_id").in("post_id", ids),
    ]);

    const byId = new Map(((profiles ?? []) as DbProfile[]).map((p) => [p.id, p]));

    const next: LongVideo[] = visible.map((p) => {
        const prof = byId.get(p.user_id);
        const username = prof?.username ?? `user${p.user_id.slice(0, 4)}`;
        const name = prof?.display_name ?? username;
        return {
          id: p.id,
          userId: p.user_id,
          title: p.title || p.caption || "Untitled video",
          caption: p.caption ?? "",
          mediaUrl: p.media_url,
          thumbnailUrl: p.thumbnail_url,
          orientation: p.orientation === "portrait" ? "portrait" : "landscape",
          durationSeconds: p.duration_seconds,
          views: p.views ?? 0,
          hashtags: p.hashtags ?? [],
          createdAt: p.created_at,
          scheduledAt: p.scheduled_at,
          author: { name, username, letter: (name || "Y").charAt(0).toUpperCase() },
          likeCount: (likes ?? []).filter((l) => l.post_id === p.id).length,
          commentCount: (comments ?? []).filter((c) => c.post_id === p.id).length,
          likedByMe: !!uid && (likes ?? []).some((l) => l.post_id === p.id && l.user_id === uid),
        } satisfies LongVideo;
    });
    setVideos(next);
    cacheSet("long-videos", next.slice(0, 15));
    setLoading(false);
  }, []);

  useEffect(() => {
    void load();
    let timer: number | undefined;
    const queue = () => {
      window.clearTimeout(timer);
      timer = window.setTimeout(() => void load(), 500);
    };
    let channel: ReturnType<typeof supabase.channel> | null = null;
    const boot = window.setTimeout(() => {
      channel = supabase
        .channel("long-videos")
        .on("postgres_changes", { event: "*", schema: "public", table: "posts" }, queue)
        .subscribe();
    }, 300);
    return () => {
      window.clearTimeout(boot);
      window.clearTimeout(timer);
      if (channel) void supabase.removeChannel(channel);
    };
  }, [load]);

  const countView = useCallback(async (id: string) => {
    setVideos((prev) => prev.map((v) => (v.id === id ? { ...v, views: v.views + 1 } : v)));
    const { data: sessionData } = await supabase.auth.getSession();
    const uid = sessionData.session?.user.id;
    if (!uid) return; // views are only logged for signed-in users
    await supabase.from("post_views").insert({ post_id: id, viewer_id: uid });
  }, []);

  const toggleLike = useCallback(
    async (id: string) => {
      if (!me) throw new Error("Sign in required");
      let wasLiked = false;
      setVideos((prev) =>
        prev.map((v) => {
          if (v.id !== id) return v;
          wasLiked = v.likedByMe;
          return { ...v, likedByMe: !v.likedByMe, likeCount: v.likeCount + (v.likedByMe ? -1 : 1) };
        }),
      );
      const { error } = wasLiked
        ? await supabase.from("post_likes").delete().eq("post_id", id).eq("user_id", me)
        : await supabase.from("post_likes").insert({ post_id: id, user_id: me });
      if (error) {
        setVideos((prev) =>
          prev.map((v) =>
            v.id === id
              ? { ...v, likedByMe: wasLiked, likeCount: v.likeCount + (wasLiked ? 1 : -1) }
              : v,
          ),
        );
        throw error;
      }
    },
    [me],
  );

  return { videos, loading, currentUserId: me, countView, toggleLike, reload: load };
}
