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
import { uploadWithProgress } from "@/lib/storage-upload";
import { getRegisteredBlob, unregisterBlob } from "@/lib/blob-registry";


export type MomentKind = "photo" | "video" | "text";
export type MomentPrivacy = "everyone" | "followers" | "close" | "onlyme";
export type MomentEffect = "none" | "boomerang" | "slowmo" | "reverse" | "greenscreen";
export type AiTool = "beauty" | "filter" | "background" | "cartoon" | "eraser";

export type Sticker = {
  id: string;
  /** emoji glyph or image url */
  content: string;
  type: "emoji" | "gif" | "text";
  x: number; // 0..1
  y: number; // 0..1
  scale: number;
  /** degrees */
  rotation?: number;
  color?: string;
};

export type MomentPoll = {
  question: string;
  options: [string, string];
  votes: [number, number];
  myVote: 0 | 1 | null;
};

export type MomentReply = { id: string; userId: string; text: string; at: number };

export type MomentViewer = { userId: string; at: number; liked: boolean; screenshot: boolean };

export type MomentAuthor = { id: string; name: string; username: string; avatar: string | null };


export type MyMoment = {
  id: string;
  kind: MomentKind;
  /** object url or data url; empty for text moments */
  media: string;
  mediaType?: string;
  text: string;
  textBg: string;
  music?: string;
  /** real playable audio source picked in the editor */
  musicUrl?: string;
  /** trim window inside the audio file (seconds) */
  musicStart?: number;
  musicEnd?: number;
  musicVolume?: number;
  stickers: Sticker[];
  /** transparent PNG data url from the drawing tool */
  drawing?: string;
  /** seconds, video moments only */
  trim?: { start: number; end: number };
  /** preview crop / zoom framing captured in the editor */
  crop?: {
    zoom: number;
    x: number;
    y: number;
    ratio: string;
    frameW: number;
    frameH: number;
  };
  location?: string;
  mentions: string[];
  privacy: MomentPrivacy;
  /** hours */
  duration: 12 | 24;
  effect: MomentEffect;
  ai: Partial<Record<AiTool, boolean>>;
  allowDownload: boolean;
  screenshotAlert: boolean;
  poll: MomentPoll | null;
  createdAt: number;
  archived: boolean;
  viewers: MomentViewer[];
  replies: MomentReply[];
  /** author of the moment (real profile) */
  author?: MomentAuthor;
  mine?: boolean;
};

export type NewMoment = Omit<
  MyMoment,
  "id" | "createdAt" | "archived" | "viewers" | "replies"
>;

type Store = {
  moments: MyMoment[];
  archive: MyMoment[];
  loading: boolean;
  addMoment: (m: NewMoment) => MyMoment;
  deleteMoment: (id: string) => void;
  archiveMoment: (id: string) => void;
  restoreMoment: (id: string) => void;
  addReply: (id: string, text: string) => void;
  votePoll: (id: string, option: 0 | 1) => void;
  registerScreenshot: (id: string) => void;
  registerView: (id: string, liked?: boolean) => void;
  reload: () => Promise<void>;
};

const MomentContext = createContext<Store | null>(null);

type DbView = {
  moment_id: string;
  viewer_id: string;
  liked: boolean;
  screenshot: boolean;
  created_at: string;
};

type DbReply = {
  id: string;
  moment_id: string;
  user_id: string;
  text: string;
  created_at: string;
};

type DbMoment = {

  id: string;
  user_id: string;
  kind: string;
  media_url: string | null;
  media_type: string | null;
  text: string;
  text_bg: string;
  payload: Record<string, unknown> | null;
  privacy: string;
  duration: number;
  allow_download: boolean;
  screenshot_alert: boolean;
  poll: MomentPoll | null;
  archived: boolean;
  created_at: string;
};

function rowToMoment(
  row: DbMoment,
  views: MomentViewer[],
  replies: MomentReply[],
  author: MomentAuthor | undefined,
  uid: string | null,
): MyMoment {
  const p = (row.payload ?? {}) as Record<string, never>;
  return {
    id: row.id,
    kind: (row.kind as MomentKind) ?? "photo",
    media: row.media_url ?? "",
    mediaType: row.media_type ?? undefined,
    text: row.text ?? "",
    textBg: row.text_bg ?? "",
    music: p["music"],
    musicUrl: p["musicUrl"],
    musicStart: p["musicStart"],
    musicEnd: p["musicEnd"],
    musicVolume: p["musicVolume"],
    stickers: (p["stickers"] as Sticker[] | undefined) ?? [],
    drawing: p["drawing"],
    trim: p["trim"],
    crop: p["crop"],
    location: p["location"],
    mentions: (p["mentions"] as string[] | undefined) ?? [],
    privacy: (row.privacy as MomentPrivacy) ?? "everyone",
    duration: (row.duration === 12 ? 12 : 24) as 12 | 24,
    effect: (p["effect"] as MomentEffect | undefined) ?? "none",
    ai: (p["ai"] as Partial<Record<AiTool, boolean>> | undefined) ?? {},
    allowDownload: row.allow_download,
    screenshotAlert: row.screenshot_alert,
    poll: row.poll,
    createdAt: new Date(row.created_at).getTime(),
    archived: row.archived,
    viewers: views,
    replies,
    author,
    mine: !!uid && row.user_id === uid,
  };
}

