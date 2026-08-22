import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Plus, Volume2, VolumeX } from "lucide-react";
import { AudioTrackLane, type AudioTrackState } from "./AudioTrackLane";

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
  onReorder?: (from: number, to: number) => void;
  audioTrack?: AudioTrackState | null;
  onAudioChange?: (next: AudioTrackState) => void;
  onAudioRemove?: () => void;
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
  onTrim,
  onScrub,
  onReorder,
  audioTrack,
  onAudioChange,
  onAudioRemove,
}: LightTimelineProps) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const userScrollRef = useRef(false);
  const userTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const padRef = useRef(0);
  const [dragIndex, setDragIndex] = useState<number | null>(null);
  const [dragOffset, setDragOffset] = useState(0);
  const dragRef = useRef<{ index: number; startX: number; moved: boolean } | null>(null);
  const pressTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

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

  // auto-scroll the track under the fixed center playhead while playing.
  // The write is deferred to the next animation frame so the scroll never
  // fights the browser's own compositing pass (that's what caused the jitter).
  const autoRaf = useRef<number | null>(null);
  useEffect(() => {
    const el = scrollRef.current;
    if (!el || userScrollRef.current) return;
    const frac = playFraction ?? 0;
    const target = activeIndex * CELL + frac * CELL;
    if (autoRaf.current) cancelAnimationFrame(autoRaf.current);
    autoRaf.current = requestAnimationFrame(() => {
      autoRaf.current = null;
      if (userScrollRef.current) return;
      if (Math.abs(el.scrollLeft - target) > 0.5) el.scrollLeft = target;
    });
    return () => {
      if (autoRaf.current) cancelAnimationFrame(autoRaf.current);
      autoRaf.current = null;
    };
  }, [activeIndex, playFraction, lens]);

  // scrub updates are throttled to one per frame — dragging stays at 60fps
  const scrubRaf = useRef<number | null>(null);
  const handleScroll = useCallback(() => {
    const el = scrollRef.current;
    if (!el || !userScrollRef.current || !onScrub) return;
    if (scrubRaf.current) return;
    scrubRaf.current = requestAnimationFrame(() => {
      scrubRaf.current = null;
      const x = Math.max(0, el.scrollLeft);
      const idx = Math.min(clips.length - 1, Math.floor(x / CELL));
      const frac = Math.min(1, Math.max(0, (x - idx * CELL) / CELL));
      onScrub(idx, frac);
    });
  }, [clips.length, onScrub]);

  const markUser = useCallback(() => {
    userScrollRef.current = true;
    if (userTimer.current) clearTimeout(userTimer.current);
    userTimer.current = setTimeout(() => {
      userScrollRef.current = false;
    }, 260);
  }, []);


  // ---- long-press drag to reorder ----
  const beginPress = (index: number) => (e: React.PointerEvent) => {
    if (!onReorder) return;
    const startX = e.clientX;
    if (pressTimer.current) clearTimeout(pressTimer.current);
    pressTimer.current = setTimeout(() => {
      dragRef.current = { index, startX, moved: false };
      setDragIndex(index);
      setDragOffset(0);
      if (navigator.vibrate) try { navigator.vibrate(12); } catch { /* ignore */ }
    }, 320);

    const move = (ev: PointerEvent) => {
      const d = dragRef.current;
      if (!d) {
        if (Math.abs(ev.clientX - startX) > 6 && pressTimer.current) {
          clearTimeout(pressTimer.current);
          pressTimer.current = null;
        }
        return;
      }
      d.moved = true;
      setDragOffset(ev.clientX - d.startX);
    };
    const up = () => {
      window.removeEventListener("pointermove", move);
      window.removeEventListener("pointerup", up);
      if (pressTimer.current) {
        clearTimeout(pressTimer.current);
        pressTimer.current = null;
      }
      const d = dragRef.current;
      dragRef.current = null;
      if (d) {
        const shift = Math.round(dragOffsetRef.current / CELL);
        const to = Math.min(clips.length - 1, Math.max(0, d.index + shift));
        if (to !== d.index) onReorder?.(d.index, to);
      }
      setDragIndex(null);
      setDragOffset(0);
    };
    window.addEventListener("pointermove", move);
    window.addEventListener("pointerup", up);
  };

  const dragOffsetRef = useRef(0);
  dragOffsetRef.current = dragOffset;

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
              const dur = clip.duration || 0;
              const tStart = clip.trimStart ?? 0;
              const tEnd = clip.trimEnd ?? dur;
              const startPct = dur ? (tStart / dur) * 100 : 0;
              const endPct = dur ? (tEnd / dur) * 100 : 100;
              const trimDrag = (side: "start" | "end") => (e: React.PointerEvent) => {
                if (!onTrim || !dur) return;
                e.preventDefault();
                e.stopPropagation();
                const cellEl = (e.currentTarget as HTMLElement).parentElement;
                if (!cellEl) return;
                const rect = cellEl.getBoundingClientRect();
                const move = (ev: PointerEvent) => {
                  const pct = Math.min(1, Math.max(0, (ev.clientX - rect.left) / rect.width));
                  const t = pct * dur;
                  if (side === "start") onTrim(i, Math.min(t, tEnd - 0.2), tEnd);
                  else onTrim(i, tStart, Math.max(t, tStart + 0.2));
                };
                const up = () => {
                  window.removeEventListener("pointermove", move);
                  window.removeEventListener("pointerup", up);
                };
                window.addEventListener("pointermove", move);
                window.addEventListener("pointerup", up);
              };
              return (
                <div
                  key={clip.id || i}
                  onPointerDown={beginPress(i)}
                  onPointerUp={() => {
                    if (dragIndex === null) onSelect?.(i);
                  }}
                  style={{
                    width: CELL,
                    transform: dragIndex === i ? `translateX(${dragOffset}px) scale(1.06)` : undefined,
                    zIndex: dragIndex === i ? 30 : undefined,
                    touchAction: dragIndex === i ? "none" : undefined,
                  }}
                  className={`relative h-16 flex-shrink-0 bg-muted overflow-hidden cursor-pointer transition-opacity ${
                    dragIndex === i ? "shadow-xl ring-2 ring-inset ring-orange-500 opacity-100" : ""
                  } ${
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

                  {/* trimmed-out shading */}
                  <div className="absolute inset-y-0 left-0 bg-background/70 pointer-events-none" style={{ width: `${startPct}%` }} />
                  <div className="absolute inset-y-0 right-0 bg-background/70 pointer-events-none" style={{ width: `${100 - endPct}%` }} />

                  {selected && dur > 0 && (
                    <>
                      <div
                        onPointerDown={trimDrag("start")}
                        className="absolute inset-y-0 w-3 bg-orange-500 cursor-ew-resize touch-none flex items-center justify-center z-20"
                        style={{ left: `${startPct}%` }}
                      >
                        <span className="h-5 w-[2px] bg-white/90 rounded" />
                      </div>
                      <div
                        onPointerDown={trimDrag("end")}
                        className="absolute inset-y-0 w-3 -translate-x-full bg-orange-500 cursor-ew-resize touch-none flex items-center justify-center z-20"
                        style={{ left: `${endPct}%` }}
                      >
                        <span className="h-5 w-[2px] bg-white/90 rounded" />
                      </div>
                    </>
                  )}
                </div>
              );
            })}
          </div>

          {/* dedicated audio track with waveform trim */}
          <AudioTrackLane
            track={audioTrack ?? null}
            totalDuration={totalDuration}
            width={Math.max(CELL, clips.length * CELL)}
            onChange={(next) => onAudioChange?.(next)}
            onPick={() => onAddAudio?.()}
            onRemove={() => onAudioRemove?.()}
          />
        </div>
      </div>

      {isPlaying ? null : null}
    </div>
  );
}

export default LightTimeline;
