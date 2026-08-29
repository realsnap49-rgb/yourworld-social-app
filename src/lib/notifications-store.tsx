import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
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
import { supabase } from "@/integrations/supabase/client";
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

export type NotificationPrefs = Record<NotificationKind, boolean>;

const defaultPrefs = Object.fromEntries(
  NOTIFICATION_KINDS.map((k) => [k.id, true]),
) as NotificationPrefs;

const KEY = "yw.notifications.v2";

type Persisted = {
  prefs?: Partial<NotificationPrefs>;
  live?: boolean;
  read?: string[];
  removed?: string[];
};

function loadPersisted(): Persisted {
  if (typeof window === "undefined") return {};
  try {
    return JSON.parse(window.localStorage.getItem(KEY) ?? "{}") as Persisted;
  } catch {
    return {};
  }
}

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

const ts = (v: string) => new Date(v).getTime();

/** Builds the whole notification feed from real database activity. */
async function fetchEvents(): Promise<Omit<NotificationItem, "read">[]> {
  const { data: auth } = await supabase.auth.getUser();
  const me = auth.user?.id;
  if (!me) return [];

  const { data: myPostRows } = await supabase.from("posts").select("id,kind").eq("user_id", me);
  const myPosts = (myPostRows ?? []) as { id: string; kind: string }[];
  const postIds = myPosts.map((p) => p.id);

  const { data: threadRows } = await supabase
    .from("thread_participants")
    .select("thread_id")
    .eq("user_id", me);
  const threadIds = [...new Set(((threadRows ?? []) as { thread_id: string }[]).map((t) => t.thread_id))];

  const [likes, comments, follows, dms, orbitMsgs, orbitLikes, myOrbitLikes, requests, connections] =
    await Promise.all([
      postIds.length
        ? supabase
            .from("post_likes")
            .select("id,post_id,user_id,created_at")
            .in("post_id", postIds)
            .neq("user_id", me)
            .order("created_at", { ascending: false })
            .limit(40)
        : Promise.resolve({ data: [] }),
      postIds.length
        ? supabase
            .from("post_comments")
            .select("id,post_id,user_id,body,created_at")
            .in("post_id", postIds)
            .neq("user_id", me)
            .order("created_at", { ascending: false })
            .limit(40)
        : Promise.resolve({ data: [] }),
      supabase
        .from("follows")
        .select("id,follower_id,created_at")
        .eq("following_id", me)
        .order("created_at", { ascending: false })
        .limit(40),
      threadIds.length
        ? supabase
            .from("direct_messages")
            .select("id,thread_id,sender_id,content,media_type,created_at")
            .in("thread_id", threadIds)
            .neq("sender_id", me)
            .order("created_at", { ascending: false })
            .limit(40)
        : Promise.resolve({ data: [] }),
      supabase
        .from("orbit_messages")
        .select("id,sender_id,kind,text,created_at")
        .eq("recipient_id", me)
        .order("created_at", { ascending: false })
        .limit(40),
      supabase
        .from("orbit_likes")
        .select("id,user_id,created_at")
        .eq("target_id", me)
        .order("created_at", { ascending: false })
        .limit(40),
      supabase.from("orbit_likes").select("target_id").eq("user_id", me),
      supabase
        .from("orbit_chat_requests")
        .select("id,requester_id,intro,status,created_at")
        .eq("addressee_id", me)
        .order("created_at", { ascending: false })
        .limit(30),
      supabase
        .from("orbit_connections")
        .select("id,requester_id,addressee_id,status,updated_at")
        .or(`requester_id.eq.${me},addressee_id.eq.${me}`)
        .order("updated_at", { ascending: false })
        .limit(30),
    ]);

  const rows = {
    likes: (likes.data ?? []) as { id: string; post_id: string; user_id: string; created_at: string }[],
    comments: (comments.data ?? []) as {
      id: string;
      post_id: string;
      user_id: string;
      body: string;
      created_at: string;
    }[],
    follows: (follows.data ?? []) as { id: string; follower_id: string; created_at: string }[],
    dms: (dms.data ?? []) as {
      id: string;
      thread_id: string;
      sender_id: string;
      content: string;
      media_type: string;
      created_at: string;
    }[],
    orbitMsgs: (orbitMsgs.data ?? []) as {
      id: string;
      sender_id: string;
      kind: string;
      text: string | null;
      created_at: string;
    }[],
    orbitLikes: (orbitLikes.data ?? []) as { id: string; user_id: string; created_at: string }[],
    requests: (requests.data ?? []) as {
      id: string;
      requester_id: string;
      intro: string | null;
      status: string;
      created_at: string;
    }[],
    connections: (connections.data ?? []) as {
      id: string;
      requester_id: string;
      addressee_id: string;
      status: string;
      updated_at: string;
    }[],
  };

  const likedByMe = new Set(
    ((myOrbitLikes.data ?? []) as { target_id: string }[]).map((r) => r.target_id),
  );

  const peerIds = [
    ...new Set([
      ...rows.likes.map((r) => r.user_id),
      ...rows.comments.map((r) => r.user_id),
      ...rows.follows.map((r) => r.follower_id),
      ...rows.dms.map((r) => r.sender_id),
      ...rows.orbitMsgs.map((r) => r.sender_id),
      ...rows.orbitLikes.map((r) => r.user_id),
      ...rows.requests.map((r) => r.requester_id),
      ...rows.connections.map((r) => (r.requester_id === me ? r.addressee_id : r.requester_id)),
    ]),
  ];

  const names: Record<string, string> = {};
  if (peerIds.length) {
    const { data } = await supabase.rpc("get_public_profiles", { ids: peerIds });
    for (const p of (data ?? []) as {
      id: string;
      username: string | null;
      display_name: string | null;
    }[]) {
      names[p.id] = p.display_name ?? p.username ?? "Someone";
    }
  }
  const nameOf = (id: string) => names[id] ?? "Someone";
  const postKind = new Map(myPosts.map((p) => [p.id, p.kind]));
  const postLink = (id: string) => (postKind.get(id) === "reel" ? "/reels" : "/");

  const out: Omit<NotificationItem, "read">[] = [];

  for (const r of rows.likes)
    out.push({
      id: `like-${r.id}`,
      kind: "like",
      title: `${nameOf(r.user_id)} liked your post`,
      at: ts(r.created_at),
      to: postLink(r.post_id),
    });

  for (const r of rows.comments)
    out.push({
      id: `comment-${r.id}`,
      kind: "comment",
      title: `${nameOf(r.user_id)} commented on your post`,
      body: r.body,
      at: ts(r.created_at),
      to: postLink(r.post_id),
    });

  for (const r of rows.follows)
    out.push({
      id: `follow-${r.id}`,
      kind: "follower",
      title: `${nameOf(r.follower_id)} started following you`,
      at: ts(r.created_at),
      to: `/u/${r.follower_id}`,
    });

  for (const r of rows.dms)
    out.push({
      id: `dm-${r.id}`,
      kind: "message",
      title: `New message from ${nameOf(r.sender_id)}`,
      body: r.media_type && r.media_type !== "text" ? "Sent an attachment" : r.content,
      at: ts(r.created_at),
      to: `/chat/${r.thread_id}`,
    });

  for (const r of rows.orbitMsgs)
    out.push({
      id: `om-${r.id}`,
      kind: "message",
      title: `Orbit message from ${nameOf(r.sender_id)}`,
      body: r.kind === "text" ? (r.text ?? "") : "Sent an attachment",
      at: ts(r.created_at),
      to: `/orbit/chat/${r.sender_id}`,
    });

  for (const r of rows.orbitLikes) {
    const mutual = likedByMe.has(r.user_id);
    out.push({
      id: `olike-${r.id}`,
      kind: mutual ? "match" : "orbit",
      title: mutual
        ? `You matched with ${nameOf(r.user_id)}`
        : `${nameOf(r.user_id)} liked your Orbit profile`,
      at: ts(r.created_at),
      to: mutual ? `/orbit/chat/${r.user_id}` : "/orbit/messages",
    });
  }

  for (const r of rows.requests)
    out.push({
      id: `req-${r.id}`,
      kind: "connection",
      title:
        r.status === "accepted"
          ? `You accepted ${nameOf(r.requester_id)}'s chat request`
          : `${nameOf(r.requester_id)} sent you a chat request`,
      body: r.intro ?? undefined,
      at: ts(r.created_at),
      to: "/orbit/messages",
    });

  for (const r of rows.connections) {
    if (r.status !== "accepted") continue;
    const peer = r.requester_id === me ? r.addressee_id : r.requester_id;
    out.push({
      id: `conn-${r.id}`,
      kind: "connection",
      title: `You and ${nameOf(peer)} are connected`,
      at: ts(r.updated_at),
      to: `/orbit/chat/${peer}`,
    });
  }

  return out.sort((a, b) => b.at - a.at).slice(0, 120);
}