function payloadOf(m: NewMoment) {
  return {
    music: m.music ?? null,
    musicUrl: m.musicUrl ?? null,
    musicStart: m.musicStart ?? null,
    musicEnd: m.musicEnd ?? null,
    musicVolume: m.musicVolume ?? null,
    stickers: m.stickers ?? [],
    drawing: m.drawing ?? null,
    trim: m.trim ?? null,
    crop: m.crop ?? null,
    location: m.location ?? null,
    mentions: m.mentions ?? [],
    effect: m.effect ?? "none",
    ai: m.ai ?? {},
  };
}

/** Uploads a blob/data url to the private moments bucket; returns the storage path. */
async function uploadMomentMedia(uid: string, src: string, mediaType?: string, prefix = "media") {
  if (!src || (!src.startsWith("blob:") && !src.startsWith("data:"))) return src;
  // Prefer the retained Blob: the object URL may already be revoked by the
  // editor screen that unmounted while this upload runs in the background.
  let blob = getRegisteredBlob(src);
  if (!blob) {
    const res = await fetch(src);
    if (!res.ok) throw new Error("Media is no longer available on this device");
    blob = await res.blob();
  }
  // Callers sometimes pass a short kind ("video"/"image") instead of a real
  // MIME type — storage rejects those with a 400, so normalise here.
  const hinted = mediaType && mediaType.includes("/") ? mediaType : "";
  const type =
    blob.type ||
    hinted ||
    (mediaType === "video" ? "video/mp4" : mediaType === "audio" ? "audio/mpeg" : "image/jpeg");
  const ext = type.includes("audio")
    ? type.includes("wav")
      ? "wav"
      : type.includes("mp4") || type.includes("m4a")
        ? "m4a"
        : "mp3"
    : type.includes("video")
    ? type.includes("webm")
      ? "webm"
      : "mp4"
    : type.includes("png")
      ? "png"
      : "jpg";
  const path = `${uid}/${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;
  const { url, error } = await uploadWithProgress("moments", path, blob, type);
  if (error && !url) throw new Error(error);
  // Store the storage path; every viewer signs their own short-lived URL.
  return path;
}


/** Signs media and music paths so any allowed viewer can play the moment. */
async function signMomentMedia(list: MyMoment[]) {
  const paths = [
    ...new Set(
      list
        .flatMap((m) => [m.media, m.musicUrl])
        .filter((path): path is string => !!path && !/^(https?:|data:|blob:)/.test(path)),
    ),
  ];
  if (!paths.length) return list;
  const { data } = await supabase.storage.from("moments").createSignedUrls(paths, 60 * 60 * 6);
  const byPath = new Map(
    (data ?? [])
      .filter((d) => d.signedUrl && d.path)
      .map((d) => [d.path as string, d.signedUrl as string]),
  );
  return list.map((m) => ({
    ...m,
    media: byPath.get(m.media) ?? m.media,
    musicUrl: m.musicUrl ? byPath.get(m.musicUrl) ?? m.musicUrl : undefined,
  }));
}


export function MomentProvider({ children }: { children: ReactNode }) {
  const [moments, setMoments] = useState<MyMoment[]>([]);
  const [loading, setLoading] = useState(true);
  const uidRef = useRef<string | null>(null);

  const load = useCallback(async () => {
    const { data: auth } = await supabase.auth.getUser();
    const uid = auth.user?.id ?? null;
    uidRef.current = uid;
    if (!uid) {
      setMoments([]);
      setLoading(false);
      return;
    }

    const { data: rows } = await supabase
      .from("moments")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(200);

    const list = (rows ?? []) as unknown as DbMoment[];
    if (!list.length) {
      setMoments([]);
      setLoading(false);
      return;
    }

    const ids = list.map((r) => r.id);
    const authorIds = [...new Set(list.map((r) => r.user_id))];

    const [{ data: views }, { data: replies }, { data: profiles }] = await Promise.all([
      supabase.from("moment_views").select("*").in("moment_id", ids),
      supabase.from("moment_replies").select("*").in("moment_id", ids),
      supabase.rpc("get_public_profiles", { ids: authorIds }),
    ]);

    const profileById = new Map(
      ((profiles ?? []) as { id: string; username: string | null; display_name?: string | null; avatar_url: string | null }[]).map(
        (p) => [
          p.id,
          {
            id: p.id,
            username: p.username ?? "user",
            name: p.display_name ?? p.username ?? "User",
            avatar: p.avatar_url,
          } satisfies MomentAuthor,
        ],
      ),
    );

    const mapped = list.map((row) =>
      rowToMoment(
        row,
        ((views ?? []) as DbView[])
          .filter((v) => v.moment_id === row.id)
          .map((v) => ({
            userId: v.viewer_id,
            at: new Date(v.created_at).getTime(),
            liked: v.liked,
            screenshot: v.screenshot,
          })),
        ((replies ?? []) as DbReply[])
          .filter((r) => r.moment_id === row.id)
          .map((r) => ({
            id: r.id,
            userId: r.user_id,
            text: r.text,
            at: new Date(r.created_at).getTime(),
          })),

        profileById.get(row.user_id),
        uid,
      ),
    );

    setMoments(await signMomentMedia(mapped));
    setLoading(false);
  }, []);


  useEffect(() => {
    void load();
    const channel = supabase
      .channel("moments-live")
      .on("postgres_changes", { event: "*", schema: "public", table: "moments" }, () => void load())
      .on("postgres_changes", { event: "*", schema: "public", table: "moment_views" }, () => void load())
      .on("postgres_changes", { event: "*", schema: "public", table: "moment_replies" }, () => void load())
      .subscribe();
    const { data: sub } = supabase.auth.onAuthStateChange(() => void load());
    return () => {
      void supabase.removeChannel(channel);
      sub.subscription.unsubscribe();
    };
  }, [load]);

  const patch = useCallback(
    (id: string, fn: (m: MyMoment) => MyMoment) =>
      setMoments((p) => p.map((m) => (m.id === id ? fn(m) : m))),
    [],
  );

  const value = useMemo<Store>(
    () => ({
      moments: moments.filter((m) => !m.archived),
      archive: moments.filter((m) => m.archived),
      loading,
      addMoment: (m) => {
        const tempId = `pending-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
        const optimistic: MyMoment = {
          ...m,
          id: tempId,
          createdAt: Date.now(),
          archived: false,
          viewers: [],
          replies: [],
          mine: true,
        };
        setMoments((p) => [optimistic, ...p]);

        void (async () => {
          const uid = uidRef.current ?? (await supabase.auth.getUser()).data.user?.id ?? null;
          if (!uid) {
            toast.error("Sign in to publish a moment");
            setMoments((p) => p.filter((x) => x.id !== tempId));
            return;
          }
          let media = "";
          let musicUrl = m.musicUrl;
          if (m.media) {
            try {
              media = await uploadMomentMedia(uid, m.media, m.mediaType);
            } catch (e) {
              toast.error(
                e instanceof Error ? e.message : "Couldn't upload this moment's media",
              );
              setMoments((p) => p.filter((x) => x.id !== tempId));
              return;
            }
          }
          if (musicUrl?.startsWith("blob:") || musicUrl?.startsWith("data:")) {
            const localMusic = musicUrl;
            try {
              musicUrl = await uploadMomentMedia(uid, localMusic, "audio", "music");
            } catch (e) {
              toast.error(e instanceof Error ? e.message : "Couldn't upload the moment song");
              musicUrl = undefined;
            }
            unregisterBlob(localMusic);
          }
          // never persist a device-only url — it can't play for anyone else
          if (musicUrl && /^(blob:|data:)/.test(musicUrl)) musicUrl = undefined;
          if (m.media) unregisterBlob(m.media);
          if (m.kind !== "text" && !media) {
            toast.error("Couldn't upload this moment's media");
            setMoments((p) => p.filter((x) => x.id !== tempId));
            return;
          }
          const hours = m.duration === 12 ? 12 : 24;

          const { error } = await supabase.from("moments").insert({
            user_id: uid,
            kind: m.kind,
            media_url: media || null,
            media_type: m.mediaType ?? null,
            text: m.text ?? "",
            text_bg: m.textBg ?? "",
            payload: payloadOf({ ...m, musicUrl }),
            privacy: m.privacy,
            duration: hours,
            allow_download: m.allowDownload,
            screenshot_alert: m.screenshotAlert,
            poll: m.poll,
            expires_at: new Date(Date.now() + hours * 3600_000).toISOString(),
          });
          setMoments((p) => p.filter((x) => x.id !== tempId));
          if (error) toast.error("Couldn't publish this moment");
          await load();
        })();

        return optimistic;
      },
      deleteMoment: (id) => {
        setMoments((p) => p.filter((m) => m.id !== id));
        void supabase.from("moments").delete().eq("id", id);
      },
      archiveMoment: (id) => {
        patch(id, (m) => ({ ...m, archived: true }));
        void supabase.from("moments").update({ archived: true }).eq("id", id);
      },
      restoreMoment: (id) => {
        patch(id, (m) => ({ ...m, archived: false }));
        void supabase.from("moments").update({ archived: false }).eq("id", id);
      },
      addReply: (id, text) => {
        const uid = uidRef.current;
        if (!uid || !text.trim()) return;
        patch(id, (m) => ({
          ...m,
          replies: [...m.replies, { id: `tmp-${Date.now()}`, userId: uid, text, at: Date.now() }],
        }));
        void supabase.from("moment_replies").insert({ moment_id: id, user_id: uid, text });
      },
      votePoll: (id, option) => {
        const target = moments.find((m) => m.id === id);
        if (!target?.poll || target.poll.myVote !== null) return;
        const votes: [number, number] = [...target.poll.votes] as [number, number];
        votes[option] += 1;
        const poll = { ...target.poll, votes, myVote: option };
        patch(id, (m) => ({ ...m, poll }));
        if (target.mine) void supabase.from("moments").update({ poll }).eq("id", id);
      },
      registerScreenshot: (id) => {
        const uid = uidRef.current;
        if (!uid) return;
        void supabase
          .from("moment_views")
          .upsert(
            { moment_id: id, viewer_id: uid, screenshot: true },
            { onConflict: "moment_id,viewer_id" },
          );
      },
      registerView: (id, liked) => {
        const uid = uidRef.current;
        if (!uid || id.startsWith("pending-")) return;
        void supabase
          .from("moment_views")
          .upsert(
            { moment_id: id, viewer_id: uid, ...(liked === undefined ? {} : { liked }) },
            { onConflict: "moment_id,viewer_id" },
          );
      },
      reload: load,
    }),
    [moments, loading, patch, load],
  );

  return <MomentContext.Provider value={value}>{children}</MomentContext.Provider>;
}

