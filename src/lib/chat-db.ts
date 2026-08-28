/**
 * IndexedDB-backed chat history cache (Telegram/WhatsApp style local-first store).
 * Threads paint from disk instantly — even offline — before the network answers.
 */
import { get, set, createStore } from "idb-keyval";

const store =
  typeof window === "undefined" ? null : createStore("yw-chat", "threads");

/** How many messages we keep on device per conversation. */
export const CACHE_LIMIT = 200;
/** Page size for server fetches / infinite scroll. */
export const PAGE_SIZE = 40;

export async function loadCachedThread<T>(key: string): Promise<T[] | null> {
  if (!store) return null;
  try {
    return ((await get(key, store)) as T[] | undefined) ?? null;
  } catch {
    return null;
  }
}

export function saveCachedThread<T>(key: string, rows: T[]) {
  if (!store) return;
  try {
    void set(key, rows.slice(-CACHE_LIMIT), store);
  } catch {
    /* best-effort */
  }
}
