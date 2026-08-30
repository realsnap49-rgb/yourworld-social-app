import { useState, useRef, useEffect, useCallback, useMemo } from "react";
import { createFileRoute, useParams, useNavigate } from "@tanstack/react-router";
import { aiFilterCss, useMoments, type MyMoment } from "@/lib/moment-store";
import { cn } from "@/lib/utils";
import { X, Heart, Send, Download, Volume2, VolumeX, Pause } from "lucide-react";
import { downloadMomentMedia } from "@/lib/yw-download";
import { toast } from "sonner";

/** photo / text segment length (ms) */
const PHOTO_DURATION = 5000;
const TICK = 60;
/** long videos are split into chunks of this many seconds */
const SEGMENT_DURATION = 40;

export const Route = createFileRoute("/moment/$momentId")({
  head: () => ({
    meta: [
      { title: "Moment — YourWorld" },
      { name: "description", content: "Watch this moment on YourWorld with Snapchat-style segmented playback." },
      { property: "og:title", content: "Moment — YourWorld" },
      { property: "og:description", content: "Watch this moment on YourWorld." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: MomentViewRoute,
});

function MomentViewRoute() {
  const { momentId } = useParams({ strict: false });
  const navigate = useNavigate();
  const { moments, registerView, addReply } = useMoments();

  const selected = useMemo(
    () => moments.find((m) => String(m.id) === String(momentId)),
    [moments, momentId],
  );

  /** all moments of the same author, oldest first */
  const items = useMemo<MyMoment[]>(() => {
    if (!selected) return [];
    const authorId = selected.author?.id;
    const list = authorId
      ? moments.filter((m) => m.author?.id === authorId)
      : [selected];
    return [...list].sort((a, b) => a.createdAt - b.createdAt);
  }, [moments, selected]);

  const [index, setIndex] = useState(0);
  const [progress, setProgress] = useState(0);
  const [videoChunks, setVideoChunks] = useState(1);
  const [chunk, setChunk] = useState(0);
  const [paused, setPaused] = useState(false);
  const [muted, setMuted] = useState(false);
  const [liked, setLiked] = useState(false);
  const [reply, setReply] = useState("");
  const [replying, setReplying] = useState(false);

  const videoRef = useRef<HTMLVideoElement | null>(null);
  const musicRef = useRef<HTMLAudioElement | null>(null);
  const holdTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const heldRef = useRef(false);

  const current = items[index] ?? selected ?? null;

  // sync index to the moment in the URL
  useEffect(() => {
    if (!selected) return;
    const i = items.findIndex((m) => m.id === selected.id);
    setIndex(i >= 0 ? i : 0);
    setChunk(0);
    setProgress(0);
  }, [selected, items]);

  const close = useCallback(() => navigate({ to: "/" }), [navigate]);

  const goNext = useCallback(() => {
    setProgress(0);
    if (chunk < videoChunks - 1) {
      const next = chunk + 1;
      setChunk(next);
      if (videoRef.current) videoRef.current.currentTime = next * SEGMENT_DURATION;
      return;
    }
    setChunk(0);
    setIndex((i) => {
      if (i < items.length - 1) return i + 1;
      close();
      return i;
    });
  }, [chunk, videoChunks, items.length, close]);

  const goPrev = useCallback(() => {
    setProgress(0);
    if (chunk > 0) {
      const prev = chunk - 1;
      setChunk(prev);
      if (videoRef.current) videoRef.current.currentTime = prev * SEGMENT_DURATION;
      return;
    }
    const v = videoRef.current;
    if (v && v.currentTime > 2) {
      v.currentTime = 0;
      return;
    }
    setChunk(0);
    setIndex((i) => Math.max(0, i - 1));
  }, [chunk]);

  // reset per-moment state + mark viewed
  useEffect(() => {
    if (!current) return;
    setLiked(false);
    setProgress(0);
    setChunk(0);
    setVideoChunks(1);
    registerView(current.id);
  }, [current?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  // preload next media
  useEffect(() => {
    const next = items[index + 1];
    if (!next?.media) return;
    if (next.kind === "photo") {
      const img = new Image();
      img.src = next.media;
    } else if (next.kind === "video") {
      const v = document.createElement("video");
      v.preload = "metadata";
      v.src = next.media;
    }
  }, [index, items]);

  // photo / text timer
  useEffect(() => {
    if (!current || current.kind === "video" || paused) return;
    const id = setInterval(() => {
      setProgress((p) => {
        const nextP = p + (TICK / PHOTO_DURATION) * 100;
        if (nextP >= 100) {
          goNext();
          return 0;
        }
        return nextP;
      });
    }, TICK);
    return () => clearInterval(id);
  }, [current, paused, goNext]);

  // pause / resume media
  useEffect(() => {
    const v = videoRef.current;
    const a = musicRef.current;
    if (paused) {
      v?.pause();
      a?.pause();
    } else {
      void v?.play().catch(() => {});
      void a?.play().catch(() => {});
    }
  }, [paused, index, chunk]);

  // background music
  useEffect(() => {
    const a = musicRef.current;
    if (!a || !current?.musicUrl) return;
    a.volume = Math.min(1, Math.max(0, current.musicVolume ?? (current.kind === "video" ? 0.35 : 0.8)));
    a.currentTime = current.musicStart ?? 0;
    if (!paused) void a.play().catch(() => {});
    return () => a.pause();
  }, [current?.id, current?.musicUrl]); // eslint-disable-line react-hooks/exhaustive-deps

  const startHold = () => {
    heldRef.current = false;
    holdTimer.current = setTimeout(() => {
      heldRef.current = true;
      setPaused(true);
    }, 250);
  };

  const endHold = () => {
    if (holdTimer.current) clearTimeout(holdTimer.current);
    holdTimer.current = null;
    if (heldRef.current) setPaused(false);
  };

  const tap = (dir: "prev" | "next") => {
    if (heldRef.current) {
      heldRef.current = false;
      return;
    }
    if (dir === "next") goNext();
    else goPrev();
  };

  if (!current) return null;

  const filter = aiFilterCss(current.ai, current.effect);
  const segments = current.kind === "video" ? videoChunks : 1;

  return (
    <div className="fixed inset-0 z-[99999] flex items-center justify-center bg-black select-none">
      <div className="relative flex h-full w-full max-w-md items-center justify-center overflow-hidden bg-black">
        {/* MEDIA */}
        <div className="pointer-events-none flex h-full w-full items-center justify-center">
          {current.kind === "video" && current.media ? (
            <video
              ref={videoRef}
              key={current.id}
              src={current.media}
              autoPlay
              playsInline
              muted={muted}
              preload="auto"
              style={{ filter }}
              className="h-full w-full object-cover"
              onLoadedMetadata={(e) => {
                const d = e.currentTarget.duration;
                setVideoChunks(Number.isFinite(d) && d > 0 ? Math.max(1, Math.ceil(d / SEGMENT_DURATION)) : 1);
              }}
              onTimeUpdate={(e) => {
                const v = e.currentTarget;
                if (!v.duration || Number.isNaN(v.duration)) return;
                const start = chunk * SEGMENT_DURATION;
                const end = Math.min(start + SEGMENT_DURATION, v.duration);
                setProgress(Math.min(100, Math.max(0, ((v.currentTime - start) / (end - start)) * 100)));
                if (v.currentTime >= end - 0.05) goNext();
              }}
              onEnded={goNext}
            />
          ) : current.kind === "photo" && current.media ? (
            <img key={current.id} src={current.media} alt="" style={{ filter }} className="h-full w-full object-cover" />
          ) : (
            <div className="grid h-full w-full place-items-center p-8" style={{ background: current.textBg || "#111" }}>
              <p className="text-center text-2xl font-bold text-white">{current.text}</p>
            </div>
          )}
        </div>

        {current.musicUrl ? <audio ref={musicRef} src={current.musicUrl} loop /> : null}

        {/* TAP ZONES */}
        <div className="absolute inset-0 z-[10000] flex">
          <button
            type="button"
            aria-label="Previous"
            className="h-full w-[30%] bg-transparent"
            onPointerDown={startHold}
            onPointerUp={endHold}
            onPointerLeave={endHold}
            onPointerCancel={endHold}
            onClick={() => tap("prev")}
          />
          <button
            type="button"
            aria-label="Next"
            className="h-full w-[70%] bg-transparent"
            onPointerDown={startHold}
            onPointerUp={endHold}
            onPointerLeave={endHold}
            onPointerCancel={endHold}
            onClick={() => tap("next")}
          />
        </div>

        {/* PROGRESS */}
        <div
          className={cn(
            "pointer-events-none absolute left-3 right-3 top-3 z-[10002] flex gap-1.5 transition-opacity duration-300",
            paused ? "opacity-0" : "opacity-100",
          )}
        >
          {Array.from({ length: segments }).map((_, idx) => (
            <div key={idx} className="h-1 flex-1 overflow-hidden rounded-full bg-white/30">
              <div
                className="h-full rounded-full bg-white"
                style={{
                  width: idx < chunk ? "100%" : idx === chunk ? `${progress}%` : "0%",
                  transition: idx === chunk ? "width 80ms linear" : undefined,
                }}
              />
            </div>
          ))}
        </div>

        {/* HEADER */}
        <div
          className={cn(
            "absolute left-3 right-3 top-7 z-[10002] flex items-center justify-between transition-opacity duration-300",
            paused ? "pointer-events-none opacity-0" : "opacity-100",
          )}
        >
          <div className="flex items-center gap-2.5">
            <div className="h-9 w-9 overflow-hidden rounded-full border-2 border-white/50 bg-neutral-800">
              {current.author?.avatar ? (
                <img src={current.author.avatar} className="h-full w-full object-cover" alt="" />
              ) : null}
            </div>
            <div className="flex items-center gap-2">
              <span className="text-sm font-bold text-white drop-shadow-md">
                {current.author?.name || current.author?.username || "You"}
              </span>
              {items.length > 1 ? (
                <span className="rounded-full bg-white/20 px-1.5 py-0.5 text-[10px] font-semibold text-white">
                  {index + 1}/{items.length}
                </span>
              ) : null}
            </div>
          </div>

          <div className="pointer-events-auto flex items-center gap-2">
            <button
              type="button"
              aria-label={muted ? "Unmute" : "Mute"}
              onClick={() => setMuted((m) => !m)}
              className="rounded-full border border-white/20 bg-black/60 p-2.5 text-white active:scale-90"
            >
              {muted ? <VolumeX className="h-4 w-4" /> : <Volume2 className="h-4 w-4" />}
            </button>
            <button
              type="button"
              aria-label="Close"
              onClick={close}
              className="rounded-full border border-white/20 bg-black/60 p-2.5 text-white active:scale-90"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>

        {/* PAUSED BADGE */}
        {paused ? (
          <div className="pointer-events-none absolute left-1/2 top-1/2 z-[10002] -translate-x-1/2 -translate-y-1/2 rounded-full bg-black/50 px-3 py-1.5 text-[11px] font-semibold text-white backdrop-blur-md">
            <Pause className="mr-1 inline h-3 w-3" /> Paused
          </div>
        ) : null}

        {/* FOOTER ACTIONS */}
        {!current.mine ? (
          <div
            className={cn(
              "absolute inset-x-3 bottom-4 z-[10002] flex items-center gap-2 transition-opacity duration-300",
              paused ? "pointer-events-none opacity-0" : "opacity-100",
            )}
          >
            <div className="flex flex-1 items-center gap-2 rounded-full border border-white/20 bg-black/50 px-3 py-1.5 backdrop-blur-md">
              <input
                value={reply}
                onChange={(e) => setReply(e.target.value)}
                onFocus={() => setPaused(true)}
                onBlur={() => setPaused(false)}
                placeholder="Send a reply"
                className="flex-1 bg-transparent text-sm text-white placeholder:text-white/50 focus:outline-none"
              />
              <button
                type="button"
                aria-label="Send reply"
                disabled={!reply.trim() || replying}
                onClick={() => {
                  const text = reply.trim();
                  if (!text) return;
                  setReplying(true);
                  addReply(current.id, text);
                  setReply("");
                  setReplying(false);
                  toast.success("Reply sent");
                }}
                className="text-white disabled:opacity-40"
              >
                <Send className="h-4 w-4" />
              </button>
            </div>
            <button
              type="button"
              aria-label="Like"
              onClick={() => {
                const next = !liked;
                setLiked(next);
                registerView(current.id, next);
              }}
              className="rounded-full border border-white/20 bg-black/50 p-2.5 text-white backdrop-blur-md active:scale-90"
            >
              <Heart className={cn("h-5 w-5", liked && "fill-red-500 text-red-500")} />
            </button>
            {current.allowDownload && current.media ? (
              <button
                type="button"
                aria-label="Download"
                onClick={() =>
                  void downloadMomentMedia(
                    current.media,
                    current.kind,
                    current.author?.username || "yourworld",
                    current.id,
                  )
                }
                className="rounded-full border border-white/20 bg-black/50 p-2.5 text-white backdrop-blur-md active:scale-90"
              >
                <Download className="h-5 w-5" />
              </button>
            ) : null}
          </div>
        ) : null}
      </div>
    </div>
  );
}
