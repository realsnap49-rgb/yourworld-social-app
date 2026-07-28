import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";

export type ChannelVisibility = "public" | "private";

export type Channel = {
  name: string;
  handle: string;
  category: string;
  description: string;
  visibility: ChannelVisibility;
  /** Optional — never required. */
  country: string;
  /** Object URLs / data URLs kept on-device only. */
  logo: string | null;
  banner: string | null;
  createdAt: number;
};

export type ChannelState = { channel: Channel | null };

export const CHANNEL_CATEGORIES = [
  "Entertainment",
  "Music",
  "Gaming",
  "Education",
  "Tech",
  "Sports",
  "Travel",
  "Food",
  "Fashion",
  "Business",
  "News",
  "Fitness",
];

export const COUNTRIES = [
  "India",
  "United States",
  "United Kingdom",
  "Canada",
  "Australia",
  "Germany",
  "Japan",
  "Brazil",
  "Nigeria",
  "Singapore",
];

export const emptyChannel = (): Channel => ({
  name: "",
  handle: "",
  category: CHANNEL_CATEGORIES[0],
  description: "",
  visibility: "public",
  country: "",
  logo: null,
  banner: null,
  createdAt: Date.now(),
});

const KEY = "yw.channel.v1";

type Ctx = {
  channel: Channel | null;
  hasChannel: boolean;
  hydrated: boolean;
  saveChannel: (c: Channel) => void;
  updateChannel: (patch: Partial<Channel>) => void;
};

const ChannelContext = createContext<Ctx | null>(null);

export function ChannelProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<ChannelState>({ channel: null });
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    try {
      const raw = window.localStorage.getItem(KEY);
      if (raw) setState(JSON.parse(raw) as ChannelState);
    } catch {
      /* ignore corrupt storage */
    }
    setHydrated(true);
  }, []);

  useEffect(() => {
    if (!hydrated) return;
    try {
      window.localStorage.setItem(KEY, JSON.stringify(state));
    } catch {
      /* storage unavailable */
    }
  }, [state, hydrated]);

  const saveChannel = useCallback((c: Channel) => setState({ channel: c }), []);
  const updateChannel = useCallback(
    (patch: Partial<Channel>) =>
      setState((s) => (s.channel ? { channel: { ...s.channel, ...patch } } : s)),
    [],
  );

  const value = useMemo<Ctx>(
    () => ({
      channel: state.channel,
      hasChannel: state.channel !== null,
      hydrated,
      saveChannel,
      updateChannel,
    }),
    [state.channel, hydrated, saveChannel, updateChannel],
  );

  return <ChannelContext.Provider value={value}>{children}</ChannelContext.Provider>;
}

export function useChannel() {
  const ctx = useContext(ChannelContext);
  if (!ctx) throw new Error("useChannel must be used inside ChannelProvider");
  return ctx;
}
