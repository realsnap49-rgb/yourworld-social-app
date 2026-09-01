/**
 * Offline fallback data.
 *
 * Used only when the backend is unreachable (network failure, missing env,
 * cold preview) so the feed and editor paint instantly instead of hanging on
 * an endless loading spinner.
 */

import type { LongVideo } from "@/lib/video-data";

/** Resolves the promise, or falls back after `ms` if the network hangs. */
export async function withTimeout<T>(promise: Promise<T>, ms: number, fallback: T): Promise<T> {
  let timer: ReturnType<typeof setTimeout> | undefined;
  const timeout = new Promise<T>((resolve) => {
    timer = setTimeout(() => resolve(fallback), ms);
  });
  try {
    return await Promise.race([promise, timeout]);
  } finally {
    if (timer) clearTimeout(timer);
  }
}

const SAMPLE = [
  {
    id: "offline-1",
    title: "Sunrise over the coast — 4K ambient",
    caption: "Demo clip shown while you're offline.",
    mediaUrl: "https://storage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4",
    thumbnailUrl:
      "https://storage.googleapis.com/gtv-videos-bucket/sample/images/BigBuckBunny.jpg",
    orientation: "landscape" as const,
    durationSeconds: 596,
    views: 12400,
    name: "YourWorld",
    username: "yourworld",
  },
  {
    id: "offline-2",
    title: "City nights — vertical cut",
    caption: "Demo clip shown while you're offline.",
    mediaUrl: "https://storage.googleapis.com/gtv-videos-bucket/sample/ElephantsDream.mp4",
    thumbnailUrl:
      "https://storage.googleapis.com/gtv-videos-bucket/sample/images/ElephantsDream.jpg",
    orientation: "portrait" as const,
    durationSeconds: 653,
    views: 8210,
    name: "Studio YW",
    username: "studioyw",
  },
];

export const OFFLINE_LONG_VIDEOS: LongVideo[] = SAMPLE.map((s, i) => ({
  id: s.id,
  userId: `offline-user-${i + 1}`,
  title: s.title,
  caption: s.caption,
  mediaUrl: s.mediaUrl,
  thumbnailUrl: s.thumbnailUrl,
  orientation: s.orientation,
  durationSeconds: s.durationSeconds,
  views: s.views,
  hashtags: ["demo"],
  createdAt: new Date(Date.now() - (i + 1) * 3_600_000).toISOString(),
  scheduledAt: null,
  author: { name: s.name, username: s.username, letter: s.name.charAt(0).toUpperCase() },
  likeCount: 0,
  commentCount: 0,
  likedByMe: false,
}));
