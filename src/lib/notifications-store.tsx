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
import {
  Heart,
  MessageSquare,
  UserPlus,
  Globe2,
  Handshake,
  Sparkles,
  Mail,
  Megaphone,
  BadgeCheck,
  Coins,
  Bell,
  type LucideIcon,
} from "lucide-react";
import { useOrbitAppPrefs } from "@/lib/orbit-prefs";

export type NotificationKind =
  | "like"
  | "comment"
  | "follower"
  | "orbit"
  | "connection"
  | "match"
  | "message"
  | "channel"
  | "verification"
  | "monetization"
  | "system";

export type NotificationItem = {
  id: string;
  kind: NotificationKind;
  title: string;
  body?: string;
  /** epoch ms */
  at: number;
  read: boolean;
  /** in-app destination, optional */
  to?: string;
};

export type KindMeta = {
  id: NotificationKind;
  label: string;
  emoji: string;
  icon: LucideIcon;
  /** tailwind-safe token classes only */
  tint: string;
};

export const NOTIFICATION_KINDS: KindMeta[] = [
  { id: "like", label: "Likes", emoji: "❤️", icon: Heart, tint: "text-rose-400" },
  { id: "comment", label: "Comments", emoji: "💬", icon: MessageSquare, tint: "text-sky-400" },
  { id: "follower", label: "New Followers", emoji: "👤", icon: UserPlus, tint: "text-violet-400" },
  { id: "orbit", label: "Orbit", emoji: "🌍", icon: Globe2, tint: "text-emerald-400" },
  { id: "connection", label: "Connections", emoji: "🤝", icon: Handshake, tint: "text-teal-400" },
  { id: "match", label: "Matches", emoji: "💕", icon: Sparkles, tint: "text-pink-400" },
  { id: "message", label: "Messages", emoji: "📩", icon: Mail, tint: "text-blue-400" },
  { id: "channel", label: "Channel Updates", emoji: "📢", icon: Megaphone, tint: "text-orange-400" },
  { id: "verification", label: "Verification", emoji: "✔️", icon: BadgeCheck, tint: "text-cyan-400" },
  { id: "monetization", label: "Monetization", emoji: "💰", icon: Coins, tint: "text-amber-400" },
  { id: "system", label: "System", emoji: "🔔", icon: Bell, tint: "text-muted-foreground" },
];

/** Kinds suppressed by the "Hide Orbit notifications" privacy control. */
export const ORBIT_KINDS: NotificationKind[] = ["orbit", "connection", "match"];

export const kindMeta = (k: NotificationKind) =>
  NOTIFICATION_KINDS.find((m) => m.id === k) ?? NOTIFICATION_KINDS[NOTIFICATION_KINDS.length - 1];

const MIN = 60_000;
const now = Date.now();

const seed: NotificationItem[] = [
  { id: "n1", kind: "like", title: "Riko Tan and 2.1K others liked your reel", body: "3am in Kabukicho, nobody around but the signs", at: now - 2 * MIN, read: false, to: "/reels" },
  { id: "n2", kind: "comment", title: "Mara Vega commented on your post", body: "This palette is unreal 🔥", at: now - 9 * MIN, read: false, to: "/" },
  { id: "n3", kind: "message", title: "New message from Riko Tan", body: "sending the raw files tonight", at: now - 14 * MIN, read: false, to: "/chat" },
  { id: "n4", kind: "match", title: "You matched with Ada Kim", body: "You both picked 📸 Photography Partner", at: now - 41 * MIN, read: false, to: "/orbit" },
  { id: "n5", kind: "connection", title: "Kai Oduya accepted your connection", at: now - 70 * MIN, read: true, to: "/orbit" },
  { id: "n6", kind: "orbit", title: "3 new people near you in Orbit", body: "Approximate area only — exact location is never shared", at: now - 3 * 60 * MIN, read: true, to: "/orbit" },
  { id: "n7", kind: "follower", title: "moss.club started following you", at: now - 5 * 60 * MIN, read: true, to: "/profile" },
  { id: "n8", kind: "channel", title: "Your channel gained 240 subscribers today", at: now - 8 * 60 * MIN, read: true, to: "/channel" },
  { id: "n9", kind: "verification", title: "Verification request under review", body: "We'll notify you within 48 hours", at: now - 26 * 60 * MIN, read: true, to: "/profile" },
  { id: "n10", kind: "monetization", title: "You're 68% to monetization eligibility", body: "680 / 1,000 subscribers", at: now - 30 * 60 * MIN, read: true, to: "/channel/monetization" },
  { id: "n11", kind: "system", title: "Screenshot protection is on", body: "Orbit content is obscured when the app loses focus", at: now - 48 * 60 * MIN, read: true, to: "/orbit/privacy" },
];

/** Templates used by the live stream so new events feel real. */
const liveTemplates: Omit<NotificationItem, "id" | "at" | "read">[] = [
  { kind: "like", title: "sea.salt liked your post", to: "/" },
  { kind: "comment", title: "spinsolo commented", body: "frame of the year", to: "/" },
  { kind: "follower", title: "wavelen started following you", to: "/profile" },
  { kind: "message", title: "New message in Night Shooters", body: "Kai: meet at the crossing at 9", to: "/chat" },
  { kind: "orbit", title: "Someone new joined your Orbit area", to: "/orbit" },
  { kind: "connection", title: "Ines Roth sent a connection request", to: "/orbit" },
  { kind: "match", title: "New match — same ☕ Coffee Chat mood", to: "/orbit" },
  { kind: "channel", title: "Your latest reel crossed 100K views", to: "/channel" },
  { kind: "monetization", title: "Estimated earnings updated", body: "+$12.40 in the last 24h", to: "/channel/monetization" },
  { kind: "system", title: "New device signed in", body: "Review it in Settings if this wasn't you", to: "/settings" },
];

