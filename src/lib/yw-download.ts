/**
 * Downloads media at original resolution with a small semi-transparent YW
 * logo and the creator's @username watermark burned in.
 */
export async function downloadWithWatermark(src: string, username: string, fileName: string) {
  const img = new Image();
  img.crossOrigin = "anonymous";
  img.src = src;
  await img.decode();

  const canvas = document.createElement("canvas");
  canvas.width = img.naturalWidth;
  canvas.height = img.naturalHeight;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Canvas unavailable");

  ctx.drawImage(img, 0, 0);

  const unit = Math.max(canvas.width, canvas.height) * 0.032;
  const pad = unit * 0.9;
  const x = pad;
  const y = canvas.height - pad;

  ctx.save();
  ctx.globalAlpha = 0.55;
  ctx.shadowColor = "rgba(0,0,0,0.6)";
  ctx.shadowBlur = unit * 0.5;

  // YW mark
  ctx.font = `700 ${unit}px Sora, system-ui, sans-serif`;
  ctx.textBaseline = "alphabetic";
  ctx.fillStyle = "#ffffff";
  ctx.fillText("YW", x, y);
  const markWidth = ctx.measureText("YW").width;

  // creator handle
  ctx.globalAlpha = 0.45;
  ctx.font = `600 ${unit * 0.62}px Manrope, system-ui, sans-serif`;
  ctx.fillText(`@${username}`, x + markWidth + unit * 0.4, y);
  ctx.restore();

  const blob: Blob | null = await new Promise((resolve) =>
    canvas.toBlob((b) => resolve(b), "image/jpeg", 0.98),
  );
  if (!blob) throw new Error("Export failed");

  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = fileName;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}
/** Generic saver for any media (video/audio/photo) — keeps original bytes. */
export async function downloadMedia(src: string, fileName: string) {
  const blob = await (await fetch(src)).blob();
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = fileName;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

/** Photo → watermarked jpg, anything else → raw file. */
export async function downloadMomentMedia(
  src: string,
  kind: "photo" | "video" | "text",
  username: string,
  id: string,
) {
  if (kind === "photo") {
    try {
      await downloadWithWatermark(src, username, `yw-moment-${id}.jpg`);
      return;
    } catch {
      /* fall through to raw download */
    }
  }
  await downloadMedia(src, `yw-moment-${id}.${kind === "video" ? "mp4" : "jpg"}`);
}
