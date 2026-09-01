import React, { useEffect, useRef, useState } from "react";
import { Music2, Plus, X } from "lucide-react";

export interface AudioTrackState {
  id: string;
  title: string;
  url: string;
  /** where the audio begins on the video timeline (seconds) */
  start: number;
  /** trim window inside the source file (seconds) */
  clipStart: number;
  clipEnd: number;
  /** full source length (seconds) */
  duration: number;
}

const peakCache = new Map<string, number[]>();

async function loadPeaks(url: string, buckets = 320): Promise<number[]> {
  const hit = peakCache.get(url);
  if (hit) return hit;
  const Ctx: typeof AudioContext =
    (window as any).AudioContext || (window as any).webkitAudioContext;
  if (!Ctx) return [];
  const ctx = new Ctx();
  try {
    const res = await fetch(url);
    const buf = await res.arrayBuffer();
    const audio = await ctx.decodeAudioData(buf.slice(0));
    const data = audio.getChannelData(0);
    const step = Math.max(1, Math.floor(data.length / buckets));
    const peaks: number[] = [];
    for (let i = 0; i < buckets; i++) {
      let max = 0;
      const base = i * step;
      for (let j = 0; j < step; j += 8) {
        const v = Math.abs(data[base + j] || 0);
        if (v > max) max = v;
      }
      peaks.push(max);
    }
    const norm = Math.max(0.02, Math.max(...peaks));
    const out = peaks.map((p) => p / norm);
    peakCache.set(url, out);
    return out;
  } catch {
    return [];
  } finally {
    void ctx.close().catch(() => {});
  }
}

function Waveform({
  url,
  from,
  to,
  duration,
}: {
  url: string;
  from: number;
  to: number;
  duration: number;
}) {
  const [peaks, setPeaks] = useState<number[]>([]);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    let alive = true;
    void loadPeaks(url).then((p) => {
      if (alive) setPeaks(p);
    });
    return () => {
      alive = false;
    };
  }, [url]);

  useEffect(() => {
    const c = canvasRef.current;
    if (!c) return;
    const w = c.clientWidth || 1;
    const h = c.clientHeight || 1;
    const dpr = window.devicePixelRatio || 1;
    c.width = Math.max(1, Math.floor(w * dpr));
    c.height = Math.max(1, Math.floor(h * dpr));
    const ctx = c.getContext("2d");
    if (!ctx) return;
    ctx.scale(dpr, dpr);
    ctx.clearRect(0, 0, w, h);
    if (!peaks.length || !duration) return;
    const a = Math.floor((from / duration) * peaks.length);
    const b = Math.max(a + 1, Math.floor((to / duration) * peaks.length));
    const slice = peaks.slice(a, b);
    const bars = Math.min(slice.length, Math.floor(w / 3));
    const bucket = Math.max(1, Math.floor(slice.length / Math.max(1, bars)));
    ctx.fillStyle = "rgba(20, 184, 166, 0.9)";
    for (let i = 0; i < bars; i++) {
      let max = 0;
      for (let j = 0; j < bucket; j++) {
        const v = slice[i * bucket + j] || 0;
        if (v > max) max = v;
      }
      const bh = Math.max(2, max * (h - 4));
      ctx.fillRect(i * 3, (h - bh) / 2, 2, bh);
    }
  }, [peaks, from, to, duration]);

  return <canvas ref={canvasRef} className="absolute inset-0 w-full h-full" />;
}

