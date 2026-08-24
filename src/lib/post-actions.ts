import { useCallback, useEffect, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

/**
 * Real post interactions: saves (bookmarks), view counting and deletion.
 * Likes / comments live in social-data.ts.
 */

const viewed = new Set<string>();

/** Count a view once per session per post. */
export async function registerPostView(postId: string) {
  if (viewed.has(postId)) return;
  viewed.add(postId);
  const { data } = await supabase.auth.getUser();
  await supabase
    .from("post_views")
    .insert({ post_id: postId, viewer_id: data.user?.id ?? null });
}

/** Permanently delete my own post. */
export async function deletePost(postId: string) {
  const { error } = await supabase.from("posts").delete().eq("id", postId);
  if (error) throw error;
}

/** Saved-post bookmarks for the signed-in user, synced with the database. */
export function usePostSaves() {
  const [saved, setSaved] = useState<Record<string, boolean>>({});
  const meRef = useRef<string | null>(null);

  const load = useCallback(async () => {
    const { data: auth } = await supabase.auth.getUser();
    const me = auth.user?.id ?? null;
    meRef.current = me;
    if (!me) {
      setSaved({});
      return;
    }
    const { data } = await supabase.from("post_saves").select("post_id").eq("user_id", me);
    const next: Record<string, boolean> = {};
    for (const row of data ?? []) next[row.post_id] = true;
    setSaved(next);
  }, []);

  useEffect(() => {
    void load();
    const { data: sub } = supabase.auth.onAuthStateChange(() => void load());
    return () => sub.subscription.unsubscribe();
  }, [load]);

  const toggleSave = useCallback(async (postId: string) => {
    const me = meRef.current;
    if (!me) return false;
    let next = false;
    setSaved((prev) => {
      next = !prev[postId];
      return { ...prev, [postId]: next };
    });
    const { error } = next
      ? await supabase.from("post_saves").insert({ post_id: postId, user_id: me })
      : await supabase.from("post_saves").delete().eq("post_id", postId).eq("user_id", me);
    if (error) {
      setSaved((prev) => ({ ...prev, [postId]: !next }));
      throw error;
    }
    return next;
  }, []);

  return { saved, toggleSave, reload: load };
}
