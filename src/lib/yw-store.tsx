import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from "react";

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

  const flip = (set: typeof setLiked) => (id: string) => set((p) => ({ ...p, [id]: !p[id] }));

  const value = useMemo<Store>(
    () => ({
      liked,
      saved,
      following,
      toggleLike: flip(setLiked),
      toggleSave: flip(setSaved),
      toggleFollow: flip(setFollowing),
      drafts,
      addDraft: (d) => setDrafts((p) => [d, ...p]),
      removeDraft: (id) => setDrafts((p) => p.filter((x) => x.id !== id)),
    }),
    [liked, saved, following, drafts],
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
  const onDoubleTap = useCallback(() => {
    if (!liked[id]) toggleLike(id);
    setBurst(true);
    window.setTimeout(() => setBurst(false), 700);
  }, [id, liked, toggleLike]);
  return { burst, onDoubleTap };
}