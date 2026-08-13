import React, { useEffect, useRef, useState } from "react";

export type LightClip = {
  id: string;
  url: string;
  duration?: number;
};

type LightTimelineProps = {
  clips: LightClip[];
  activeIndex?: number;
  currentTime?: number;
  totalDuration?: number;
  audioLabel?: string;
  isMuted?: boolean;
  onToggleMute?: () => void;
  onAddAudio?: () => void;
  onSelect?: (i: number) => void;
  onTrim?: (i: number, start: number, end: number) => void;
  onAdd?: () => void;
  onScrub?: (i: number, frac: number) => void;
};

const CLIP_W = 112; // px per clip cell (fixed for stable time->pixel mapping)

const fmt = (s: number) => {
  if (!isFinite(s) || s < 0) s = 0;
  const m = Math.floor(s / 60);
  const sec = Math.floor(s % 60);
  return `${m}:${sec.toString().padStart(2, "0")}`;
};

export const LightTimeline: React.FC<LightTimelineProps> = ({
  clips = [],
  activeIndex = 0,
  currentTime = 0,
  totalDuration = 0,
  audioLabel,
  isMuted = false,
  onToggleMute,
  onAddAudio,
  onSelect,
  onAdd,
  onScrub,
}) => {
  const scrollRef = useRef<HTMLDivElement>(null);
  const [scrubbing, setScrubbing] = useState(false);

  // Keep the playhead centered during playback by scrolling the track.
  useEffect(() => {
    if (scrubbing) return;
    const el = scrollRef.current;
    if (!el || clips.length === 0) return;
    // Determine global position (in clip-widths) of the playhead.
    let acc = 0;
    for (let i = 0; i < clips.length; i++) {
      const d = clips[i].duration || 0;
      if (i >= activeIndex) {
        const local = currentTime - acc;
        const frac = d > 0 ? Math.min(1, Math.max(0, local / d)) : 0;
        const target = (i + frac) * CLIP_W + CLIP_W / 2;
        el.scrollTo({ left: target - el.clientWidth / 2, behavior: "auto" });
        return;
      }
      acc += d;
    }
  }, [currentTime, activeIndex, clips, scrubbing]);

  const indexFromScroll = (scrollLeft: number, width: number) => {
    const center = scrollLeft + width / 2;
    const idx = Math.floor(center / CLIP_W);
    const frac = (center % CLIP_W) / CLIP_W;
    return { idx: Math.min(clips.length - 1, Math.max(0, idx)), frac };
  };

  const handleScrub = (e: React.PointerEvent) => {
    const el = scrollRef.current;
    if (!el || clips.length === 0) return;
    e.preventDefault();
    setScrubbing(true);
    el.setPointerCapture?.(e.pointerId);

    const apply = () => {
      const { idx, frac } = indexFromScroll(el.scrollLeft, el.clientWidth);
      onSelect?.(idx);
      onScrub?.(idx, frac);
    };
    apply();

    const move = () => apply();
    const end = () => {
      setScrubbing(false);
      window.removeEventListener("pointermove", move);
      window.removeEventListener("pointerup", end);
    };
    window.addEventListener("pointermove", move, { passive: true });
    window.addEventListener("pointerup", end);
  };

  return (
    <div className="flex flex-col bg-card text-foreground border-t border-border">
      {/* Ruler: total duration */}
      <div className="px-3 py-1 flex items-center justify-between border-b border-border/60">
        <span className="text-[10px] font-mono text-muted-foreground">0:00</span>
        <span className="text-[10px] font-bold uppercase tracking-wide text-muted-foreground">
          Timeline
        </span>
        <span className="text-[10px] font-mono text-muted-foreground">{fmt(totalDuration)}</span>
      </div>

      {/* Video track: scrollable, centered playhead */}
      <div
        ref={scrollRef}
        className="relative overflow-x-auto scrollbar-none touch-none"
        onPointerDown={handleScrub}
        style={{ height: 64 }}
      >
        <div
          className="flex items-stretch gap-0"
          style={{ paddingLeft: "50%", paddingRight: "50%", width: "max-content" }}
        >
          {clips.map((clip, i) => {
            const active = i === activeIndex;
            return (
              <div
                key={clip.id || i}
                className={`relative flex-shrink-0 flex items-end justify-start p-1.5 border-y-2 transition-colors ${
                  active
                    ? "border-orange-500 bg-orange-500/10"
                    : "border-transparent bg-muted"
                }`}
                style={{ width: CLIP_W, height: 60 }}
                onClick={(e) => {
                  e.stopPropagation();
                  onSelect?.(i);
                }}
              >
                <video
                  src={clip.url}
                  muted
                  playsInline
                  preload="metadata"
                  className="absolute inset-0 w-full h-full object-cover opacity-70"
                  style={{ pointerEvents: "none" }}
                />
                <span className="relative z-10 text-[10px] font-black text-white bg-black/70 px-1.5 rounded">
                  #{i + 1}
                </span>
                <span className="relative z-10 ml-auto text-[9px] font-mono text-white/90 bg-black/60 px-1 rounded">
                  {fmt(clip.duration || 0)}
                </span>
                {i < clips.length - 1 && (
                  <div className="absolute -right-2 top-1/2 -translate-y-1/2 z-20 w-3 h-3 rotate-45 bg-orange-500 border border-white" />
                )}
              </div>
            );
          })}
          {clips.length === 0 && (
            <div className="flex items-center text-[10px] text-muted-foreground" style={{ height: 60 }}>
              No clips
            </div>
          )}
        </div>

        {/* Centered orange playhead */}
        <div className="absolute left-1/2 top-0 bottom-0 -translate-x-1/2 w-[2px] bg-orange-500 pointer-events-none">
          <div className="absolute -top-1 left-1/2 -translate-x-1/2 w-2.5 h-2.5 rotate-45 bg-orange-500" />
        </div>
      </div>

      {/* Audio track row */}
      <div className="px-3 py-2 flex items-center gap-2 border-t border-border/60">
        <button
          onClick={onToggleMute}
          className="w-7 h-7 rounded-full bg-muted flex items-center justify-center text-foreground active:scale-90 transition"
          aria-label={isMuted ? "Unmute" : "Mute"}
        >
          {isMuted ? "🔇" : "🔊"}
        </button>
        {audioLabel ? (
          <div className="flex-1 h-7 rounded-lg bg-emerald-500/15 border border-emerald-500/40 flex items-center px-2 gap-1.5 overflow-hidden">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
            <span className="text-[10px] font-bold text-emerald-700 truncate">{audioLabel}</span>
          </div>
        ) : (
          <button
            onClick={onAddAudio}
            className="flex-1 h-7 rounded-lg border border-dashed border-border flex items-center justify-center text-[10px] font-bold text-muted-foreground active:scale-95 transition"
          >
            + Add audio track
          </button>
        )}
        {onAdd && (
          <button
            onClick={onAdd}
            className="w-7 h-7 rounded-full bg-orange-500 text-white flex items-center justify-center text-lg leading-none active:scale-90 transition"
            aria-label="Add clip"
          >
            +
          </button>
        )}
      </div>
    </div>
  );
};

export default LightTimeline;
