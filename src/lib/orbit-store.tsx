import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";

export type OrbitVisibility = "public" | "friends" | "hidden";
export type OrbitAudience = "everyone" | "connections" | "nobody";
export type OrbitVerification = "none" | "pending" | "verified";

export type OrbitProfileDraft = {
  name: string;
  handle: string;
  age: string;
  area: string;
  headline: string;
  about: string;
  interests: string[];
};

export type OrbitPrivacy = {
  orbitEnabled: boolean;
  paused: boolean;
  hiddenProfile: boolean;
  visibility: OrbitVisibility;
  whoCanLike: OrbitAudience;
  whoCanMessage: OrbitAudience;
  whoCanConnect: OrbitAudience;
  liveLocationEnabled: boolean;
  whoCanRequestLiveLocation: OrbitAudience;
  hiddenFrom: string[];
  blocked: string[];
  screenshotProtection: boolean;
  approximateLocationOnly: true;
  /** On-device heuristic scan that flags likely fake profiles. */
  aiFakeDetection: boolean;
  /** Hide profiles the scan flags instead of just labelling them. */
  hideFlaggedProfiles: boolean;
  /** Optional — a badge is never required to use Orbit. */
  verification: OrbitVerification;
};

export type OrbitState = {
  profile: OrbitProfileDraft | null;
  privacy: OrbitPrivacy;
  liked: Record<string, boolean>;
  connected: Record<string, boolean>;
};

const defaultPrivacy: OrbitPrivacy = {
  orbitEnabled: true,
  paused: false,
  hiddenProfile: false,
  visibility: "public",
  whoCanLike: "everyone",
  whoCanMessage: "connections",
  whoCanConnect: "everyone",
  liveLocationEnabled: false,
  whoCanRequestLiveLocation: "connections",
  hiddenFrom: [],
  blocked: [],
  screenshotProtection: true,
  approximateLocationOnly: true,
  aiFakeDetection: true,
  hideFlaggedProfiles: false,
  verification: "none",
};

const defaultState: OrbitState = {
  profile: null,
  privacy: defaultPrivacy,
  liked: {},
  connected: {},
};

const KEY = "yw.orbit.v1";

type Ctx = OrbitState & {
  hasProfile: boolean;
  hydrated: boolean;
  saveProfile: (p: OrbitProfileDraft) => void;
  setPrivacy: (patch: Partial<OrbitPrivacy>) => void;
  toggleHiddenFrom: (id: string) => void;
  toggleBlocked: (id: string) => void;
  toggleLike: (id: string) => void;
  toggleConnect: (id: string) => void;
};

const OrbitContext = createContext<Ctx | null>(null);

export function OrbitProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<OrbitState>(defaultState);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    try {
      const raw = window.localStorage.getItem(KEY);
      if (raw) {
        const parsed = JSON.parse(raw) as Partial<OrbitState>;
        setState({
          ...defaultState,
          ...parsed,
          privacy: { ...defaultPrivacy, ...(parsed.privacy ?? {}) },
        });
      }
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

  const setPrivacy = useCallback(
    (patch: Partial<OrbitPrivacy>) =>
      setState((s) => ({ ...s, privacy: { ...s.privacy, ...patch } })),
    [],
  );

  const toggleIn = (list: string[], id: string) =>
    list.includes(id) ? list.filter((x) => x !== id) : [...list, id];

  const value = useMemo<Ctx>(
    () => ({
      ...state,
      hydrated,
      hasProfile: state.profile !== null,
      saveProfile: (p) => setState((s) => ({ ...s, profile: p })),
      setPrivacy,
      toggleHiddenFrom: (id) =>
        setState((s) => ({
          ...s,
          privacy: { ...s.privacy, hiddenFrom: toggleIn(s.privacy.hiddenFrom, id) },
        })),
      toggleBlocked: (id) =>
        setState((s) => ({
          ...s,
          privacy: { ...s.privacy, blocked: toggleIn(s.privacy.blocked, id) },
        })),
      toggleLike: (id) => setState((s) => ({ ...s, liked: { ...s.liked, [id]: !s.liked[id] } })),
      toggleConnect: (id) =>
        setState((s) => ({ ...s, connected: { ...s.connected, [id]: !s.connected[id] } })),
    }),
    [state, hydrated, setPrivacy],
  );

  return <OrbitContext.Provider value={value}>{children}</OrbitContext.Provider>;
}

export function useOrbit() {
  const ctx = useContext(OrbitContext);
  if (!ctx) throw new Error("useOrbit must be used inside OrbitProvider");
  return ctx;
}

/** Safe outside the Orbit route tree — returns null when no provider is mounted. */
export function useOrbitOptional() {
  return useContext(OrbitContext);
}

export const LOCKED_MESSAGE = "Create your Orbit Profile to unlock all Orbit features.";

/**
 * Best-effort screen-capture protection. Browsers cannot block OS-level
 * screenshots, so we obscure content whenever the app loses focus/visibility
 * and tell the user when full protection can't be enforced.
 */
export function useScreenCaptureShield(enabled: boolean) {
  const [obscured, setObscured] = useState(false);

  useEffect(() => {
    if (!enabled) {
      setObscured(false);
      return;
    }
    const hide = () => setObscured(true);
    const show = () => setObscured(false);
    const onVisibility = () => setObscured(document.visibilityState !== "visible");

    window.addEventListener("blur", hide);
    window.addEventListener("focus", show);
    document.addEventListener("visibilitychange", onVisibility);
    return () => {
      window.removeEventListener("blur", hide);
      window.removeEventListener("focus", show);
      document.removeEventListener("visibilitychange", onVisibility);
    };
  }, [enabled]);

  return obscured;
}