// ============= Fullscreen video queue =============
// The feed keeps a live snapshot of its videos here so a player in
// fullscreen can swipe to the next/previous video of the SAME orientation:
// landscape fullscreen queues only horizontal videos, portrait fullscreen
// queues only vertical ones.

export type QueueItem = {
  id: string;
  title: string;
  mediaUrl: string;
  thumbnailUrl?: string | null;
  portrait: boolean;
};

let queue: QueueItem[] = [];

export function setVideoQueue(items: QueueItem[]) {
  queue = items;
}

export function getVideoQueue(): QueueItem[] {
  return queue;
}

/** Next (dir=1) or previous (dir=-1) item matching the given orientation. */
export function getAdjacentVideo(
  currentId: string,
  portrait: boolean,
  dir: 1 | -1,
): QueueItem | null {
  const matching = queue.filter((item) => item.portrait === portrait);
  if (matching.length === 0) return null;
  const index = matching.findIndex((item) => item.id === currentId);
  if (index === -1) return dir === 1 ? matching[0] : matching[matching.length - 1];
  const next = index + dir;
  if (next < 0 || next >= matching.length) return null;
  return matching[next];
}

/** Warm the browser cache for a media URL so playback starts instantly. */
const warmed = new Map<string, HTMLVideoElement>();

export function warmVideo(url: string) {
  if (typeof document === "undefined" || !url || warmed.has(url)) return;
  const el = document.createElement("video");
  el.preload = "auto";
  el.muted = true;
  el.playsInline = true;
  el.src = url;
  try {
    el.load();
  } catch {
    /* ignore */
  }
  warmed.set(url, el);
  if (warmed.size > 6) {
    const oldest = warmed.keys().next().value;
    if (oldest) {
      const victim = warmed.get(oldest);
      if (victim) {
        victim.removeAttribute("src");
        victim.load();
      }
      warmed.delete(oldest);
    }
  }
}
