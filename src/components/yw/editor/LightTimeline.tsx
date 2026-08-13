import React, { useEffect, useRef, useState } from "react";
import { Plus, Music, Volume2, VolumeX } from "lucide-react";

export type LightClip = {
  id: string;
  url: string;
  trimStart?: number;
  trimEnd?: number;
  duration?: number;
};

const THUMB_COUNT = 6;
const CELL_WIDTH = 112;
const CELL_GAP = 10;

function useThumbnails(url: string) {
  const [thumbs, setThumbs] = useState<string[]>([]);
  const [duration, setDuration] = useState(0);

  useEffect(() => {
    let cancelled = false;
    const video = document.createElement("video");
    video.src = url;
    video.muted = true;
    video.crossOrigin = "anonymous";
    video.preload = "metadata";

    const capture = async () => {
      const dur = isFinite(video.duration) && video.duration > 0 ? video.duration : 0;
      if (!cancelled) setDuration(dur);
      if (!dur) return;
      const canvas = document.createElement("canvas");
      canvas.width = 96;
      canvas.height = 96;
      const ctx = canvas.getContext("2d");
      if (!ctx) return;
      const out: string[] = [];
      for (let i = 0; i < THUMB_COUNT; i++) {
        if (cancelled) return;
        const t = (dur / THUMB_COUNT) * i + dur / (THUMB_COUNT * 2);
        try {
          await new Promise<void>((resolve) => {
            const onSeeked = () => {
              video.removeEventListener("seeked", onSeeked);
              resolve();
            };
            video.addEventListener("seeked", onSeeked);
            video.currentTime = Math.min(t, Math.max(0, dur - 0.05));
            setTimeout(resolve, 1200);
          });
          ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
          out.push(canvas.toDataURL("image/jpeg", 0.5));
        } catch {
          break;
        }
      }
      if (!cancelled && out.length) setThumbs(out);
    };

    const onLoaded = () => void capture();
    video.addEventListener("loadeddata", onLoaded);
    return () => {
      cancelled = true;
      video.removeEventListener("loadeddata", onLoaded);
      video.removeAttribute("src");
      video.load();
    };
  }, [url]);

  return { thumbs, duration };
}