export function NotificationsProvider({ children }: { children: ReactNode }) {
  const [events, setEvents] = useState<Omit<NotificationItem, "read">[]>([]);
  const [prefs, setPrefs] = useState<NotificationPrefs>(defaultPrefs);
  const [live, setLive] = useState(true);
  const [readIds, setReadIds] = useState<string[]>([]);
  const [removedIds, setRemovedIds] = useState<string[]>([]);
  const [hydrated, setHydrated] = useState(false);
  const { hideOrbitNotifications } = useOrbitAppPrefs();

  useEffect(() => {
    const p = loadPersisted();
    setPrefs({ ...defaultPrefs, ...(p.prefs ?? {}) });
    if (typeof p.live === "boolean") setLive(p.live);
    setReadIds(p.read ?? []);
    setRemovedIds(p.removed ?? []);
    setHydrated(true);
  }, []);

  useEffect(() => {
    if (!hydrated) return;
    try {
      window.localStorage.setItem(
        KEY,
        JSON.stringify({ prefs, live, read: readIds.slice(0, 500), removed: removedIds.slice(0, 500) }),
      );
    } catch {
      /* storage unavailable */
    }
  }, [prefs, live, readIds, removedIds, hydrated]);

  const load = useCallback(async () => {
    try {
      setEvents(await fetchEvents());
    } catch {
      /* offline or signed out */
    }
  }, []);

  useEffect(() => {
    if (!hydrated) return;
    void load();
    const { data: sub } = supabase.auth.onAuthStateChange(() => void load());
    return () => sub.subscription.unsubscribe();
  }, [hydrated, load]);

  // Live updates straight from the database.
  useEffect(() => {
    if (!hydrated || !live) return;
    const tables = [
      "post_likes",
      "post_comments",
      "follows",
      "direct_messages",
      "orbit_messages",
      "orbit_likes",
      "orbit_chat_requests",
      "orbit_connections",
    ];
    let channel = supabase.channel("yw-notifications");
    for (const table of tables) {
      channel = channel.on("postgres_changes", { event: "*", schema: "public", table }, () => void load());
    }
    channel.subscribe();
    return () => {
      void supabase.removeChannel(channel);
    };
  }, [hydrated, live, load]);

  const setPref = useCallback((k: NotificationKind, v: boolean) => {
    setPrefs((p) => ({ ...p, [k]: v }));
  }, []);

  const value = useMemo<Ctx>(() => {
    const read = new Set(readIds);
    const removed = new Set(removedIds);
    const visible = events
      .filter((i) => !removed.has(i.id))
      .filter((i) => prefs[i.kind] && !(hideOrbitNotifications && ORBIT_KINDS.includes(i.kind)))
      .map((i) => ({ ...i, read: read.has(i.id) }));

    const unreadByKind = Object.fromEntries(
      NOTIFICATION_KINDS.map((k) => [k.id, visible.filter((i) => i.kind === k.id && !i.read).length]),
    ) as Record<NotificationKind, number>;

    return {
      items: visible,
      unread: visible.filter((i) => !i.read).length,
      unreadHome: visible.filter((i) => !i.read && !ORBIT_KINDS.includes(i.kind)).length,
      unreadOrbit: visible.filter((i) => !i.read && ORBIT_KINDS.includes(i.kind)).length,
      unreadByKind,
      prefs,
      live,
      setLive,
      setPref,
      markRead: (id) => setReadIds((p) => (p.includes(id) ? p : [id, ...p])),
      markAllRead: () => setReadIds((p) => [...new Set([...events.map((e) => e.id), ...p])]),
      remove: (id) => setRemovedIds((p) => (p.includes(id) ? p : [id, ...p])),
      clearAll: () => setRemovedIds((p) => [...new Set([...events.map((e) => e.id), ...p])]),
    };
  }, [events, prefs, live, setPref, hideOrbitNotifications, readIds, removedIds]);

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
