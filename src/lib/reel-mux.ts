/**
 * Bakes the selected music track into the exported reel.
 *
 * Plays the clip in real time, draws every frame to a canvas and mixes the
 * clip's own audio with the trimmed music through the Web Audio API, then
 * records the combined stream with MediaRecorder.
 */
export type MuxMusic = {
  url: string;
  /** where the music starts on the video timeline (seconds) */
  start: number;
  /** trim window inside the song */
  clipStart: number;
  clipEnd: number;
  /** 0..1 */
  volume?: number;
};

export type MuxOptions = {
  videoUrl: string;
  trimStart?: number;
  trimEnd?: number;
  music: MuxMusic;
  onProgress?: (pct: number) => void;
};

function pickMime(): string | undefined {
  const candidates = [
    "video/webm;codecs=vp9,opus",
    "video/webm;codecs=vp8,opus",
    "video/webm",
    "video/mp4",
  ];
  return candidates.find((m) => MediaRecorder.isTypeSupported?.(m));
}

export function canMuxReel(): boolean {
  return (
    typeof window !== "undefined" &&
    typeof MediaRecorder !== "undefined" &&
    !!(window.AudioContext || (window as any).webkitAudioContext) &&
    typeof HTMLCanvasElement.prototype.captureStream === "function"
  );
}

/** Returns an object URL of the rendered video (with music), or null on failure. */
export async function renderReelWithMusic(opts: MuxOptions): Promise<string | null> {
  if (!canMuxReel()) return null;
  const { videoUrl, music } = opts;

  const video = document.createElement("video");
  video.src = videoUrl;
  video.crossOrigin = "anonymous";
  video.playsInline = true;
  video.muted = false;
  video.preload = "auto";

  const audio = new Audio();
  audio.src = music.url;
  audio.crossOrigin = "anonymous";
  audio.preload = "auto";

  const Ctx: typeof AudioContext =
    (window as any).AudioContext || (window as any).webkitAudioContext;
  const actx = new Ctx();
  let recorder: MediaRecorder | null = null;

  const cleanup = () => {
    try { recorder?.state !== "inactive" && recorder?.stop(); } catch { /* noop */ }
    try { video.pause(); } catch { /* noop */ }
    try { audio.pause(); } catch { /* noop */ }
    void actx.close().catch(() => {});
  };

  try {
    await new Promise<void>((resolve, reject) => {
      const ok = () => resolve();
      video.addEventListener("loadedmetadata", ok, { once: true });
      video.addEventListener("error", () => reject(new Error("video load")), { once: true });
      video.load();
    });
    await new Promise<void>((resolve) => {
      if (audio.readyState >= 1) return resolve();
      audio.addEventListener("loadedmetadata", () => resolve(), { once: true });
      audio.addEventListener("error", () => resolve(), { once: true });
      audio.load();
    });

    const start = Math.max(0, opts.trimStart ?? 0);
    const end = Math.min(video.duration || 0, opts.trimEnd || video.duration || 0);
    const span = Math.max(0.2, end - start);

    const canvas = document.createElement("canvas");
    canvas.width = video.videoWidth || 720;
    canvas.height = video.videoHeight || 1280;
    const g = canvas.getContext("2d");
    if (!g) throw new Error("no canvas ctx");

    const dest = actx.createMediaStreamDestination();

    // clip's own audio
    try {
      const vSrc = actx.createMediaElementSource(video);
      const vGain = actx.createGain();
      vGain.gain.value = 0.85;
      vSrc.connect(vGain).connect(dest);
    } catch { /* video may have no audio track */ }

    // music
    const aSrc = actx.createMediaElementSource(audio);
    const aGain = actx.createGain();
    aGain.gain.value = music.volume ?? 1;
    aSrc.connect(aGain).connect(dest);

    const stream = new MediaStream([
      ...canvas.captureStream(30).getVideoTracks(),
      ...dest.stream.getAudioTracks(),
    ]);

    const mime = pickMime();
    recorder = new MediaRecorder(stream, mime ? { mimeType: mime } : undefined);
    const chunks: BlobPart[] = [];
    recorder.ondataavailable = (e) => e.data.size && chunks.push(e.data);
    const done = new Promise<Blob>((resolve) => {
      recorder!.onstop = () => resolve(new Blob(chunks, { type: mime || "video/webm" }));
    });

    video.currentTime = start;
    await new Promise<void>((r) => video.addEventListener("seeked", () => r(), { once: true }));

    await actx.resume().catch(() => {});
    recorder.start(200);
    await video.play();

    // music scheduling relative to the clip window
    const musicSpan = Math.max(0.2, music.clipEnd - music.clipStart);
    let musicOn = false;
    let raf = 0;
    const draw = () => {
      g.drawImage(video, 0, 0, canvas.width, canvas.height);
      const rel = video.currentTime - start - Math.max(0, music.start - start);
      if (rel >= 0 && rel <= musicSpan) {
        const t = music.clipStart + rel;
        if (!musicOn) {
          musicOn = true;
          try { audio.currentTime = t; } catch { /* noop */ }
          void audio.play().catch(() => {});
        } else if (Math.abs(audio.currentTime - t) > 0.35) {
          try { audio.currentTime = t; } catch { /* noop */ }
        }
      } else if (musicOn) {
        musicOn = false;
        audio.pause();
      }
      opts.onProgress?.(Math.min(99, ((video.currentTime - start) / span) * 100));
      raf = requestAnimationFrame(draw);
    };
    raf = requestAnimationFrame(draw);

    await new Promise<void>((resolve) => {
      const stop = () => {
        video.removeEventListener("ended", stop);
        resolve();
      };
      video.addEventListener("ended", stop);
      const tick = window.setInterval(() => {
        if (video.currentTime >= end - 0.05) {
          window.clearInterval(tick);
          stop();
        }
      }, 100);
    });

    cancelAnimationFrame(raf);
    video.pause();
    audio.pause();
    recorder.stop();
    const blob = await done;
    void actx.close().catch(() => {});
    opts.onProgress?.(100);
    if (!blob.size) return null;
    return URL.createObjectURL(blob);
  } catch {
    cleanup();
    return null;
  }
}