export function useMoments() {
  const ctx = useContext(MomentContext);
  if (!ctx) throw new Error("useMoments must be used inside MomentProvider");
  return ctx;
}


export const MOMENT_MUSIC = [
  "midnight drive — lowtide",
  "saltwater — mara vega",
  "spotlight (slowed) — ada k",
  "tokyo rain — kuro",
  "soft focus — velour",
  "afterglow — nite tape",
];

export const MOMENT_EMOJI = [
  "🔥","✨","💜","😍","😂","🥹","🎧","🌙","🌊","☕","📸","🎬","💫","🫶","🌸","⚡",
];

export const MOMENT_GIFS = [
  { id: "g1", label: "Hearts", content: "💗💗" },
  { id: "g2", label: "Party", content: "🎉🎊" },
  { id: "g3", label: "Sparkle", content: "✨💫✨" },
  { id: "g4", label: "Wow", content: "😮‍💨" },
  { id: "g5", label: "Love", content: "😻" },
  { id: "g6", label: "Yes", content: "👏👏" },
];

export const MOMENT_LOCATIONS = [
  "Tokyo, Japan",
  "Lisbon, Portugal",
  "Seoul, South Korea",
  "Paris, France",
  "New York, USA",
  "Bali, Indonesia",
];

export const TEXT_BACKGROUNDS = [
  "linear-gradient(140deg, oklch(0.68 0.245 356), oklch(0.62 0.2 290))",
  "linear-gradient(140deg, oklch(0.72 0.16 210), oklch(0.5 0.18 265))",
  "linear-gradient(140deg, oklch(0.8 0.16 80), oklch(0.62 0.2 30))",
  "linear-gradient(140deg, oklch(0.7 0.16 150), oklch(0.45 0.14 200))",
  "linear-gradient(140deg, oklch(0.28 0.02 280), oklch(0.16 0.01 280))",
];

/** CSS filter chain for the selected AI camera tools + effects. */
export function aiFilterCss(ai: Partial<Record<AiTool, boolean>>, effect: MomentEffect) {
  const parts: string[] = [];
  if (ai.beauty) parts.push("brightness(1.08) saturate(1.06) contrast(0.96) blur(0.4px)");
  if (ai.filter) parts.push("hue-rotate(-12deg) saturate(1.25)");
  if (ai.background) parts.push("contrast(1.12) saturate(1.3)");
  if (ai.cartoon) parts.push("contrast(1.5) saturate(1.7) brightness(1.05)");
  if (ai.eraser) parts.push("brightness(1.02)");
  if (effect === "greenscreen") parts.push("saturate(1.4) hue-rotate(8deg)");
  return parts.join(" ") || "none";
}