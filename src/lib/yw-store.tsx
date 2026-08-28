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

  const toggleLike = useCallback(
    (id: string) => setLiked((p) => ({ ...p, [id]: !p[id] })),
    [],
  );
  const toggleSave = useCallback(
    (id: string) => setSaved((p) => ({ ...p, [id]: !p[id] })),
    [],
  );
  const toggleFollow = useCallback(
    (id: string) => setFollowing((p) => ({ ...p, [id]: !p[id] })),
    [],
  );
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