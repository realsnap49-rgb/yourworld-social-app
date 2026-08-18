/** Shared helpers for the chat photo editor (filters, overlays, canvas export). */

export type Overlay = {
  id: string;
  kind: "text" | "emoji";
  value: string;
  /** normalized 0..1 position inside the rendered image box */
  x: number;
  y: number;
  color: string;
  size: number;
};

export const PHOTO_FILTERS = [
  { id: "normal", name: "Original", class: "", css: "none" },
  {
    id: "soft-glow",
    name: "Soft Glow",
    class: "brightness-110 contrast-95 saturate-110 sepia-[0.15]",
    css: "brightness(1.1) contrast(0.95) saturate(1.1) sepia(0.15)",
  },
  { id: "vivid", name: "Vivid Pop", class: "saturate-150 contrast-105", css: "saturate(1.5) contrast(1.05)" },
  {
    id: "warm",
    name: "Warm Sun",
    class: "sepia-[0.25] saturate-125 brightness-105",
    css: "sepia(0.25) saturate(1.25) brightness(1.05)",
  },
  { id: "cool", name: "Cool Aesthetic", class: "hue-rotate-15 saturate-110", css: "hue-rotate(15deg) saturate(1.1)" },
  {
    id: "vintage",
    name: "Retro Vintage",
    class: "sepia-[0.4] contrast-110 brightness-95",
    css: "sepia(0.4) contrast(1.1) brightness(0.95)",
  },
  { id: "mono", name: "Noir B&W", class: "grayscale contrast-125", css: "grayscale(1) contrast(1.25)" },
];

export const TEXT_COLORS = ["#ffffff", "#000000", "#f43f5e", "#f59e0b", "#22c55e", "#38bdf8", "#a855f7"];

export const STICKER_EMOJIS = [
  "😀", "😍", "🥳", "😎", "🤩", "😭", "🔥", "❤️", "✨", "🎉",
  "👍", "🙌", "💯", "🌈", "⭐", "🍕", "☕", "🐶", "🌸", "🚀",
];

const loadImage = (src: string) =>
  new Promise<HTMLImageElement>((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = src;
  });

/** Crops a data URL to the normalized rect (0..1 values). */
export async function cropImage(
  src: string,
  rect: { x: number; y: number; w: number; h: number },
): Promise<string> {
  const img = await loadImage(src);
  const sx = Math.max(0, Math.round(rect.x * img.naturalWidth));
  const sy = Math.max(0, Math.round(rect.y * img.naturalHeight));
  const sw = Math.max(1, Math.round(rect.w * img.naturalWidth));
  const sh = Math.max(1, Math.round(rect.h * img.naturalHeight));
  const canvas = document.createElement("canvas");
  canvas.width = sw;
  canvas.height = sh;
  const ctx = canvas.getContext("2d");
  if (!ctx) return src;
  ctx.drawImage(img, sx, sy, sw, sh, 0, 0, sw, sh);
  return canvas.toDataURL("image/png");
}

/** Flattens the filter + overlays into a single PNG data URL. */
export async function renderPhoto(
  src: string,
  filterCss: string,
  overlays: Overlay[],
): Promise<string> {
  try {
    const img = await loadImage(src);
    const canvas = document.createElement("canvas");
    canvas.width = img.naturalWidth;
    canvas.height = img.naturalHeight;
    const ctx = canvas.getContext("2d");
    if (!ctx) return src;
    ctx.filter = filterCss || "none";
    ctx.drawImage(img, 0, 0);
    ctx.filter = "none";

    const unit = canvas.height / 100;
    for (const o of overlays) {
      const px = o.x * canvas.width;
      const py = o.y * canvas.height;
      ctx.font = `bold ${Math.round(o.size * unit)}px system-ui, sans-serif`;
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      if (o.kind === "text") {
        ctx.lineWidth = Math.max(2, o.size * unit * 0.08);
        ctx.strokeStyle = "rgba(0,0,0,0.55)";
        ctx.strokeText(o.value, px, py);
        ctx.fillStyle = o.color;
      } else {
        ctx.fillStyle = "#ffffff";
      }
      ctx.fillText(o.value, px, py);
    }
    return canvas.toDataURL("image/png");
  } catch {
    return src;
  }
}