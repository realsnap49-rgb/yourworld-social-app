/** Tiny localStorage cache so chat/media UI can paint instantly before the network answers. */

const PREFIX = "yw:cache:";

export function cacheGet<T>(key: string, maxAgeMs = 1000 * 60 * 60 * 24): T | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(PREFIX + key);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as { t: number; v: T };
    if (!parsed || Date.now() - parsed.t > maxAgeMs) return null;
    return parsed.v;
  } catch {
    return null;
  }
}

export function cacheSet<T>(key: string, value: T) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(PREFIX + key, JSON.stringify({ t: Date.now(), v: value }));
  } catch {
    /* quota full — cache is best-effort */
  }
}
