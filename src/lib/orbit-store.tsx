import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import type { OrbitMoodId } from "@/lib/orbit-mood";
import { ORBIT_KEY, notifyOrbitPrefsChanged } from "@/lib/orbit-prefs";

export type OrbitVisibility = "public" | "friends" | "hidden";
export type OrbitAudience = "everyone" | "connections" | "nobody";
export type OrbitVerification = "none" | "pending" | "verified";

export type OrbitPhotoStyle = "real" | "avatar" | "stylized";
export type OrbitPhotoPrivacy = "everyone" | "matched" | "permission";

export type OrbitPhoto = {
  id: string;
  url: string;
  style: OrbitPhotoStyle;
};

export const ORBIT_PHOTO_MAX = 6;

export const ORBIT_HOBBY_MAX = 5;

export const ORBIT_HOBBIES = [
  "Travel",
  "Adventure",
  "Trip with Friends",
  "Shopping",
  "Friends & Fun",
  "Music",
  "Movies",
  "Food",
  "Photography",
  "Reading",
  "Gaming",
  "Fashion",
  "Art",
  "Technology",
  "Business",
  "Pets",
  "Sleeping",
  "Sports",
  "Gym & Fitness",
  "Other",
] as const;

export const ORBIT_LOOKING_FOR = [
  "Women",
  "Men",
  "Everyone",
] as const;

export type OrbitProfileDraft = {
  name: string;
  age: string;
  /** Country and state stay private — only the city is ever shown publicly. */
  country: string;
  state: string;
  city: string;
  about: string;
  /** Up to ORBIT_HOBBY_MAX hobbies. */
  hobbies: string[];
  /** What the person is here for. Optional. */
  lookingFor: string;
  /** At least one photo is required. Up to ORBIT_PHOTO_MAX. */
  photos: OrbitPhoto[];
  /** Who can view the original (unstylized) photo. */
  originalPhotoPrivacy: OrbitPhotoPrivacy;
  /** Optional — never required to use Orbit. */
  mood?: OrbitMoodId | null;
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
  /** Voice/video calls master switch. Calls are only ever possible after a match/connection. */
  callsEnabled: boolean;
  whoCanCall: OrbitAudience;
  hiddenFrom: string[];
  blocked: string[];
  screenshotProtection: boolean;
  /** Notify both users when a screenshot or recording is detected. */
  screenshotAlerts: boolean;
  approximateLocationOnly: true;
  /** On-device heuristic scan that flags likely fake profiles. */
  aiFakeDetection: boolean;
  /** Hide profiles the scan flags instead of just labelling them. */
  hideFlaggedProfiles: boolean;
  /** Optional — a badge is never required to use Orbit. */
  verification: OrbitVerification;
  /** Mood is private by default in the sense that it is never shown unless on. */
  showMood: boolean;
  /** Require a PIN/password before Orbit opens on this device. */
  lockEnabled: boolean;
  /** Random per-device salt for the PIN digest. Never the PIN itself. */
  pinSalt: string | null;
  /** SHA-256 digest of salt + PIN. The PIN is never stored. */
  pinHash: string | null;
  /** Hide the Orbit entry point across the app. */
  hideOrbitEntry: boolean;
  /** Suppress every Orbit-related notification. */
  hideOrbitNotifications: boolean;
};

export type OrbitState = {
  profile: OrbitProfileDraft | null;
  privacy: OrbitPrivacy;
  liked: Record<string, boolean>;
  connected: Record<string, boolean>;
  /** One chat request per person. Direction is relative to the current user. */
  requests: Record<string, OrbitChatRequest>;
};

export type OrbitChatRequest = {
  direction: "outgoing" | "incoming";
  status: "pending" | "accepted" | "declined";
  /** Initial message allowed before acceptance (text only, max 1). */
  intro?: string;
  /** Messages exchanged before acceptance. Capped by the gate limits below. */
  messages?: OrbitRequestMessage[];
};

export type OrbitRequestMessage = {
  id: string;
  kind: "text" | "photo";
  /** Text body, or the photo caption/label. */
  text?: string;
  /** Object URL / data URL for photo messages. */
  url?: string;
  me: boolean;
};

/** Pre-acceptance limits for the requesting side. */
export const ORBIT_REQUEST_TEXT_MAX = 3;
export const ORBIT_REQUEST_PHOTO_MAX = 2;

export function countRequestMessages(req?: OrbitChatRequest) {
  const list = req?.messages ?? [];
  const mine = list.filter((m) => m.me);
  return {
    texts: mine.filter((m) => m.kind === "text").length,
    photos: mine.filter((m) => m.kind === "photo").length,
  };
}

/** Demo inbound requests so the recipient flow is reachable. */
const seededRequests: Record<string, OrbitChatRequest> = {
  o2: {
    direction: "incoming",
    status: "pending",
    intro: "Hey! Saw you shoot film too — coffee sometime?",
    messages: [
      { id: "o2-1", kind: "text", text: "Hey! Saw you shoot film too — coffee sometime?", me: false },
    ],
  },
  o5: {
    direction: "incoming",
    status: "pending",
    intro: "Your playlist taste is unreal. Hi 👋",
    messages: [{ id: "o5-1", kind: "text", text: "Your playlist taste is unreal. Hi 👋", me: false }],
  },
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
  callsEnabled: true,
  whoCanCall: "connections",
  hiddenFrom: [],
  blocked: [],
  screenshotProtection: true,
  screenshotAlerts: true,
  approximateLocationOnly: true,
  aiFakeDetection: true,
  hideFlaggedProfiles: false,
  verification: "none",
  showMood: true,
  lockEnabled: false,
  pinSalt: null,
  pinHash: null,
  hideOrbitEntry: false,
  hideOrbitNotifications: false,
};

