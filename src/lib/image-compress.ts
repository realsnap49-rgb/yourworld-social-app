/** Client-side image compression so uploads/sends feel instant. */

type Options = { maxDim?: number; quality?: number };

const readAsDataUrl = (file: File) =>
  new Promise<string>((resolve, reject) => {
    const r = new FileReader();
    r.onload = () => resolve(r.result as string);
    r.onerror = reject;
    r.readAsDataURL(file);
  });

const loadImage = (src: string) =>
  new Promise<HTMLImageElement>((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = src;
  });

/**
 * Downscales + re-encodes an image file to a compact JPEG data URL.
 * Falls back to the raw data URL if anything goes wrong.
 */
export async function compressImageFile(file: File, opts: Options = {}): Promise<string> {
  const { maxDim = 1600, quality = 0.82 } = opts;
  const dataUrl = await readAsDataUrl(file);
  if (file.type === "image/gif") return dataUrl;
  try {
    const img = await loadImage(dataUrl);
    const scale = Math.min(1, maxDim / Math.max(img.naturalWidth, img.naturalHeight));
    if (scale >= 1 && file.size < 400_000) return dataUrl;
    const canvas = document.createElement("canvas");
    canvas.width = Math.max(1, Math.round(img.naturalWidth * scale));
    canvas.height = Math.max(1, Math.round(img.naturalHeight * scale));
    const ctx = canvas.getContext("2d");
    if (!ctx) return dataUrl;
    ctx.imageSmoothingQuality = "high";
    ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
    const out = canvas.toDataURL("image/jpeg", quality);
    return out.length < dataUrl.length ? out : dataUrl;
  } catch {
    return dataUrl;
  }
}
