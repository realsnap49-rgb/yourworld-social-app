import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Music2, Plus, Volume2, VolumeX } from "lucide-react";

export interface TimelineClip {
  id: string;
  url?: string;
  duration?: number;
  trimStart?: number;
  trimEnd?: number;
}

export interface LightTimelineProps {
  clips: TimelineClip[];
  activeIndex: number;
  currentTime: number;
  totalDuration: number;
  playFraction?: number;
  isPlaying?: boolean;
  audioLabel?: string;
  onAddAudio?: () => void;
  isMuted?: boolean;
  onToggleMute?: () => void;
  onSelect?: (index: number) => void;
  onTrim?: (index: number, start: number, end: number) => void;
  onAdd?: () => void;
  onScrub?: (index: number, fraction: number) => void;
}

const CELL = 112;

const fmt = (s: number) => {
  const t = Math.max(0, Math.floor(s || 0));
  return `${Math.floor(t / 60)}:${String(t % 60).padStart(2, "0")}`;
};

const clipLen = (c: TimelineClip) => {
  const dur = c.duration || 0;
  const start = c.trimStart ?? 0;
  const end = c.trimEnd ?? dur;
  return Math.max(0.1, end - start);
};

// ---- thumbnail extraction (cached per url+time) ----
const thumbCache = new Map<string, string>();

function grabFrame(url: string, time: number): Promise<string> {
  const key = `${url}@${time.toFixed(2)}`;
  const hit = thumbCache.get(key);
  if (hit) return Promise.resolve(hit);
  return new Promise((resolve, reject) => {
    const v = document.createElement("video");
    v.crossOrigin = "anonymous";
    v.muted = true;
    v.playsInline = true;
    v.preload = "auto";
    v.src = url;
    const cleanup = () => {
      v.removeAttribute("src");
      try { v.load(); } catch { /* ignore */ }
    };
    const onSeeked = () => {
      try {
        const canvas = document.createElement("canvas");
        const w = 160;
        const ratio = v.videoHeight ? v.videoHeight / v.videoWidth : 16 / 9;
        canvas.width = w;
        canvas.height = Math.max(1, Math.round(w * ratio));
        const ctx = canvas.getContext("2d");
        if (!ctx) throw new Error("no ctx");
        ctx.drawImage(v, 0, 0, canvas.width, canvas.height);
        const data = canvas.toDataURL("image/jpeg", 0.6);
        thumbCache.set(key, data);
        cleanup();
        resolve(data);
      } catch (e) {
        cleanup();
        reject(e);
      }
    };
    v.addEventListener("loadeddata", () => {
      const t = Math.min(Math.max(0.05, time), Math.max(0.05, (v.duration || 1) - 0.05));
      v.addEventListener("seeked", onSeeked, { once: true });
      try { v.currentTime = t; } catch { onSeeked(); }
    }, { once: true });
    v.addEventListener("error", () => { cleanup(); reject(new Error("thumb load failed")); }, { once: true });
  });
}

function useThumbnails(clips: TimelineClip[]) {
  const [thumbs, setThumbs] = useState<Record<string, string>>({});
  const sig = clips.map((c) => `${c.id}:${c.url ?? ""}:${(c.trimStart ?? 0).toFixed(2)}`).join("|");
  useEffect(() => {
    let cancelled = false;
    (async () => {
      for (const c of clips) {
        if (!c.url) continue;
        const at = (c.trimStart ?? 0) + 0.1;
        try {
          const data = await grabFrame(c.url, at);
          if (cancelled) return;
          setThumbs((prev) => (prev[c.id] === data ? prev : { ...prev, [c.id]: data }));
        } catch { /* ignore */ }
      }
    })();
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sig]);
  return thumbs;
}

