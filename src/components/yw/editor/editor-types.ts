export type Ratio = "9:16" | "1:1" | "4:5" | "free";

export type Clip = { id: string; start: number; end: number };

export type TextLayer = {
  id: string;
  text: string;
  x: number;
  y: number;
  color: string;
  font: string;
  anim: "none" | "fade" | "pop" | "slide";
  style: "plain" | "boxed" | "outline";
  size: number;
};

export type StickerLayer = { id: string; emoji: string; x: number; y: number; size: number };

export type EditorState = {
  ratio: Ratio;
  rotation: number;
  flipH: boolean;
  flipV: boolean;
  zoom: number;
  offsetX: number;
  offsetY: number;
  speed: number;
  speedCurve: "linear" | "montage" | "hero" | "jump" | "bullet";
  clips: Clip[];
  activeClip: string;
  music?: string;
  sfx?: string;
  voiceover?: string;
  extractedAudio: boolean;
  volume: number;
  texts: TextLayer[];
  stickers: StickerLayer[];
  autoCaptions: boolean;
  filter: string;
  brightness: number;
  contrast: number;
  saturation: number;
  warmth: number;
  transition: string;
  pip?: string;
};

export const initialEditorState = (duration: number): EditorState => ({
  ratio: "9:16",
  rotation: 0,
  flipH: false,
  flipV: false,
  zoom: 1,
  offsetX: 0,
  offsetY: 0,
  speed: 1,
  speedCurve: "linear",
  clips: [{ id: "c1", start: 0, end: duration || 15 }],
  activeClip: "c1",
  extractedAudio: false,
  volume: 100,
  texts: [],
  stickers: [],
  autoCaptions: false,
  filter: "none",
  brightness: 100,
  contrast: 100,
  saturation: 100,
  warmth: 0,
  transition: "none",
});

export const FILTERS: { id: string; label: string; css: string }[] = [
  { id: "none", label: "Original", css: "" },
  { id: "lux", label: "Lux", css: "contrast(1.12) saturate(1.15) brightness(1.03)" },
  { id: "noir", label: "Noir", css: "grayscale(1) contrast(1.2)" },
  { id: "film", label: "Film", css: "sepia(0.25) contrast(1.08) saturate(0.92)" },
  { id: "neon", label: "Neon", css: "saturate(1.6) hue-rotate(-12deg) contrast(1.1)" },
  { id: "frost", label: "Frost", css: "saturate(0.8) brightness(1.08) hue-rotate(10deg)" },
  { id: "vhs", label: "VHS", css: "saturate(1.3) contrast(0.94) sepia(0.15)" },
];

export const SPEED_CURVES = [
  { id: "linear", label: "Linear" },
  { id: "montage", label: "Montage" },
  { id: "hero", label: "Hero" },
  { id: "jump", label: "Jump Cut" },
  { id: "bullet", label: "Bullet Time" },
] as const;

export const MUSIC = [
  "Midnight Drive — LO:KI",
  "Golden Hour — Aeris",
  "Tokyo Rain — Nakamo",
  "Paper Planes — Yuna B.",
  "Slow Burn — Vellum",
];

export const SFX = ["Whoosh", "Riser", "Camera Shutter", "Vinyl Scratch", "Bass Drop", "Sparkle"];

export const FONTS = ["Display", "Grotesk", "Serif", "Mono", "Handwritten"];

export const TRANSITIONS = ["none", "Fade", "Whip Pan", "Zoom Blur", "Glitch", "Slide", "Flash"];

export const STICKERS = ["✨", "🔥", "💫", "🎧", "🌙", "🫶", "😎", "📍", "💚", "⚡"];
