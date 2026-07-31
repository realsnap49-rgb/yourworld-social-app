import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { users } from "@/lib/yw-data";

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

export type MyMoment = {
  id: string;
  kind: MomentKind;
  /** object url or data url; empty for text moments */
  media: string;
  mediaType?: string;
  text: string;
  textBg: string;
  music?: string;
  stickers: Sticker[];
  /** transparent PNG data url from the drawing tool */
  drawing?: string;
  /** seconds, video moments only */
  trim?: { start: number; end: number };
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
};

export type NewMoment = Omit<
  MyMoment,
  "id" | "createdAt" | "archived" | "viewers" | "replies"
>;

type Store = {
  moments: MyMoment[];
  archive: MyMoment[];
  addMoment: (m: NewMoment) => MyMoment;
  deleteMoment: (id: string) => void;
  archiveMoment: (id: string) => void;
  restoreMoment: (id: string) => void;
  addReply: (id: string, text: string) => void;
  votePoll: (id: string, option: 0 | 1) => void;
  registerScreenshot: (id: string) => void;
};

const MomentContext = createContext<Store | null>(null);

/** Demo audience so views / likes / viewer list feel alive right away. */
function seedViewers(): MomentViewer[] {
  const now = Date.now();
  return users.slice(0, 4).map((u, i) => ({
    userId: u.id,
    at: now - (i + 1) * 7 * 60_000,
    liked: i % 2 === 0,
    screenshot: i === 1,
  }));
}

export function MomentProvider({ children }: { children: ReactNode }) {
  const [moments, setMoments] = useState<MyMoment[]>([]);

  const update = useCallback(
    (id: string, fn: (m: MyMoment) => MyMoment) =>
      setMoments((p) => p.map((m) => (m.id === id ? fn(m) : m))),
    [],
  );

  const value = useMemo<Store>(
    () => ({
      moments: moments.filter((m) => !m.archived),
      archive: moments.filter((m) => m.archived),
      addMoment: (m) => {
        const created: MyMoment = {
          ...m,
          id: `mm-${Date.now()}`,
          createdAt: Date.now(),
          archived: false,
          viewers: seedViewers(),
          replies: [],
        };
        setMoments((p) => [created, ...p]);
        return created;
      },
      deleteMoment: (id) => setMoments((p) => p.filter((m) => m.id !== id)),
      archiveMoment: (id) => update(id, (m) => ({ ...m, archived: true })),
      restoreMoment: (id) => update(id, (m) => ({ ...m, archived: false })),
      addReply: (id, text) =>
        update(id, (m) => ({
          ...m,
          replies: [
            ...m.replies,
            { id: `r-${Date.now()}`, userId: "u0", text, at: Date.now() },
          ],
        })),
      votePoll: (id, option) =>
        update(id, (m) => {
          if (!m.poll || m.poll.myVote !== null) return m;
          const votes: [number, number] = [...m.poll.votes] as [number, number];
          votes[option] += 1;
          return { ...m, poll: { ...m.poll, votes, myVote: option } };
        }),
      registerScreenshot: (id) =>
        update(id, (m) => ({
          ...m,
          viewers: m.viewers.map((v, i) => (i === 0 ? { ...v, screenshot: true } : v)),
        })),
    }),
    [moments, update],
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