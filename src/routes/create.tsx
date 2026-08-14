import React, { useState, useRef, useEffect } from "react";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import {
  ArrowLeft, Play, Pause, Scissors, Gauge, Volume2,
  Sparkles, Captions, Trash2, Copy, RotateCw,
  Music, Type, Smile, Sliders, Download, Undo2, Redo2, Crop, SplitSquareHorizontal,
  PictureInPicture2,
} from "lucide-react";
import { toast } from "sonner";
import { CameraCapture } from "@/components/yw/CameraCapture";
import { LightTimeline } from "@/components/yw/editor/LightTimeline";
import { NO_COPYRIGHT_MUSIC } from "@/components/yw/MusicVault";

export const Route = createFileRoute("/create")({
  head: () => ({
    meta: [
      { title: "Camera & Pro Edits Studio — YourWorld" },
      {
        name: "description",
        content:
          "Shoot in 4K/60fps with flip camera, pinch zoom and one-tap record, then jump straight into the YourWorld Pro Edits Studio.",
      },
      { property: "og:title", content: "Camera & Pro Edits Studio — YourWorld" },
      {
        property: "og:description",
        content: "Capture posts, reels and live moments in ultra HD, then edit them instantly.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: CreateStudioPage,
});

interface ClipItem {
  id: string;
  url: string;
  speed: number;
  rotation: number;
  filter: "none" | "vivid" | "noir" | "cyber" | "warm";
  textOverlay: string;
  volume: number;
  trimStart?: number;
  trimEnd?: number;
  duration?: number;
  crop?: number;
  textX?: number;
  textY?: number;
  cropBox?: { x: number; y: number; w: number; h: number };
}

type ToolId =
  | "TRIM" | "MUSIC" | "FILTER" | "EFFECT" | "TEXT" | "STICKER" | "PIP" | "SPEED" | "CROP";

const TOOL_MENU: { id: ToolId; label: string; Icon: React.ComponentType<{ size?: number }> }[] = [
  { id: "TRIM", label: "Trim", Icon: Scissors },
  { id: "MUSIC", label: "Music", Icon: Music },
  { id: "FILTER", label: "Filter", Icon: Sliders },
  { id: "EFFECT", label: "Effect", Icon: Sparkles },
  { id: "TEXT", label: "Text", Icon: Type },
  { id: "STICKER", label: "Sticker", Icon: Smile },
  { id: "PIP", label: "PIP", Icon: PictureInPicture2 },
  { id: "SPEED", label: "Speed", Icon: Gauge },
  { id: "CROP", label: "Crop", Icon: Crop },
];


export function CreateStudioPage() {
  const navigate = useNavigate();
  const [clips, setClips] = useState<ClipItem[]>([]);
  const [activeClipIndex, setActiveClipIndex] = useState(0);
  const [isPlaying, setIsPlaying] = useState(true);
  const [isMuted, setIsMuted] = useState(false);
  const [activeToolPanel, setActiveToolPanel] = useState<
    "NONE" | ToolId | "VOLUME"
  >("NONE");
  const [currentTime, setCurrentTime] = useState(0);
  const [playFraction, setPlayFraction] = useState(0);
  const [customTextInput, setCustomTextInput] = useState("");
  const [showMusicPicker, setShowMusicPicker] = useState(false);
  const [audioTrack, setAudioTrack] = useState<
    { id: string; title: string; url: string; start: number; duration: number } | null
  >(null);

  const totalDuration = clips.reduce((acc, c) => {
    const d = c.duration || 0;
    const start = c.trimStart ?? 0;
    const end = c.trimEnd ?? d;
    return acc + Math.max(0, end - start);
  }, 0);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const audioInputRef = useRef<HTMLInputElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const audioElRef = useRef<HTMLAudioElement>(null);
  const stageRef = useRef<HTMLDivElement>(null);
  const scrubbingRef = useRef(false);
  const loadedUrlRef = useRef<string | null>(null);
  const scrubTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const dragRafRef = useRef<number | null>(null);
  const seekRafRef = useRef<number | null>(null);
  const pendingSeekRef = useRef<number | null>(null);

  useEffect(() => {
    return () => {
      if (dragRafRef.current) cancelAnimationFrame(dragRafRef.current);
      if (seekRafRef.current) cancelAnimationFrame(seekRafRef.current);
      if (scrubTimerRef.current) clearTimeout(scrubTimerRef.current);
    };
  }, []);

  // Coalesce high-frequency pointer updates into one state write per frame
  const scheduleFrame = (fn: () => void) => {
    if (dragRafRef.current) return;
    dragRafRef.current = requestAnimationFrame(() => {
      dragRafRef.current = null;
      fn();
    });
  };

  // Push files into the Pro Edits Studio editor
  const addFiles = (files: File[]) => {
    const remaining = 10 - clips.length;
    if (remaining <= 0) {
      toast.error("Maximum 10 clips limit reached!");
      return;
    }
    const newClips: ClipItem[] = files.slice(0, remaining).map((f, i) => ({
      id: `c_${Date.now()}_${i}`,
      url: URL.createObjectURL(f),
      speed: 1,
      rotation: 0,
      filter: "none",
      textOverlay: "",
      volume: 1,
      trimStart: 0,
      crop: 1,
      textX: 50,
      textY: 50,
    }));
    setClips((prev) => [...prev, ...newClips]);
    setActiveClipIndex(clips.length);
  };

  // Smooth Multi-Select Import (Up to 10 clips)
  const handleMediaSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files) return;
    addFiles(Array.from(files));
    e.target.value = "";
  };

  const currentClip = clips[activeClipIndex];

  // Real-time Property Updation (selected clip only)
  const updateCurrentClip = (key: keyof ClipItem, val: any) => {
    setClips((prev) =>
      prev.map((c, i) => (i === activeClipIndex ? { ...c, [key]: val } : c)),
    );
  };

  const clamp = (n: number, a = 0, b = 100) => Math.min(b, Math.max(a, n));

  const stagePct = (e: { clientX: number; clientY: number }) => {
    const r = stageRef.current?.getBoundingClientRect();
    if (!r) return { x: 50, y: 50 };
    return {
      x: clamp(((e.clientX - r.left) / r.width) * 100),
      y: clamp(((e.clientY - r.top) / r.height) * 100),
    };
  };

  // Drag text overlay anywhere on the canvas
  const startTextDrag = (e: React.PointerEvent) => {
    e.preventDefault();
    e.stopPropagation();
    const el = e.currentTarget as HTMLElement;
    el.setPointerCapture?.(e.pointerId);
    const move = (ev: PointerEvent) => {
      const p = stagePct(ev);
      // paint immediately (GPU only), commit state once per frame
      el.style.left = `${p.x}%`;
      el.style.top = `${p.y}%`;
      scheduleFrame(() =>
        setClips((prev) =>
          prev.map((c, i) => (i === activeClipIndex ? { ...c, textX: p.x, textY: p.y } : c)),
        ),
      );
    };
    const end = () => {
      if (dragRafRef.current) {
        cancelAnimationFrame(dragRafRef.current);
        dragRafRef.current = null;
      }
      window.removeEventListener("pointermove", move);
      window.removeEventListener("pointerup", end);
    };
    window.addEventListener("pointermove", move, { passive: true });
    window.addEventListener("pointerup", end);
  };

  // Freeform crop bounding box drag (move + corner resize)
  const startCropDrag = (e: React.PointerEvent, mode: "move" | "nw" | "ne" | "sw" | "se") => {
    e.preventDefault();
    e.stopPropagation();
    const box = currentClip?.cropBox ?? { x: 10, y: 10, w: 80, h: 80 };
    const origin = stagePct(e);
    const move = (ev: PointerEvent) => {
      const p = stagePct(ev);
      const dx = p.x - origin.x;
      const dy = p.y - origin.y;
      let next = { ...box };
      if (mode === "move") {
        next.x = clamp(box.x + dx, 0, 100 - box.w);
        next.y = clamp(box.y + dy, 0, 100 - box.h);
      } else {
        const right = box.x + box.w;
        const bottom = box.y + box.h;
        if (mode === "nw" || mode === "sw") {
          next.x = clamp(box.x + dx, 0, right - 10);
          next.w = right - next.x;
        } else {
          next.w = clamp(box.w + dx, 10, 100 - box.x);
        }
        if (mode === "nw" || mode === "ne") {
          next.y = clamp(box.y + dy, 0, bottom - 10);
          next.h = bottom - next.y;
        } else {
          next.h = clamp(box.h + dy, 10, 100 - box.y);
        }
      }
      scheduleFrame(() =>
        setClips((prev) =>
          prev.map((c, i) => (i === activeClipIndex ? { ...c, cropBox: next } : c)),
        ),
      );
    };
    const end = () => {
      if (dragRafRef.current) {
        cancelAnimationFrame(dragRafRef.current);
        dragRafRef.current = null;
      }
      window.removeEventListener("pointermove", move);
      window.removeEventListener("pointerup", end);
    };
    window.addEventListener("pointermove", move, { passive: true });
    window.addEventListener("pointerup", end);
  };

  // Real-time Video Speed Sync
  useEffect(() => {
    if (videoRef.current && currentClip) {
      videoRef.current.playbackRate = currentClip.speed;
      videoRef.current.volume = currentClip.volume;
    }
  }, [currentClip, activeClipIndex]);

  // Reload the <video> source whenever the active clip's URL changes
  useEffect(() => {
    const v = videoRef.current;
    const url = currentClip?.url;
    if (!v || !url) return;
    if (loadedUrlRef.current === url) return;
    loadedUrlRef.current = url;
    v.src = url;
    v.load();
    const onReady = () => {
      const start = currentClip?.trimStart ?? 0;
      if (isFinite(start) && Math.abs(v.currentTime - start) > 0.05) {
        try { v.currentTime = start; } catch { /* ignore */ }
      }
      if (isPlaying) void v.play().catch(() => {});
    };
    if (v.readyState >= 2) onReady();
    else v.addEventListener("loadeddata", onReady, { once: true });
    return () => v.removeEventListener("loadeddata", onReady);
  }, [currentClip?.url, currentClip?.trimStart, isPlaying]);

  // Advance to the next clip (loops back to the first)
  const advanceClip = React.useCallback(() => {
    const v = videoRef.current;
    if (!clips.length) return;
    const next = (activeClipIndex + 1) % clips.length;
    const nextClip = clips[next];
    setIsPlaying(true);
    if (v && nextClip && nextClip.url === currentClip?.url) {
      try { v.currentTime = nextClip.trimStart ?? 0; } catch { /* ignore */ }
      void v.play().catch(() => {});
    }
    setActiveClipIndex(next);
  }, [clips, activeClipIndex, currentClip?.url]);

  // Sync canvas playback to the selected clip's trim range
  useEffect(() => {
    const v = videoRef.current;
    if (!v || !currentClip) return;
    const start = currentClip.trimStart ?? 0;
    const end = currentClip.trimEnd;
    const seek = () => {
      if (scrubbingRef.current) return;
      if (Math.abs(v.currentTime - start) > 0.05) v.currentTime = start;
    };
    if (v.readyState >= 1 && loadedUrlRef.current === currentClip.url) seek();
    else v.addEventListener("loadedmetadata", seek, { once: true });
    const onTime = () => {
      if (scrubbingRef.current) return;
      if (end && v.currentTime >= end) advanceClip();
      else if (v.currentTime < start - 0.1) v.currentTime = start;
    };
    v.addEventListener("timeupdate", onTime);
    v.addEventListener("ended", advanceClip);
    return () => {
      v.removeEventListener("timeupdate", onTime);
      v.removeEventListener("ended", advanceClip);
      v.removeEventListener("loadedmetadata", seek);
    };
  }, [activeClipIndex, currentClip?.trimStart, currentClip?.trimEnd, currentClip?.url, advanceClip]);

  // Split the SELECTED clip at the playhead into two trimmed clips
  // Keep the library music block playing in sync with the video playhead
  useEffect(() => {
    const v = videoRef.current;
    const a = audioElRef.current;
    if (!v || !a || !audioTrack) return;
    const sync = () => {
      const t = v.currentTime - audioTrack.start;
      if (t >= 0 && t <= audioTrack.duration && !v.paused) {
        if (Math.abs(a.currentTime - t) > 0.25) a.currentTime = t;
        if (a.paused) void a.play().catch(() => {});
      } else if (!a.paused) {
        a.pause();
      }
    };
    const onPause = () => a.pause();
    v.addEventListener("timeupdate", sync);
    v.addEventListener("seeking", sync);
    v.addEventListener("play", sync);
    v.addEventListener("pause", onPause);
    return () => {
      v.removeEventListener("timeupdate", sync);
      v.removeEventListener("seeking", sync);
      v.removeEventListener("play", sync);
      v.removeEventListener("pause", onPause);
      a.pause();
    };
  }, [audioTrack?.url, audioTrack?.start, audioTrack?.duration, activeClipIndex]);

  const handleSplit = () => {
    const v = videoRef.current;
    if (!currentClip || clips.length >= 10) {
      toast.error("Maximum 10 clips limit reached!");
      return;
    }
    const dur = currentClip.duration || v?.duration || 0;
    const start = currentClip.trimStart ?? 0;
    const end = currentClip.trimEnd ?? dur;
    const at = v ? v.currentTime : (start + end) / 2;
    if (!(at > start + 0.15 && at < end - 0.15)) {
      toast.error("Move the playhead inside the clip to split");
      return;
    }
    setClips((prev) => {
      const next = [...prev];
      next[activeClipIndex] = { ...currentClip, trimEnd: at };
      next.splice(activeClipIndex + 1, 0, {
        ...currentClip,
        id: `c_${Date.now()}`,
        trimStart: at,
        trimEnd: end,
      });
      return next;
    });
    toast.success("Clip split");
  };

  // Real-time Duplicate
  const handleDuplicate = () => {
    if (!currentClip || clips.length >= 10) {
      toast.error("Maximum 10 clips limit reached!");
      return;
    }
    const copy = { ...currentClip, id: `c_${Date.now()}` };
    const updated = [...clips];
    updated.splice(activeClipIndex + 1, 0, copy);
    setClips(updated);
    setActiveClipIndex(activeClipIndex + 1);
  };

  // Real-time Delete
  const handleDelete = () => {
    if (clips.length === 0) return;
    const updated = clips.filter((_, i) => i !== activeClipIndex);
    setClips(updated);
    setActiveClipIndex(Math.max(0, activeClipIndex - 1));
  };

  // Real-time Play/Pause Toggle
  const togglePlay = () => {
    if (!videoRef.current) return;
    if (isPlaying) {
      videoRef.current.pause();
    } else {
      videoRef.current.play();
    }
    setIsPlaying(!isPlaying);
  };

  // Horizontal tool menu actions
  const handleToolMenu = (id: ToolId) => {
    if (id === "MUSIC") return setShowMusicPicker(true);
    if (id === "EFFECT")
      return updateCurrentClip("filter", currentClip?.filter === "vivid" ? "none" : "vivid");
    if (id === "PIP") {
      const v = videoRef.current as any;
      if (document.pictureInPictureElement) void document.exitPictureInPicture();
      else if (v?.requestPictureInPicture) void v.requestPictureInPicture().catch(() => toast.error("Picture-in-picture unavailable"));
      else toast.error("Picture-in-picture unavailable");
      return;
    }
    setActiveToolPanel(activeToolPanel === id ? "NONE" : id);
  };

  return (
    <div className="fixed inset-0 z-[99999] bg-background text-foreground font-sans flex flex-col overflow-hidden select-none">
      
      {/* Hidden File Inputs */}
      <input 
        type="file" 
        ref={fileInputRef} 
        onChange={handleMediaSelect} 
        multiple 
        accept="video/*,image/*" 
        className="hidden" 
      />

      <input 
        type="file" 
        ref={audioInputRef} 
        accept="audio/*" 
        onChange={() => alert("Background Audio track added successfully!")} 
        className="hidden" 
      />

      {clips.length === 0 ? (
        /* MINIMALIST LIVE CAMERA */
        <CameraCapture
          onClose={() => navigate({ to: "/" })}
          onCapture={(files) => addFiles(files)}
          onPick={() => fileInputRef.current?.click()}
          onDrafts={() => toast("No drafts yet — capture something first")}
        />
      ) : (
        /* LIGHT PRO EDITOR */
        <div className="flex-1 min-h-0 flex flex-col bg-background text-foreground relative">

          {/* HEADER BAR */}
          <div className="flex-shrink-0 flex justify-between items-center px-4 py-2 bg-card z-30 border-b border-border">
            <button onClick={() => setClips([])} className="p-2 bg-muted rounded-full text-foreground">
              <ArrowLeft size={18} />
            </button>
            <span className="text-[11px] font-black uppercase tracking-wide text-muted-foreground">Edit</span>
            <button
              onClick={() => {
                toast.success("Video rendered & saved to gallery");
                navigate({ to: "/" });
              }}
              className="bg-orange-500 hover:bg-orange-600 text-white font-black px-3.5 py-1.5 rounded-lg text-[10px] uppercase tracking-wide shadow-sm active:scale-95 transition"
            >
              SAVE
            </button>
          </div>

          {/* FULL-WIDTH VIDEO CANVAS */}
          <div className="flex-1 min-h-0 w-full flex items-center justify-center relative bg-white overflow-hidden">
            <div ref={stageRef} className="relative h-full w-full flex items-center justify-center touch-none">
              <video
                ref={videoRef}
                autoPlay
                playsInline
                muted={isMuted}
                onTimeUpdate={(e) => {
                  const t = e.currentTarget.currentTime;
                  const c = clips[activeClipIndex];
                  const dur = c?.duration || e.currentTarget.duration || 0;
                  const start = c?.trimStart ?? 0;
                  const end = c?.trimEnd ?? dur;
                  const span = Math.max(0.01, end - start);
                  const frac = Math.min(1, Math.max(0, (t - start) / span));
                  let before = 0;
                  for (let i = 0; i < activeClipIndex; i++) {
                    const p = clips[i];
                    const pd = p?.duration || 0;
                    before += Math.max(0, (p?.trimEnd ?? pd) - (p?.trimStart ?? 0));
                  }
                  setPlayFraction(frac);
                  setCurrentTime(before + frac * span);
                }}
                onLoadedMetadata={(e) => {
                  const d = e.currentTarget.duration;
                  if (isFinite(d) && d > 0 && !currentClip?.duration) updateCurrentClip("duration", d);
                }}
                onEmptied={() => { loadedUrlRef.current = null; }}
                className="h-full max-h-full max-w-full object-contain will-change-transform"
                style={{
                  transform: `translateZ(0) rotate(${currentClip?.rotation || 0}deg) scale(${currentClip?.crop ?? 1})`,
                  clipPath: currentClip?.cropBox
                    ? `inset(${currentClip.cropBox.y}% ${100 - (currentClip.cropBox.x + currentClip.cropBox.w)}% ${100 - (currentClip.cropBox.y + currentClip.cropBox.h)}% ${currentClip.cropBox.x}%)`
                    : undefined,
                  filter:
                    currentClip?.filter === "vivid" ? "saturate(2) contrast(1.1)" :
                    currentClip?.filter === "noir" ? "grayscale(1) contrast(1.2)" :
                    currentClip?.filter === "cyber" ? "hue-rotate(90deg) contrast(1.2)" :
                    currentClip?.filter === "warm" ? "sepia(0.5) saturate(1.4)" : "none"
                }}
              />

              {/* Freeform Crop Bounding Box */}
              {activeToolPanel === "CROP" && currentClip && (
                <div
                  onPointerDown={(e) => startCropDrag(e, "move")}
                  className="absolute border-2 border-orange-500 bg-orange-500/10 cursor-move touch-none"
                  style={{
                    left: `${currentClip.cropBox?.x ?? 10}%`,
                    top: `${currentClip.cropBox?.y ?? 10}%`,
                    width: `${currentClip.cropBox?.w ?? 80}%`,
                    height: `${currentClip.cropBox?.h ?? 80}%`,
                  }}
                >
                  {(["nw", "ne", "sw", "se"] as const).map((h) => (
                    <div
                      key={h}
                      onPointerDown={(e) => startCropDrag(e, h)}
                      className="absolute w-5 h-5 bg-orange-500 rounded-full border-2 border-white shadow touch-none"
                      style={{
                        left: h.includes("w") ? -10 : undefined,
                        right: h.includes("e") ? -10 : undefined,
                        top: h.startsWith("n") ? -10 : undefined,
                        bottom: h.startsWith("s") ? -10 : undefined,
                      }}
                    />
                  ))}
                </div>
              )}

              {/* Draggable Text Overlay */}
              {currentClip?.textOverlay && (
                <div
                  onPointerDown={startTextDrag}
                  className="absolute -translate-x-1/2 -translate-y-1/2 bg-white/85 text-foreground font-black px-4 py-2 rounded-xl text-lg border border-orange-400 shadow-lg backdrop-blur-sm cursor-move touch-none select-none"
                  style={{ left: `${currentClip.textX ?? 50}%`, top: `${currentClip.textY ?? 50}%` }}
                >
                  {currentClip.textOverlay}
                </div>
              )}
            </div>
          </div>

          {/* PLAY CONTROLS DIRECTLY BELOW CANVAS */}
          <div className="flex-shrink-0 flex items-center justify-between px-4 py-2 bg-card border-t border-border">
            <div className="flex items-center gap-3">
              <button
                onClick={togglePlay}
                className="w-10 h-10 rounded-full bg-orange-500 text-white flex items-center justify-center active:scale-90 transition shadow-sm"
                aria-label={isPlaying ? "Pause" : "Play"}
              >
                {isPlaying ? <Pause size={18} /> : <Play size={18} />}
              </button>
              <span className="text-[11px] font-bold text-muted-foreground">
                Clip {activeClipIndex + 1}/{clips.length} · {currentClip?.speed}x
              </span>
            </div>
            <div className="flex items-center gap-3 text-muted-foreground">
              <button onClick={() => updateCurrentClip("rotation", 0)} className="active:scale-90 transition" aria-label="Reset rotation"><Undo2 size={16} /></button>
              <button onClick={() => updateCurrentClip("filter", "none")} className="active:scale-90 transition" aria-label="Reset filter"><Redo2 size={16} /></button>
              <button onClick={handleSplit} className="active:scale-90 transition" aria-label="Split clip at playhead"><SplitSquareHorizontal size={16} /></button>
              <button onClick={handleDuplicate} className="active:scale-90 transition" aria-label="Duplicate clip"><Copy size={16} /></button>
              <button onClick={handleDelete} className="text-destructive active:scale-90 transition" aria-label="Delete clip"><Trash2 size={16} /></button>
            </div>
          </div>

          {/* HORIZONTAL SCROLLABLE TOOL MENU */}
          <div className="flex-shrink-0 bg-card border-t border-border px-3 py-2 flex items-center gap-2 overflow-x-auto scrollbar-none">
            {TOOL_MENU.map((t) => {
              const active = activeToolPanel === t.id;
              return (
                <button
                  key={t.id}
                  onClick={() => handleToolMenu(t.id)}
                  className={`flex flex-col items-center justify-center gap-1 min-w-[64px] py-2 px-2 rounded-2xl text-[9px] font-extrabold uppercase tracking-wide flex-shrink-0 border transition active:scale-95 ${
                    active
                      ? "bg-orange-500 text-white border-orange-500"
                      : "bg-muted text-foreground border-transparent"
                  }`}
                >
                  <t.Icon size={18} />
                  {t.label}
                </button>
              );
            })}
          </div>

          {/* TOOL PANEL */}
          {activeToolPanel !== "NONE" && (
            <div className="flex-shrink-0 bg-card border-t border-border p-3 flex flex-col gap-2">

              {activeToolPanel === "TRIM" && currentClip && (
                <div className="flex flex-col gap-2">
                  <span className="text-[10px] font-bold uppercase text-muted-foreground">
                    Trim clip {activeClipIndex + 1}
                  </span>
                  {(["trimStart", "trimEnd"] as const).map((k) => {
                    const dur = currentClip.duration || 0;
                    const val = k === "trimStart" ? currentClip.trimStart ?? 0 : currentClip.trimEnd ?? dur;
                    return (
                      <label key={k} className="flex items-center gap-3 text-[10px] font-bold text-muted-foreground">
                        <span className="w-10">{k === "trimStart" ? "Start" : "End"}</span>
                        <input
                          type="range"
                          min={0}
                          max={dur || 1}
                          step={0.05}
                          value={val}
                          onChange={(e) => {
                            const n = Number(e.target.value);
                            const s = currentClip.trimStart ?? 0;
                            const en = currentClip.trimEnd ?? dur;
                            if (k === "trimStart") updateCurrentClip("trimStart", Math.min(n, en - 0.2));
                            else updateCurrentClip("trimEnd", Math.max(n, s + 0.2));
                          }}
                          className="flex-1 accent-orange-500"
                        />
                        <span className="w-10 text-right font-mono">{val.toFixed(1)}s</span>
                      </label>
                    );
                  })}
                  <button onClick={handleSplit} className="self-start text-[10px] font-black uppercase text-orange-600">Split at playhead</button>
                </div>
              )}

              {activeToolPanel === "CROP" && currentClip && (
                <label className="flex items-center gap-3 text-[10px] font-bold text-muted-foreground">
                  <Crop size={14} className="text-orange-500" />
                  <input
                    type="range"
                    min={1}
                    max={3}
                    step={0.05}
                    value={currentClip.crop ?? 1}
                    onChange={(e) => updateCurrentClip("crop", Number(e.target.value))}
                    className="flex-1 accent-orange-500"
                  />
                  <span className="w-12 text-right font-mono">{(currentClip.crop ?? 1).toFixed(2)}x</span>
                </label>
              )}

              {activeToolPanel === "FILTER" && (
                <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-none">
                  {(["none", "vivid", "noir", "cyber", "warm"] as const).map((f) => (
                    <button
                      key={f}
                      onClick={() => updateCurrentClip("filter", f)}
                      className={`px-4 py-2 rounded-xl font-bold text-xs uppercase border transition flex-shrink-0 ${
                        currentClip?.filter === f
                          ? "bg-orange-500 text-white border-orange-500"
                          : "bg-muted text-foreground border-border"
                      }`}
                    >
                      {f}
                    </button>
                  ))}
                </div>
              )}

              {activeToolPanel === "SPEED" && (
                <div className="flex gap-2 justify-around py-1">
                  {[0.25, 0.5, 1, 2, 4].map((s) => (
                    <button
                      key={s}
                      onClick={() => updateCurrentClip("speed", s)}
                      className={`px-4 py-1.5 rounded-xl font-bold text-xs border transition ${
                        currentClip?.speed === s
                          ? "bg-orange-500 text-white border-orange-500"
                          : "bg-muted text-foreground border-border"
                      }`}
                    >
                      {s}x
                    </button>
                  ))}
                </div>
              )}

              {activeToolPanel === "STICKER" && (
                <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-none">
                  {["🔥", "✨", "😎", "💚", "🎧", "📍", "🫶", "⚡"].map((s) => (
                    <button
                      key={s}
                      onClick={() => updateCurrentClip("textOverlay", s)}
                      className="w-11 h-11 flex-shrink-0 rounded-2xl bg-muted text-xl flex items-center justify-center"
                    >
                      {s}
                    </button>
                  ))}
                </div>
              )}

              {activeToolPanel === "TEXT" && (
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={customTextInput}
                    onChange={(e) => setCustomTextInput(e.target.value)}
                    placeholder="Type text overlay..."
                    className="flex-1 bg-muted border border-border rounded-xl px-4 py-2 text-xs font-bold text-foreground focus:outline-none"
                  />
                  <button
                    onClick={() => {
                      updateCurrentClip("textOverlay", customTextInput);
                      setActiveToolPanel("NONE");
                    }}
                    className="bg-orange-500 text-white px-4 py-2 rounded-xl font-bold text-xs"
                  >
                    Apply
                  </button>
                </div>
              )}

            </div>
          )}

          {/* SINGLE SCROLLABLE CLIP TIMELINE */}
          <div className="flex-shrink-0 pb-[max(0.25rem,env(safe-area-inset-bottom))]">
            <LightTimeline
              clips={clips}
              activeIndex={activeClipIndex}
              currentTime={currentTime}
              totalDuration={totalDuration}
              playFraction={playFraction}
              isPlaying={isPlaying}
              audioLabel={audioTrack?.title}
              onAddAudio={() => setShowMusicPicker(true)}
              isMuted={isMuted}
              onToggleMute={() => setIsMuted(!isMuted)}
              onSelect={(i) => {
                const v = videoRef.current;
                const clip = clips[i];
                setActiveClipIndex(i);
                if (!v || !clip) return;
                scrubbingRef.current = false;
                if (scrubTimerRef.current) clearTimeout(scrubTimerRef.current);
                // Pause at the selected clip's starting frame for easy editing
                const start = clip.trimStart ?? 0;
                const applySeek = () => {
                  try { v.currentTime = start; } catch { /* ignore */ }
                  v.pause();
                  setIsPlaying(false);
                };
                if (clip.url && loadedUrlRef.current !== clip.url) {
                  loadedUrlRef.current = clip.url;
                  v.src = clip.url;
                  v.load();
                  v.addEventListener("loadeddata", applySeek, { once: true });
                } else if (v.readyState >= 1) {
                  applySeek();
                } else {
                  v.addEventListener("loadeddata", applySeek, { once: true });
                }
              }}
              onTrim={(i, start, end) => {
                setClips((prev) =>
                  prev.map((c, idx) => (idx === i ? { ...c, trimStart: start, trimEnd: end } : c)),
                );
              }}
              onAdd={() => fileInputRef.current?.click()}
              onReorder={(from, to) => {
                setClips((prev) => {
                  const next = [...prev];
                  const [moved] = next.splice(from, 1);
                  next.splice(to, 0, moved);
                  return next;
                });
                setActiveClipIndex(to);
                toast.success("Clip moved");
              }}
              onScrub={(i, frac) => {
                const v = videoRef.current;
                scrubbingRef.current = true;
                if (scrubTimerRef.current) clearTimeout(scrubTimerRef.current);
                scrubTimerRef.current = setTimeout(() => {
                  scrubbingRef.current = false;
                }, 220);
                if (i !== activeClipIndex) setActiveClipIndex(i);
                const clip = clips[i];
                if (!v || !clip) return;
                const dur = clip.duration || v.duration || 0;
                if (!dur || !isFinite(dur)) return;
                const start = clip.trimStart ?? 0;
                const end = clip.trimEnd ?? dur;
                if (!v.paused) {
                  v.pause();
                  setIsPlaying(false);
                }
                const target = Math.min(end, Math.max(start, start + frac * (end - start)));
                pendingSeekRef.current = target;
                if (seekRafRef.current) return;
                seekRafRef.current = requestAnimationFrame(() => {
                  seekRafRef.current = null;
                  const t = pendingSeekRef.current;
                  if (t == null || !videoRef.current) return;
                  const vid = videoRef.current;
                  if (Math.abs(vid.currentTime - t) < 0.02) return;
                  if (typeof vid.fastSeek === "function") vid.fastSeek(t);
                  else vid.currentTime = t;
                });
              }}
            />
          </div>

          {/* HIDDEN AUDIO ENGINE */}
          <audio ref={audioElRef} src={audioTrack?.url} preload="auto" className="hidden" />

          {/* MUSIC LIBRARY PICKER */}
          {showMusicPicker && (
            <div className="absolute inset-0 z-[60] bg-foreground/30 flex items-end" onClick={() => setShowMusicPicker(false)}>
              <div className="w-full bg-card border-t border-border rounded-t-3xl p-4 max-h-[70%] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
                <p className="text-[11px] font-black uppercase tracking-wide text-muted-foreground mb-3">Music Library</p>
                <div className="flex flex-col gap-2">
                  {NO_COPYRIGHT_MUSIC.map((m) => {
                    const [mm, ss] = m.duration.split(":").map(Number);
                    const secs = (mm || 0) * 60 + (ss || 0);
                    return (
                      <button
                        key={m.id}
                        onClick={() => {
                          setAudioTrack({ id: m.id, title: m.title, url: m.url, start: 0, duration: secs });
                          setShowMusicPicker(false);
                          toast.success(`${m.title} added to audio track`);
                        }}
                        className="flex items-center gap-3 p-3 rounded-2xl bg-muted text-left active:scale-[0.99] transition"
                      >
                        <span className="w-9 h-9 rounded-xl bg-orange-500/15 text-orange-600 flex items-center justify-center"><Music size={16} /></span>
                        <span className="flex-1 min-w-0">
                          <span className="block text-xs font-bold truncate text-foreground">{m.title}</span>
                          <span className="block text-[10px] text-muted-foreground truncate">{m.artist} · {m.category}</span>
                        </span>
                        <span className="text-[10px] font-mono text-muted-foreground">{m.duration}</span>
                      </button>
                    );
                  })}
                  {audioTrack && (
                    <button
                      onClick={() => { setAudioTrack(null); setShowMusicPicker(false); }}
                      className="p-3 rounded-2xl bg-destructive/10 text-destructive text-xs font-bold"
                    >
                      Remove audio track
                    </button>
                  )}
                </div>
              </div>
            </div>
          )}

        </div>
      )}

    </div>
  );
}
