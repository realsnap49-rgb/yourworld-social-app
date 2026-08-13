import React, { useEffect, useRef, useState } from "react";
import { Plus, Volume2, VolumeX, Music } from "lucide-react";

const CELL_WIDTH = 96;
const CELL_GAP = 6;

interface LightTimelineProps {
  clips: any[];
  activeIndex: number;
  currentTime?: number;
  totalDuration?: number;
  audioLabel?: string;
  isMuted?: boolean;
  onToggleMute?: () => void;
  onAddAudio?: () => void;
  onSelect: (index: number) => void;
  onTrim?: (index: number, start: number, end: number) => void;
  onAdd?: () => void;
  onScrub?: (index: number, fraction: number) => void;
}

const fmt = (s: number) => {
  const t = Math.max(0, Math.round(s || 0));
  return `${String(Math.floor(t / 60)).padStart(2, "0")}:${String(t % 60).padStart(2, "0")}`;
};

export const LightTimeline: React.FC<LightTimelineProps> = ({
  clips,
  activeIndex,
  currentTime = 0,
  totalDuration = 0,
  audioLabel,
  isMuted,
  onToggleMute,
  onAddAudio,
  onSelect,
  onAdd,
  onScrub,
}) => {
  const trackRef = useRef<HTMLDivElement>(null);
  const [pad, setPad] = useState(0);
  const rafRef = useRef<number | null>(null);
  const movedRef = useRef(false);

  useEffect(() => {
    const el = trackRef.current;
    if (!el) return;
    const update = () => setPad(el.clientWidth / 2);
    update();
    const ro = new ResizeObserver(update);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const emitScrub = () => {
    const el = trackRef.current;
    if (!el || !onScrub || clips.length === 0) return;
    const x = el.scrollLeft;
    const step = CELL_WIDTH + CELL_GAP;
    let idx = Math.floor(x / step);
    idx = Math.min(clips.length - 1, Math.max(0, idx));
    const frac = Math.min(1, Math.max(0, (x - idx * step) / CELL_WIDTH));
    onScrub(idx, frac);
  };

  const onTrackScroll = () => {
    if (rafRef.current) return;
    rafRef.current = requestAnimationFrame(() => {
      rafRef.current = null;
      emitScrub();
    });
  };

  const dragTrack = (e: React.PointerEvent) => {
    const el = trackRef.current;
    if (!el) return;
    const startX = e.clientX;
    const startScroll = el.scrollLeft;
    movedRef.current = false;
    const move = (ev: PointerEvent) => {
      const dx = ev.clientX - startX;
      if (Math.abs(dx) > 3) movedRef.current = true;
      el.scrollLeft = startScroll - dx;
    };
    const up = () => {
      window.removeEventListener("pointermove", move);
      window.removeEventListener("pointerup", up);
    };
    window.addEventListener("pointermove", move, { passive: true });
    window.addEventListener("pointerup", up);
  };

  return (
    <div className="w-full bg-card border-t border-border px-3 py-2 flex flex-col gap-2 relative">
      {/* ruler */}
      <div className="flex items-center justify-between text-[10px] font-mono text-muted-foreground px-1">
        <span>{fmt(currentTime)}</span>
        <span>{fmt(totalDuration)}</span>
      </div>

      {/* playhead */}
      <div className="absolute top-6 bottom-2 left-1/2 w-0.5 bg-orange-500 z-20 pointer-events-none" />

      <div className="flex items-center gap-2">
        <button
          onClick={onToggleMute}
          className={`w-8 h-8 flex-shrink-0 rounded-lg flex items-center justify-center ${
            isMuted ? "bg-red-500/15 text-red-500" : "bg-muted text-foreground"
          }`}
          aria-label={isMuted ? "Unmute" : "Mute"}
        >
          {isMuted ? <VolumeX size={14} /> : <Volume2 size={14} />}
        </button>

        <div
          ref={trackRef}
          onScroll={onTrackScroll}
          onPointerDown={dragTrack}
          className="flex-1 flex items-center gap-1.5 overflow-x-auto scrollbar-none py-0.5 cursor-ew-resize touch-pan-x overscroll-x-contain"
          style={{ paddingLeft: pad, paddingRight: pad }}
        >
          {clips.map((clip, idx) => (
            <React.Fragment key={clip.id || idx}>
              {idx > 0 && (
                <span className="flex-shrink-0 w-2 h-2 rotate-45 bg-orange-400/70 rounded-[2px]" />
              )}
              <div
                onClick={() => {
                  if (!movedRef.current) onSelect(idx);
                }}
                style={{ width: CELL_WIDTH }}
                className={`relative h-14 rounded-lg border-2 cursor-pointer overflow-hidden flex-shrink-0 bg-muted ${
                  idx === activeIndex ? "border-orange-500" : "border-border opacity-70"
                }`}
              >
                <video
                  src={clip.url}
                  muted
                  preload="metadata"
                  className="w-full h-full object-cover pointer-events-none"
                />
                <span className="absolute bottom-0.5 left-1 bg-black/60 text-[9px] text-white px-1 rounded">
                  #{idx + 1}
                </span>
              </div>
            </React.Fragment>
          ))}
          {onAdd && (
            <button
              onClick={onAdd}
              className="w-8 h-8 flex-shrink-0 rounded-full bg-foreground text-background flex items-center justify-center active:scale-90 transition"
              aria-label="Add clip"
            >
              <Plus size={16} />
            </button>
          )}
        </div>
      </div>

      {/* audio row */}
      <button
        onClick={onAddAudio}
        className="h-7 w-full rounded-lg border border-emerald-500/40 bg-emerald-500/10 text-[10px] font-bold text-emerald-600 flex items-center gap-2 px-3 overflow-hidden"
      >
        {audioLabel ? (
          <><Music size={12} className="flex-shrink-0" /><span className="truncate">{audioLabel}</span></>
        ) : (
          <><Plus size={12} /> Add audio track</>
        )}
      </button>
    </div>
  );
};
