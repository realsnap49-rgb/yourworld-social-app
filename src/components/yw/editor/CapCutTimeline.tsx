import React, { useEffect, useMemo, useRef, useState } from "react";
import { Plus, Volume2, VolumeX, Music, Type } from "lucide-react";

export type TimelineClip = {
  id: string;
  url: string;
  speed: number;
  textOverlay: string;
  volume: number;
  trimStart?: number;
  trimEnd?: number;
  duration?: number;
};

const THUMB_COUNT = 6;
const CELL_WIDTH = 112;
const CELL_GAP = 6;

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

function ClipCell({
  clip,
  index,
  active,
  onSelect,
  onTrim,
}: {
  clip: TimelineClip;
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
      className={`relative h-14 w-[112px] flex-shrink-0 rounded-lg overflow-hidden border-2 transition ${
        active ? "border-orange-500" : "border-zinc-800"
      }`}
    >
      <div className="absolute inset-0 flex">
        {(thumbs.length ? thumbs : Array.from({ length: THUMB_COUNT })).map((t, i) =>
          typeof t === "string" ? (
            <img key={i} src={t} alt="" className="h-full w-full object-cover" draggable={false} />
          ) : (
            <div key={i} className="h-full w-full bg-zinc-800" />
          ),
        )}
      </div>

      {/* trimmed-out shading */}
      <div className="absolute inset-y-0 left-0 bg-black/70" style={{ width: `${startPct}%` }} />
      <div className="absolute inset-y-0 right-0 bg-black/70" style={{ width: `${100 - endPct}%` }} />

      {/* trim handles */}
      <div
        onPointerDown={drag("start")}
        className="absolute inset-y-0 w-3 bg-orange-500/90 cursor-ew-resize flex items-center justify-center touch-none"
        style={{ left: `${startPct}%` }}
      >
        <span className="h-5 w-0.5 bg-black/70 rounded" />
      </div>
      <div
        onPointerDown={drag("end")}
        className="absolute inset-y-0 w-3 -translate-x-full bg-orange-500/90 cursor-ew-resize flex items-center justify-center touch-none"
        style={{ left: `${endPct}%` }}
      >
        <span className="h-5 w-0.5 bg-black/70 rounded" />
      </div>

      <span className="absolute bottom-0.5 left-1.5 text-[9px] font-black text-white drop-shadow">
        #{index + 1}
      </span>
      {dur > 0 && (
        <span className="absolute bottom-0.5 right-1.5 text-[9px] font-mono text-white/80 drop-shadow">
          {(end - start).toFixed(1)}s
        </span>
      )}
    </div>
  );
}

