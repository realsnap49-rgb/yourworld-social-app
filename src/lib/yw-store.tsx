import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { fetchMyFollowing, isRealUserId, setFollow } from "@/lib/follow-data";


type Toggles = Record<string, boolean>;

type Store = {
  liked: Toggles;
  saved: Toggles;
  following: Toggles;
  toggleLike: (id: string) => void;
  toggleSave: (id: string) => void;
  toggleFollow: (id: string) => void;
  drafts: Draft[];
  addDraft: (d: Draft) => void;
  removeDraft: (id: string) => void;
};

export type Draft = {
  id: string;
  caption: string;
  hashtags: string;
  privacy: string;
  audience: string;
  allowDownload: boolean;
  mediaName?: string;
};

const StoreContext = createContext<Store | null>(null);

export function YwStoreProvider({ children }: { children: ReactNode }) {
  const [liked, setLiked] = useState<Toggles>({});
  const [saved, setSaved] = useState<Toggles>({});
  const [following, setFollowing] = useState<Toggles>({});
  const [drafts, setDrafts] = useState<Draft[]>([]);
  const meRef = useRef<string | null>(null);


  // Database state is authoritative for follows, likes, and saves.
  useEffect(() => {
    let cancelled = false;
    const sync = async () => {
      try {
        const ids = await fetchMyFollowing();
        if (cancelled) return;
        setFollowing(Object.fromEntries(ids.map((id) => [id, true])));
      } catch {
        /* offline / signed out */
      }
      try {
        const { data: auth } = await supabase.auth.getUser();
        const me = auth.user?.id ?? null;
        meRef.current = me;
        if (!me || cancelled) {
          setLiked({});
          setSaved({});
          return;
        }
        const [likes, saves] = await Promise.all([
          supabase.from("post_likes").select("post_id").eq("user_id", me),
          supabase.from("post_saves").select("post_id").eq("user_id", me),
        ]);
        if (cancelled) return;
        const toToggles = (rows: { post_id: string }[] | null) =>
          Object.fromEntries((rows ?? []).map((row) => [row.post_id, true]));
        setLiked(toToggles(likes.data as { post_id: string }[] | null));
        setSaved(toToggles(saves.data as { post_id: string }[] | null));
      } catch {
        /* offline / signed out */
      }
    };
    void sync();
    const { data: sub } = supabase.auth.onAuthStateChange(() => void sync());
    const channel = supabase
      .channel("yw-interactions")
      .on("postgres_changes", { event: "*", schema: "public", table: "post_likes" }, () => void sync())
      .on("postgres_changes", { event: "*", schema: "public", table: "post_saves" }, () => void sync())
      .on("postgres_changes", { event: "*", schema: "public", table: "follows" }, () => void sync())
      .subscribe();
    return () => {
      cancelled = true;
      sub.subscription.unsubscribe();
      void supabase.removeChannel(channel);
    };
  }, []);

  // Shared writer for post_likes / post_saves so every surface (feed, reels,
  // profile, long video) persists the same rows.
  const persistToggle = useCallback(
    async (
      table: "post_likes" | "post_saves",
      postId: string,
      on: boolean,
      revert: (v: boolean) => void,
    ) => {
      if (!isRealUserId(postId)) {
        revert(false);
        return;
      }
      const me = meRef.current ?? (await supabase.auth.getUser()).data.user?.id ?? null;
      meRef.current = me;
      if (!me) {
        revert(!on);
        toast.error("Sign in to continue");
        return;
      }
      const { error } = on
        ? await supabase.from(table).upsert(
            { post_id: postId, user_id: me },
            { onConflict: "post_id,user_id", ignoreDuplicates: true },
          )
        : await supabase.from(table).delete().eq("post_id", postId).eq("user_id", me);
      if (error && !(on && error.code === "23505")) {
        revert(!on);
        toast.error(error.message);
      }
    },
    [],
  );

  const toggleLike = useCallback(
    (id: string) => {
      let next = false;
      setLiked((p) => {
        next = !p[id];
        return { ...p, [id]: next };
      });
      void persistToggle("post_likes", id, next, (v) => setLiked((p) => ({ ...p, [id]: v })));
    },
    [persistToggle],
  );
  const toggleSave = useCallback(
    (id: string) => {
      let next = false;
      setSaved((p) => {
        next = !p[id];
        return { ...p, [id]: next };
      });
      void persistToggle("post_saves", id, next, (v) => setSaved((p) => ({ ...p, [id]: v })));
    },
    [persistToggle],
  );

  const toggleFollow = useCallback((id: string) => {
    let next = false;
    setFollowing((p) => {
      next = !p[id];
      return { ...p, [id]: next };
    });
    if (!isRealUserId(id)) {
      setFollowing((p) => ({ ...p, [id]: false }));
      return;
    }
    void setFollow(id, next).catch((e: unknown) => {
      setFollowing((p) => ({ ...p, [id]: !next }));
      toast.error(e instanceof Error ? e.message : "Couldn't update follow");
    });
  }, []);
  const addDraft = useCallback((d: Draft) => setDrafts((p) => [d, ...p]), []);
  const removeDraft = useCallback(
    (id: string) => setDrafts((p) => p.filter((x) => x.id !== id)),
    [],
  );


  const value = useMemo<Store>(
    () => ({
      liked,
      saved,
      following,
      toggleLike,
      toggleSave,
      toggleFollow,
      drafts,
      addDraft,
      removeDraft,
    }),
    [liked, saved, following, drafts, toggleLike, toggleSave, toggleFollow, addDraft, removeDraft],
  );

  return <StoreContext.Provider value={value}>{children}</StoreContext.Provider>;
}

export function useYw() {
  const ctx = useContext(StoreContext);
  if (!ctx) throw new Error("useYw must be used inside YwStoreProvider");
  return ctx;
}

export function useDoubleTapLike(id: string) {
  const { liked, toggleLike } = useYw();
  const [burst, setBurst] = useState(false);
  const timerRef = useRef<number | null>(null);

  useEffect(
    () => () => {
      if (timerRef.current !== null) window.clearTimeout(timerRef.current);
    },
    [],
  );

  const onDoubleTap = useCallback(() => {
    if (!liked[id]) toggleLike(id);
    setBurst(true);
    if (timerRef.current !== null) window.clearTimeout(timerRef.current);
    timerRef.current = window.setTimeout(() => setBurst(false), 700);
  }, [id, liked, toggleLike]);
  return { burst, onDoubleTap };
}