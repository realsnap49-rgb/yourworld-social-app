import { useCallback, useEffect, useRef, useState } from "react";
import { X, Volume2, VolumeX, Pause } from "lucide-react";
import { cn } from "@/lib/utils";
import { aiFilterCss, type MyMoment } from "@/lib/moment-store";

const PHOTO_DURATION = 5000; // ms per photo/text segment
const TICK = 50;

type Props = {
  /** ordered segments (usually one author's moments) */
  segments: MyMoment[];
  startIndex?: number;
  onClose: () => void;
  onSegmentChange?: (m: MyMoment) => void;
};

/** Snapchat / Instagram style multi-segment moment player. */
export function MomentPlayer({ segments, startIndex = 0, onClose, onSegmentChange }: Props) {
  const [index, setIndex] = useState(Math.max(0, Math.min(startIndex, segments.length - 1)));
  const [progress, setProgress] = useState(0);
  const [paused, setPaused] = useState(false);
  const [muted, setMuted] = useState(false);

  const videoRef = useRef<HTMLVideoElement | null>(null);
  const holdTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const heldRef = useRef(false);

  const current = segments[index];

  const goNext = useCallback(() => {
    setProgress(0);
    setIndex((i) => {
      if (i < segments.length - 1) return i + 1;
      onClose();
      return i;
    });
  }, [segments.length, onClose]);

  const goPrev = useCallback(() => {
    const v = videoRef.current;
    if (v && v.currentTime > 2) {
      v.currentTime = 0;
      setProgress(0);
      return;
    }
    if (progress > 40 && current?.kind !== "video") {
      setProgress(0);
      return;
    }
    setProgress(0);
    setIndex((i) => Math.max(0, i - 1));
  }, [progress, current?.kind]);

  useEffect(() => {
    if (current) onSegmentChange?.(current);
  }, [current, onSegmentChange]);

  // preload the next segment's media
  useEffect(() => {
    const next = segments[index + 1];
    if (!next?.media) return;
    if (next.kind === "photo") {
      const img = new Image();
      img.src = next.media;
    } else if (next.kind === "video") {
      const v = document.createElement("video");
      v.preload = "metadata";
      v.src = next.media;
    }
  }, [index, segments]);

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

  // keep video playback in sync with pause state
  useEffect(() => {
    const v = videoRef.current;
    if (!v) return;
    if (paused) v.pause();
    else void v.play().catch(() => {});
  }, [paused, index]);

  const startHold = () => {
    heldRef.current = false;
    holdTimer.current = setTimeout(() => {
      heldRef.current = true;
      setPaused(true);
    }, 220);
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

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black select-none">
      {/* media */}
      <div className="relative h-full w-full max-w-md">
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
            onTimeUpdate={(e) => {
              const v = e.currentTarget;
              if (!v.duration || Number.isNaN(v.duration)) return;
              setProgress(Math.min(100, (v.currentTime / v.duration) * 100));
            }}
            onEnded={goNext}
          />
        ) : current.kind === "photo" && current.media ? (
          <img
            key={current.id}
            src={current.media}
            alt=""
            style={{ filter }}
            className="h-full w-full object-cover"
          />
        ) : (
          <div
            className="grid h-full w-full place-items-center p-8"
            style={{ background: current.textBg }}
          >
            <p className="text-center text-2xl font-bold text-white">{current.text}</p>
          </div>
        )}

        {/* tap zones */}
        <div className="absolute inset-0 z-[999] flex">
          <button
            aria-label="Previous"
            className="h-full w-[35%] cursor-pointer bg-transparent"
            style={{ pointerEvents: "auto" }}
            onPointerDown={startHold}
            onPointerUp={endHold}
            onPointerLeave={endHold}
            onClick={() => tap("prev")}
          />
          <button
            aria-label="Next"
            className="h-full w-[65%] cursor-pointer bg-transparent"
            style={{ pointerEvents: "auto" }}
            onPointerDown={startHold}
            onPointerUp={endHold}
            onPointerLeave={endHold}
            onClick={() => tap("next")}
          />
        </div>

        {/* segmented progress bars */}
        <div
          className={cn(
            "absolute left-2 right-2 top-2 z-[1000] flex gap-1 transition-opacity duration-200",
            paused ? "opacity-0" : "opacity-100",
          )}
        >
          {segments.map((s, i) => (
            <div key={s.id} className="h-[3px] flex-1 overflow-hidden rounded-full bg-white/30">
              <div
                className="h-full rounded-full bg-white"
                style={{
                  width: i < index ? "100%" : i === index ? `${progress}%` : "0%",
                  transition: i === index ? "width 80ms linear" : undefined,
                }}
              />
            </div>
          ))}
        </div>

        {/* header */}
        <div
          className={cn(
            "absolute inset-x-3 top-6 z-[1001] flex items-center justify-between transition-opacity duration-200",
            paused ? "pointer-events-none opacity-0" : "opacity-100",
          )}
        >
          <div className="flex items-center gap-2.5">
            <div className="h-9 w-9 overflow-hidden rounded-full border border-white/40 bg-neutral-800">
              {current.author?.avatar ? (
                <img src={current.author.avatar} alt="" className="h-full w-full object-cover" />
              ) : null}
            </div>
            <div className="flex items-center gap-2">
              <span className="text-sm font-semibold text-white drop-shadow">
                {current.author?.username ?? current.author?.name ?? "You"}
              </span>
              <span className="rounded-full bg-white/20 px-1.5 py-0.5 text-[10px] font-semibold text-white">
                {index + 1}/{segments.length}
              </span>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              aria-label={muted ? "Unmute" : "Mute"}
              onClick={() => setMuted((m) => !m)}
              className="grid h-9 w-9 place-items-center rounded-full bg-black/50 text-white backdrop-blur-md active:scale-90"
            >
              {muted ? <VolumeX className="h-4 w-4" /> : <Volume2 className="h-4 w-4" />}
            </button>
            <button
              aria-label="Close"
              onClick={onClose}
              className="grid h-9 w-9 place-items-center rounded-full bg-black/50 text-white backdrop-blur-md active:scale-90"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>

        {paused && (
          <div className="pointer-events-none absolute bottom-6 left-1/2 z-[1001] -translate-x-1/2 rounded-full bg-black/50 px-3 py-1.5 text-[11px] font-semibold text-white backdrop-blur-md">
            <Pause className="mr-1 inline h-3 w-3" /> Paused
          </div>
        )}
      </div>
    </div>
  );
}