export function CapCutTimeline({
  clips,
  activeIndex,
  onSelect,
  onTrim,
  onAdd,
  isMuted,
  onToggleMute,
  onAddAudio,
  onAddText,
  audioLabel,
  audioTrack,
  totalDuration,
  onAudioMove,
}: {
  clips: TimelineClip[];
  activeIndex: number;
  onSelect: (i: number) => void;
  onTrim: (i: number, start: number, end: number) => void;
  onAdd: () => void;
  isMuted: boolean;
  onToggleMute: () => void;
  onAddAudio: () => void;
  onAddText: () => void;
  audioLabel?: string;
  audioTrack?: { title: string; start: number; duration: number } | null;
  totalDuration?: number;
  onAudioMove?: (start: number) => void;
}) {
  const textClips = useMemo(
    () => clips.map((c, i) => ({ i, text: c.textOverlay })).filter((c) => c.text),
    [clips],
  );

  const audioRowRef = useRef<HTMLDivElement>(null);
  const total = Math.max(totalDuration || 0, 0.1);

  const dragAudio = (e: React.PointerEvent) => {
    if (!audioTrack || !onAudioMove) return;
    e.preventDefault();
    const el = audioRowRef.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    const startX = e.clientX;
    const startVal = audioTrack.start;
    const move = (ev: PointerEvent) => {
      const deltaSec = ((ev.clientX - startX) / rect.width) * total;
      const next = Math.min(Math.max(0, startVal + deltaSec), Math.max(0, total - 0.2));
      onAudioMove(next);
    };
    const up = () => {
      window.removeEventListener("pointermove", move);
      window.removeEventListener("pointerup", up);
    };
    window.addEventListener("pointermove", move);
    window.addEventListener("pointerup", up);
  };

  return (
    <div className="bg-zinc-900 border-t border-zinc-800 px-3 py-2 flex flex-col gap-2 relative">
      <div className="absolute top-0 bottom-0 left-1/2 w-0.5 bg-white/80 z-20 pointer-events-none" />

      {/* VIDEO TRACK */}
      <div className="flex items-center gap-2">
        <button
          onClick={onToggleMute}
          className={`w-9 h-9 flex-shrink-0 rounded-xl flex items-center justify-center ${
            isMuted ? "bg-red-500/20 text-red-400" : "bg-zinc-800 text-zinc-300"
          }`}
          aria-label={isMuted ? "Unmute" : "Mute"}
        >
          {isMuted ? <VolumeX size={15} /> : <Volume2 size={15} />}
        </button>
        <div className="flex-1 flex items-center gap-1.5 overflow-x-auto scrollbar-none py-0.5">
          {clips.map((c, i) => (
            <ClipCell
              key={c.id}
              clip={c}
              index={i}
              active={i === activeIndex}
              onSelect={() => onSelect(i)}
              onTrim={(s, e) => onTrim(i, s, e)}
            />
          ))}
          {clips.length < 10 && (
            <button
              onClick={onAdd}
              className="w-9 h-9 flex-shrink-0 rounded-full bg-white text-black flex items-center justify-center active:scale-90 transition"
              aria-label="Add clip"
            >
              <Plus size={18} />
            </button>
          )}
        </div>
      </div>

      {/* AUDIO TRACK */}
      <div className="flex items-center gap-2">
        <div className="w-9 h-7 flex-shrink-0 rounded-lg bg-zinc-800 text-emerald-400 flex items-center justify-center">
          <Music size={14} />
        </div>
        {audioTrack ? (
          <div ref={audioRowRef} className="flex-1 h-7 relative rounded-lg bg-zinc-800/60 overflow-hidden">
            <div
              onPointerDown={dragAudio}
              onClick={onAddAudio}
              className="absolute inset-y-0 rounded-lg bg-emerald-500 text-black text-[10px] font-black flex items-center gap-1 px-2 cursor-ew-resize touch-none overflow-hidden"
              style={{
                left: `${Math.min(100, (audioTrack.start / total) * 100)}%`,
                width: `${Math.max(8, Math.min(100, (audioTrack.duration / total) * 100))}%`,
              }}
            >
              <Music size={11} className="flex-shrink-0" />
              <span className="truncate">{audioTrack.title}</span>
            </div>
          </div>
        ) : (
          <button
            onClick={onAddAudio}
            className="flex-1 h-7 rounded-lg border border-emerald-500/40 bg-emerald-500/10 text-[10px] font-bold text-emerald-300 flex items-center gap-2 px-3 overflow-hidden"
          >
            {audioLabel ? (
              <span className="truncate">{audioLabel}</span>
            ) : (
              <>
                <Plus size={12} /> Add audio track
              </>
            )}
          </button>
        )}
      </div>

      {/* TEXT TRACK */}
      <div className="flex items-center gap-2">
        <div className="w-9 h-7 flex-shrink-0 rounded-lg bg-zinc-800 text-sky-400 flex items-center justify-center">
          <Type size={14} />
        </div>
        <div className="flex-1 h-7 flex items-center gap-1.5 overflow-x-auto scrollbar-none">
          {textClips.length === 0 ? (
            <button
              onClick={onAddText}
              className="w-full h-7 rounded-lg border border-sky-500/40 bg-sky-500/10 text-[10px] font-bold text-sky-300 flex items-center justify-center gap-2"
            >
              <Plus size={12} /> Add text overlay
            </button>
          ) : (
            <>
              {textClips.map((t) => (
                <button
                  key={t.i}
                  onClick={() => onSelect(t.i)}
                  className={`h-7 px-3 flex-shrink-0 rounded-lg text-[10px] font-bold truncate max-w-[140px] border ${
                    t.i === activeIndex
                      ? "bg-sky-500 text-black border-sky-400"
                      : "bg-sky-500/10 text-sky-300 border-sky-500/40"
                  }`}
                >
                  {t.text}
                </button>
              ))}
              <button
                onClick={onAddText}
                className="h-7 w-7 flex-shrink-0 rounded-lg bg-zinc-800 text-sky-300 flex items-center justify-center"
                aria-label="Add text"
              >
                <Plus size={12} />
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