export type NotificationPrefs = Record<NotificationKind, boolean>;

const defaultPrefs = Object.fromEntries(
  NOTIFICATION_KINDS.map((k) => [k.id, true]),
) as NotificationPrefs;

const KEY = "yw.notifications.v1";

type Ctx = {
  items: NotificationItem[];
  unread: number;
  /** Unread excluding Orbit-only kinds (Orbit, Connections, Matches). */
  unreadHome: number;
  /** Unread across Orbit-only kinds. */
  unreadOrbit: number;
  unreadByKind: Record<NotificationKind, number>;
  prefs: NotificationPrefs;
  live: boolean;
  setLive: (v: boolean) => void;
  setPref: (k: NotificationKind, v: boolean) => void;
  markRead: (id: string) => void;
  markAllRead: () => void;
  remove: (id: string) => void;
  clearAll: () => void;
};

const NotificationsContext = createContext<Ctx | null>(null);

export function NotificationsProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<NotificationItem[]>(seed);
  const [prefs, setPrefs] = useState<NotificationPrefs>(defaultPrefs);
  const [live, setLive] = useState(true);
  const [hydrated, setHydrated] = useState(false);
  const { hideOrbitNotifications } = useOrbitAppPrefs();
  const cursor = useRef(0);

  useEffect(() => {
    try {
      const raw = window.localStorage.getItem(KEY);
      if (raw) {
        const parsed = JSON.parse(raw) as { items?: NotificationItem[]; prefs?: Partial<NotificationPrefs>; live?: boolean };
        if (parsed.items?.length) setItems(parsed.items);
        setPrefs({ ...defaultPrefs, ...(parsed.prefs ?? {}) });
        if (typeof parsed.live === "boolean") setLive(parsed.live);
      }
    } catch {
      /* ignore corrupt storage */
    }
    setHydrated(true);
  }, []);

  useEffect(() => {
    if (!hydrated) return;
    try {
      window.localStorage.setItem(KEY, JSON.stringify({ items: items.slice(0, 80), prefs, live }));
    } catch {
      /* storage unavailable */
    }
  }, [items, prefs, live, hydrated]);

  // Lightweight "real-time" stream: paused when the tab is hidden so it never
  // burns cycles in the background.
  useEffect(() => {
    if (!hydrated || !live) return;
    let timer: number | undefined;

    const schedule = () => {
      timer = window.setTimeout(() => {
        if (document.visibilityState === "visible") {
          const t = liveTemplates[cursor.current % liveTemplates.length];
          cursor.current += 1;
          setItems((prev) =>
            prefs[t.kind] && !(hideOrbitNotifications && ORBIT_KINDS.includes(t.kind))
              ? [{ ...t, id: `live-${Date.now()}`, at: Date.now(), read: false }, ...prev].slice(0, 80)
              : prev,
          );
        }
        schedule();
      }, 18_000);
    };
    schedule();
    return () => window.clearTimeout(timer);
  }, [hydrated, live, prefs, hideOrbitNotifications]);

  const setPref = useCallback((k: NotificationKind, v: boolean) => {
    setPrefs((p) => ({ ...p, [k]: v }));
  }, []);

  const value = useMemo<Ctx>(() => {
    const visible = items.filter(
      (i) => prefs[i.kind] && !(hideOrbitNotifications && ORBIT_KINDS.includes(i.kind)),
    );
    const unreadByKind = Object.fromEntries(
      NOTIFICATION_KINDS.map((k) => [k.id, visible.filter((i) => i.kind === k.id && !i.read).length]),
    ) as Record<NotificationKind, number>;

    return {
      items: visible,
      unread: visible.filter((i) => !i.read).length,
      unreadByKind,
      prefs,
      live,
      setLive,
      setPref,
      markRead: (id) => setItems((p) => p.map((i) => (i.id === id ? { ...i, read: true } : i))),
      markAllRead: () => setItems((p) => p.map((i) => ({ ...i, read: true }))),
      remove: (id) => setItems((p) => p.filter((i) => i.id !== id)),
      clearAll: () => setItems([]),
    };
  }, [items, prefs, live, setPref, hideOrbitNotifications]);

  return <NotificationsContext.Provider value={value}>{children}</NotificationsContext.Provider>;
}

export function useNotifications() {
  const ctx = useContext(NotificationsContext);
  if (!ctx) throw new Error("useNotifications must be used inside NotificationsProvider");
  return ctx;
}

export function timeAgo(at: number) {
  const s = Math.max(1, Math.round((Date.now() - at) / 1000));
  if (s < 60) return `${s}s`;
  const m = Math.round(s / 60);
  if (m < 60) return `${m}m`;
  const h = Math.round(m / 60);
  if (h < 24) return `${h}h`;
  return `${Math.round(h / 24)}d`;
}