const defaultState: OrbitState = {
  profile: null,
  privacy: defaultPrivacy,
  liked: {},
  connected: {},
  requests: seededRequests,
};

const KEY = ORBIT_KEY;

const UNLOCK_KEY = "yw.orbit.unlocked";

function randomSalt() {
  const bytes = new Uint8Array(16);
  crypto.getRandomValues(bytes);
  return Array.from(bytes, (b) => b.toString(16).padStart(2, "0")).join("");
}

/** PIN is hashed with a per-device salt; the raw value never leaves the input. */
async function digestPin(salt: string, pin: string) {
  const data = new TextEncoder().encode(`${salt}:${pin}`);
  const buf = await crypto.subtle.digest("SHA-256", data);
  return Array.from(new Uint8Array(buf), (b) => b.toString(16).padStart(2, "0")).join("");
}

/** Constant-time-ish string compare so timing never leaks the digest. */
function safeEqual(a: string, b: string) {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i += 1) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}

export function markUnlockedForSession() {
  try {
    window.sessionStorage.setItem(UNLOCK_KEY, "1");
  } catch {
    /* storage unavailable */
  }
}

export function isUnlockedForSession() {
  try {
    return window.sessionStorage.getItem(UNLOCK_KEY) === "1";
  } catch {
    return false;
  }
}

export function clearSessionUnlock() {
  try {
    window.sessionStorage.removeItem(UNLOCK_KEY);
  } catch {
    /* storage unavailable */
  }
}

type Ctx = OrbitState & {
  hasProfile: boolean;
  hydrated: boolean;
  saveProfile: (p: OrbitProfileDraft) => void;
  setMood: (mood: OrbitMoodId | null) => void;
  setPrivacy: (patch: Partial<OrbitPrivacy>) => void;
  setOrbitPin: (pin: string) => Promise<void>;
  verifyOrbitPin: (pin: string) => Promise<boolean>;
  disableOrbitLock: () => void;
  toggleHiddenFrom: (id: string) => void;
  toggleBlocked: (id: string) => void;
  toggleLike: (id: string) => void;
  toggleConnect: (id: string) => void;
  sendChatRequest: (id: string, intro: string) => void;
  sendRequestMessage: (id: string, msg: Omit<OrbitRequestMessage, "id" | "me">) => boolean;
  acceptRequest: (id: string) => void;
  declineRequest: (id: string) => void;
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
          requests: parsed.requests ?? seededRequests,
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
      notifyOrbitPrefsChanged();
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
      setMood: (mood) =>
        setState((s) => (s.profile ? { ...s, profile: { ...s.profile, mood } } : s)),
      setPrivacy,
      setOrbitPin: async (pin: string) => {
        const salt = randomSalt();
        const pinHash = await digestPin(salt, pin);
        setState((s) => ({ ...s, privacy: { ...s.privacy, lockEnabled: true, pinSalt: salt, pinHash } }));
        markUnlockedForSession();
      },
      verifyOrbitPin: async (pin: string) => {
        const { pinSalt, pinHash } = state.privacy;
        if (!pinSalt || !pinHash) return false;
        const candidate = await digestPin(pinSalt, pin);
        const ok = safeEqual(candidate, pinHash);
        if (ok) markUnlockedForSession();
        return ok;
      },
      disableOrbitLock: () =>
        setState((s) => ({
          ...s,
          privacy: { ...s.privacy, lockEnabled: false, pinSalt: null, pinHash: null },
        })),
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
      sendChatRequest: (id, intro) =>
        setState((s) =>
          s.requests[id]
            ? s
            : {
                ...s,
                requests: {
                  ...s.requests,
                  [id]: {
                    direction: "outgoing",
                    status: "pending",
                    intro,
                    messages: [{ id: `${id}-1`, kind: "text", text: intro, me: true }],
                  },
                },
              },
        ),
      sendRequestMessage: (id, msg) => {
        const existing = state.requests[id];
        if (existing?.status === "declined") return false;
        const { texts, photos } = countRequestMessages(existing);
        if (msg.kind === "text" && texts >= ORBIT_REQUEST_TEXT_MAX) return false;
        if (msg.kind === "photo" && photos >= ORBIT_REQUEST_PHOTO_MAX) return false;
        setState((s) => {
          const req: OrbitChatRequest = s.requests[id] ?? { direction: "outgoing", status: "pending" };
          const messages = [
            ...(req.messages ?? []),
            { ...msg, id: `${id}-${(req.messages?.length ?? 0) + 1}`, me: true },
          ];
          return {
            ...s,
            requests: {
              ...s.requests,
              [id]: { ...req, intro: req.intro ?? (msg.kind === "text" ? msg.text : undefined), messages },
            },
          };
        });
        return true;
      },
      acceptRequest: (id) =>
        setState((s) => ({
          ...s,
          connected: { ...s.connected, [id]: true },
          requests: {
            ...s.requests,
            [id]: { ...(s.requests[id] ?? { direction: "incoming" as const }), status: "accepted" },
          },
        })),
      declineRequest: (id) =>
        setState((s) => ({
          ...s,
          requests: {
            ...s.requests,
            [id]: { ...(s.requests[id] ?? { direction: "incoming" as const }), status: "declined" },
          },
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