export function LightTimeline({
  clips,
  activeIndex,
  currentTime,
  totalDuration,
  playFraction,
  isPlaying,
  audioLabel,
  onAddAudio,
  isMuted,
  onToggleMute,
  onSelect,
  onAdd,
  onScrub,
}: LightTimelineProps) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const userScrollRef = useRef(false);
  const userTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const padRef = useRef(0);

  const lens = useMemo(() => clips.map(clipLen), [clips]);
  const thumbs = useThumbnails(clips);

  // keep half-container padding so the first/last frame can reach the center line
  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    const set = () => {
      padRef.current = el.clientWidth / 2;
      el.style.paddingLeft = `${padRef.current}px`;
      el.style.paddingRight = `${padRef.current}px`;
    };
    set();
    window.addEventListener("resize", set);
    return () => window.removeEventListener("resize", set);
  }, []);

  // auto-scroll the track under the fixed center playhead while playing
  useEffect(() => {
    const el = scrollRef.current;
    if (!el || userScrollRef.current) return;
    const frac = playFraction ?? 0;
    const before = lens.slice(0, activeIndex).length * CELL;
    const target = before + frac * CELL;
    if (Math.abs(el.scrollLeft - target) > 1) el.scrollLeft = target;
  }, [activeIndex, playFraction, lens]);

  const handleScroll = useCallback(() => {
    const el = scrollRef.current;
    if (!el || !userScrollRef.current || !onScrub) return;
    const x = Math.max(0, el.scrollLeft);
    const idx = Math.min(clips.length - 1, Math.floor(x / CELL));
    const frac = Math.min(1, Math.max(0, (x - idx * CELL) / CELL));
    onScrub(idx, frac);
  }, [clips.length, onScrub]);

  const markUser = useCallback(() => {
    userScrollRef.current = true;
    if (userTimer.current) clearTimeout(userTimer.current);
    userTimer.current = setTimeout(() => {
      userScrollRef.current = false;
    }, 260);
  }, []);

  return (
    <div className="w-full select-none">
      {/* unified time readout */}
      <div className="flex items-center justify-between px-4 pb-1">
        <button
          onClick={onToggleMute}
          className="text-muted-foreground p-1 rounded-lg active:scale-95 transition"
          aria-label={isMuted ? "Unmute" : "Mute"}
        >
          {isMuted ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
        </button>
        <span className="text-[11px] font-black tabular-nums text-foreground">
          {fmt(currentTime)} <span className="text-muted-foreground">/ {fmt(totalDuration)}</span>
        </span>
        <button
          onClick={onAdd}
          className="text-muted-foreground p-1 rounded-lg active:scale-95 transition"
          aria-label="Add clip"
        >
          <Plus className="w-4 h-4" />
        </button>
      </div>

      <div className="relative">
        {/* fixed center playhead */}
        <div className="absolute left-1/2 top-0 bottom-0 w-[2px] bg-orange-500 z-20 pointer-events-none" />

        <div
          ref={scrollRef}
          onScroll={handleScroll}
          onPointerDown={markUser}
          onTouchStart={markUser}
          onWheel={markUser}
          className="overflow-x-auto overflow-y-hidden scrollbar-none"
          style={{ WebkitOverflowScrolling: "touch", touchAction: "pan-x" }}
        >
          {/* video track — continuous, zero gaps, white dividers */}
          <div className="flex items-center h-16">
            {clips.map((clip, i) => {
              const selected = i === activeIndex;
              return (
                <div
                  key={clip.id || i}
                  onPointerUp={() => onSelect?.(i)}
                  style={{ width: CELL }}
                  className={`relative h-16 flex-shrink-0 bg-muted overflow-hidden cursor-pointer transition-opacity ${
                    selected ? "opacity-100 ring-2 ring-inset ring-orange-500 z-10" : "opacity-50"
                  }`}
                >
                  {thumbs[clip.id] && (
                    <img
                      src={thumbs[clip.id]}
                      alt=""
                      draggable={false}
                      className="absolute inset-0 w-full h-full object-cover pointer-events-none"
                    />
                  )}
                  <div className="absolute inset-x-0 bottom-0 flex items-center justify-center bg-background/60 backdrop-blur-[1px]">
                    <span className="text-[9px] font-black text-foreground/80">
                      #{i + 1} · {clipLen(clip).toFixed(1)}s
                    </span>
                  </div>
                  {i > 0 && <div className="absolute left-0 top-0 bottom-0 w-[2px] bg-background" />}
                </div>
              );
            })}
          </div>

          {/* audio track */}
          <div className="flex items-center h-8 mt-1">
            <button
              onClick={onAddAudio}
              style={{ minWidth: clips.length * CELL || CELL }}
              className={`h-8 flex items-center gap-2 px-3 rounded-md text-[10px] font-bold ${
                audioLabel
                  ? "bg-emerald-500/20 text-emerald-700 border border-emerald-500/40"
                  : "bg-muted text-muted-foreground border border-dashed border-border"
              }`}
            >
              <Music2 className="w-3 h-3" />
              {audioLabel || "Add audio track"}
            </button>
          </div>
        </div>
      </div>

      {isPlaying ? null : null}
    </div>
  );
}

export default LightTimeline;