const ClipCell = React.memo(
  function ClipCell({
    clip,
    index,
    active,
    onSelect,
    onTrim,
  }: {
    clip: LightClip;
    index: number;
    active: boolean;
    onSelect: () => void;
    onTrim: (start: number, end: number) => void;
  }) {
    const { thumbs, duration } = useThumbnails(clip.url);
    const ref = useRef<HTMLDivElement>(null);
    const dur = clip.duration || duration || 0;
    const start = clip.trimStart ?? 0;
    const end = clip.trimEnd ?? dur;
    const startPct = dur ? (start / dur) * 100 : 0;
    const endPct = dur ? (end / dur) * 100 : 100;

    const drag = (side: "start" | "end") => (e: React.PointerEvent) => {
      e.stopPropagation();
      e.preventDefault();
      const el = ref.current;
      if (!el || !dur) return;
      const rect = el.getBoundingClientRect();
      const move = (ev: PointerEvent) => {
        const pct = Math.min(1, Math.max(0, (ev.clientX - rect.left) / rect.width));
        const t = pct * dur;
        if (side === "start") onTrim(Math.min(t, end - 0.2), end);
        else onTrim(start, Math.max(t, start + 0.2));
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
        ref={ref}
        onClick={onSelect}
        className={`relative h-14 w-[112px] flex-shrink-0 rounded-lg overflow-hidden border-2 bg-muted transition ${
          active ? "border-orange-500" : "border-border"
        }`}
      >
        <div className="absolute inset-0 flex">
          {(thumbs.length ? thumbs : Array.from({ length: THUMB_COUNT })).map((t, i) =>
            typeof t === "string" ? (
              <img key={i} src={t} alt="" className="h-full w-full object-cover" draggable={false} />
            ) : (
              <div key={i} className="h-full w-full bg-muted" />
            ),
          )}
        </div>

        <div className="absolute inset-y-0 left-0 bg-background/70" style={{ width: `${startPct}%` }} />
        <div className="absolute inset-y-0 right-0 bg-background/70" style={{ width: `${100 - endPct}%` }} />

        <div
          onPointerDown={drag("start")}
          className="absolute inset-y-0 w-3 bg-orange-500 cursor-ew-resize flex items-center justify-center touch-none"
          style={{ left: `${startPct}%` }}
        >
          <span className="h-5 w-0.5 bg-white/90 rounded" />
        </div>
        <div
          onPointerDown={drag("end")}
          className="absolute inset-y-0 w-3 -translate-x-full bg-orange-500 cursor-ew-resize flex items-center justify-center touch-none"
          style={{ left: `${endPct}%` }}
        >
          <span className="h-5 w-0.5 bg-white/90 rounded" />
        </div>

        <span className="absolute bottom-0.5 left-1.5 text-[9px] font-black text-white drop-shadow">
          #{index + 1}
        </span>
        {dur > 0 && (
          <span className="absolute bottom-0.5 right-1.5 text-[9px] font-mono text-white/90 drop-shadow">
            {(end - start).toFixed(1)}s
          </span>
        )}
      </div>
    );
  },
  (a, b) => a.clip === b.clip && a.index === b.index && a.active === b.active,
);

function fmt(s: number) {
  const m = Math.floor(s / 60);
  const sec = Math.floor(s % 60);
  return `${m}:${String(sec).padStart(2, "0")}`;
}

function LightTimelineBase({
  clips,
  activeIndex,
  onSelect,
  onTrim,
  onAdd,
  onScrub,
  isMuted,
  onToggleMute,
  audioLabel,
  onAddAudio,
  currentTime = 0,
  totalDuration = 0,
}: {
  clips: LightClip[];
  activeIndex: number;
  onSelect: (i: number) => void;
  onTrim: (i: number, start: number, end: number) => void;
  onAdd: () => void;
  onScrub?: (index: number, fraction: number) => void;
  isMuted: boolean;
  onToggleMute: () => void;
  audioLabel?: string;
  onAddAudio: () => void;
  currentTime?: number;
  totalDuration?: number;
}) {
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
    window.addEventListener("pointermove", move);
    window.addEventListener("pointerup", up);
  };

  return (
    <div className="bg-card border-t border-border px-3 py-2 flex flex-col gap-2 relative">
      {/* Header: total duration + audio + mute */}
      <div className="flex items-center justify-between text-[10px] font-bold uppercase tracking-wide text-muted-foreground">
        <span className="font-mono text-foreground">
          {fmt(currentTime)} <span className="text-muted-foreground">/ {fmt(totalDuration)}</span>
        </span>
        <div className="flex items-center gap-2">
          <button
            onClick={onAddAudio}
            className="flex items-center gap-1 px-2 py-1 rounded-full bg-muted text-foreground"
          >
            <Music size={12} />
            <span className="max-w-[110px] truncate normal-case">{audioLabel || "Add audio"}</span>
          </button>
          <button
            onClick={onToggleMute}
            className={`w-7 h-7 rounded-full flex items-center justify-center ${
              isMuted ? "bg-destructive/10 text-destructive" : "bg-muted text-foreground"
            }`}
            aria-label={isMuted ? "Unmute" : "Mute"}
          >
            {isMuted ? <VolumeX size={13} /> : <Volume2 size={13} />}
          </button>
        </div>
      </div>

      {/* Single scrollable clip strip with centered orange playhead */}
      <div className="relative">
        <div className="absolute top-0 bottom-0 left-1/2 w-[2px] bg-orange-500 z-20 pointer-events-none rounded-full">
          <span className="absolute -top-1 left-1/2 -translate-x-1/2 w-2.5 h-2.5 rounded-full bg-orange-500" />
        </div>
        <div
          ref={trackRef}
          onScroll={onTrackScroll}
          onPointerDown={dragTrack}
          className="flex items-center overflow-x-auto scrollbar-none py-1 cursor-ew-resize touch-pan-x overscroll-x-contain"
          style={{ paddingLeft: pad, paddingRight: pad, gap: 0 }}
        >
          {clips.map((c, i) => (
            <React.Fragment key={c.id}>
              {i > 0 && (
                /* transition marker between clips */
                <div
                  className="flex-shrink-0 flex items-center justify-center"
                  style={{ width: CELL_GAP }}
                  aria-label="Transition"
                >
                  <span className="w-[10px] h-[10px] rotate-45 bg-orange-100 border border-orange-400 rounded-[2px]" />
                </div>
              )}
              <ClipCell
                clip={c}
                index={i}
                active={i === activeIndex}
                onSelect={() => {
                  if (!movedRef.current) onSelect(i);
                }}
                onTrim={(s, e) => onTrim(i, s, e)}
              />
            </React.Fragment>
          ))}
          {clips.length < 10 && (
            <button
              onClick={onAdd}
              className="ml-2 w-9 h-9 flex-shrink-0 rounded-full bg-foreground text-background flex items-center justify-center active:scale-90 transition"
              aria-label="Add clip"
            >
              <Plus size={18} />
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

export const LightTimeline = React.memo(LightTimelineBase);
