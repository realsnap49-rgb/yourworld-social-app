import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from "react";

export type SearchEntry = {
  id: string;
  kind: "user" | "hashtag";
  /** username (no @) for users, tag (no #) for hashtags */
  label: string;
  /** display name for user entries */
  sublabel?: string;
  userId?: string;
};

type SearchStore = {
  history: SearchEntry[];
  push: (entry: Omit<SearchEntry, "id">) => void;
  remove: (id: string) => void;
  clear: () => void;
};

const STORAGE_KEY = "yw_search_history";
const MAX_HISTORY = 10;

function loadHistory(): SearchEntry[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? (JSON.parse(raw) as SearchEntry[]) : [];
  } catch {
    return [];
  }
}

function saveHistory(entries: SearchEntry[]) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(entries));
  } catch {}
}

const SearchContext = createContext<SearchStore | null>(null);

export function SearchProvider({ children }: { children: ReactNode }) {
  const [history, setHistory] = useState<SearchEntry[]>(loadHistory);

  const push = useCallback((entry: Omit<SearchEntry, "id">) => {
    setHistory((prev) => {
      // deduplicate by kind + label
      const filtered = prev.filter(
        (e) => !(e.kind === entry.kind && e.label === entry.label),
      );
      const next = [
        { ...entry, id: `${Date.now()}-${Math.random()}` },
        ...filtered,
      ].slice(0, MAX_HISTORY);
      saveHistory(next);
      return next;
    });
  }, []);

  const remove = useCallback((id: string) => {
    setHistory((prev) => {
      const next = prev.filter((e) => e.id !== id);
      saveHistory(next);
      return next;
    });
  }, []);

  const clear = useCallback(() => {
    setHistory([]);
    saveHistory([]);
  }, []);

  const value = useMemo(
    () => ({ history, push, remove, clear }),
    [history, push, remove, clear],
  );

  return (
    <SearchContext.Provider value={value}>{children}</SearchContext.Provider>
  );
}

export function useSearch() {
  const ctx = useContext(SearchContext);
  if (!ctx) throw new Error("useSearch must be used within SearchProvider");
  return ctx;
}