export function AudioTrackLane({
  track,
  totalDuration,
  onChange,
  onPick,
  onRemove,
  width,
}: {
  track: AudioTrackState | null;
  totalDuration: number;
  onChange: (next: AudioTrackState) => void;
  onPick: () => void;
  onRemove: () => void;
  width: number;
}) {
  const laneRef = useRef<HTMLDivElement>(null);
  const total = Math.max(0.5, totalDuration || 0.5);

  if (!track) {
    return (
      <div className="flex items-center h-10 mt-1" style={{ minWidth: width }}>
        <button
          onClick={onPick}
          style={{ width }}
          className="h-10 flex items-center gap-2 px-3 rounded-md text-[10px] font-bold bg-muted text-muted-foreground border border-dashed border-border"
        >
          <Plus className="w-3 h-3" /> Add audio track
        </button>
      </div>
    );
  }

  const visible = Math.max(0.1, track.clipEnd - track.clipStart);

  const drag =
    (mode: "move" | "left" | "right") => (e: React.PointerEvent) => {
      e.preventDefault();
      e.stopPropagation();
      const lane = laneRef.current;
      if (!lane) return;
      const rect = lane.getBoundingClientRect();
      const startX = e.clientX;
      const base = { ...track };
      const secPerPx = total / Math.max(1, rect.width);

      const move = (ev: PointerEvent) => {
        const d = (ev.clientX - startX) * secPerPx;
        if (mode === "move") {
          const next = Math.min(Math.max(0, base.start + d), Math.max(0, total - 0.1));
          onChange({ ...base, start: next });
        } else if (mode === "left") {
          const next = Math.min(
            Math.max(0, base.clipStart + d),
            base.clipEnd - 0.2,
          );
          onChange({ ...base, clipStart: next });
        } else {
          const next = Math.max(
            Math.min(base.duration, base.clipEnd + d),
            base.clipStart + 0.2,
          );
          onChange({ ...base, clipEnd: next });
        }
      };
      const up = () => {
        window.removeEventListener("pointermove", move);
        window.removeEventListener("pointerup", up);
      };
      window.addEventListener("pointermove", move);
      window.addEventListener("pointerup", up);
    };

  const leftPct = Math.min(100, (track.start / total) * 100);
  const widthPct = Math.max(6, Math.min(100 - leftPct, (visible / total) * 100));

  return (
    <div className="mt-1" style={{ minWidth: width }}>
      <div
        ref={laneRef}
        className="relative h-10 rounded-md bg-teal-500/10 border border-teal-500/30 overflow-hidden"
        style={{ width }}
      >
        <div
          onPointerDown={drag("move")}
          className="absolute inset-y-0 bg-teal-500/25 border border-teal-600/50 rounded-md touch-none cursor-grab overflow-hidden"
          style={{ left: `${leftPct}%`, width: `${widthPct}%` }}
        >
          <Waveform
            url={track.url}
            from={track.clipStart}
            to={track.clipEnd}
            duration={track.duration || track.clipEnd}
          />
          <div className="absolute inset-x-0 top-0 flex items-center gap-1 px-4 pointer-events-none">
            <Music2 className="w-2.5 h-2.5 text-teal-800 flex-shrink-0" />
            <span className="text-[9px] font-black text-teal-900 truncate">
              {track.title}
            </span>
          </div>
          <div
            onPointerDown={drag("left")}
            className="absolute left-0 inset-y-0 w-3 bg-teal-600 cursor-ew-resize touch-none flex items-center justify-center"
          >
            <span className="h-4 w-[2px] bg-white/80 rounded" />
          </div>
          <div
            onPointerDown={drag("right")}
            className="absolute right-0 inset-y-0 w-3 bg-teal-600 cursor-ew-resize touch-none flex items-center justify-center"
          >
            <span className="h-4 w-[2px] bg-white/80 rounded" />
          </div>
        </div>
      </div>
      <div className="flex items-center justify-between px-1 pt-0.5" style={{ width }}>
        <span className="text-[9px] font-mono text-muted-foreground">
          in {track.clipStart.toFixed(1)}s · out {track.clipEnd.toFixed(1)}s · @{" "}
          {track.start.toFixed(1)}s
        </span>
        <div className="flex items-center gap-2">
          <button onClick={onPick} className="text-[9px] font-black uppercase text-teal-700">
            Change
          </button>
          <button onClick={onRemove} className="text-destructive" aria-label="Remove audio">
            <X className="w-3 h-3" />
          </button>
        </div>
      </div>
    </div>
  );
}

export default AudioTrackLane;
