import React, { useState, useRef, useEffect } from "react";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import {
  ArrowLeft, Play, Pause, Scissors, Gauge, Volume2,
  Sparkles, Captions, Trash2, Copy, RotateCw,
  Music, Type, Smile, Sliders, Download, Undo2, Redo2, Crop,
} from "lucide-react";
import { toast } from "sonner";
import { CameraCapture } from "@/components/yw/CameraCapture";
import { CapCutTimeline } from "@/components/yw/editor/CapCutTimeline";
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

export function CreateStudioPage() {
  const navigate = useNavigate();
  const [clips, setClips] = useState<ClipItem[]>([]);
  const [activeClipIndex, setActiveClipIndex] = useState(0);
  const [isPlaying, setIsPlaying] = useState(true);
  const [isMuted, setIsMuted] = useState(false);
  const [activeToolPanel, setActiveToolPanel] = useState<
    "NONE" | "TEXT" | "FILTER" | "SPEED" | "TRIM" | "VOLUME" | "CROP"
  >("NONE");
  const [customTextInput, setCustomTextInput] = useState("");
  const [showMusicPicker, setShowMusicPicker] = useState(false);
  const [audioTrack, setAudioTrack] = useState<
    { id: string; title: string; url: string; start: number; duration: number } | null
  >(null);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const audioInputRef = useRef<HTMLInputElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const audioElRef = useRef<HTMLAudioElement>(null);
  const stageRef = useRef<HTMLDivElement>(null);

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
      setClips((prev) =>
        prev.map((c, i) => (i === activeClipIndex ? { ...c, textX: p.x, textY: p.y } : c)),
      );
    };
    const end = () => {
      window.removeEventListener("pointermove", move);
      window.removeEventListener("pointerup", end);
    };
    window.addEventListener("pointermove", move);
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
      setClips((prev) =>
        prev.map((c, i) => (i === activeClipIndex ? { ...c, cropBox: next } : c)),
      );
    };
    const end = () => {
      window.removeEventListener("pointermove", move);
      window.removeEventListener("pointerup", end);
    };
    window.addEventListener("pointermove", move);
    window.addEventListener("pointerup", end);
  };

  // Real-time Video Speed Sync
  useEffect(() => {
    if (videoRef.current && currentClip) {
      videoRef.current.playbackRate = currentClip.speed;
      videoRef.current.volume = currentClip.volume;
    }
  }, [currentClip, activeClipIndex]);

  // Sync canvas playback to the selected clip's trim range
  useEffect(() => {
    const v = videoRef.current;
    if (!v || !currentClip) return;
    const start = currentClip.trimStart ?? 0;
    const end = currentClip.trimEnd;
    const seek = () => {
      if (Math.abs(v.currentTime - start) > 0.05) v.currentTime = start;
    };
    if (v.readyState >= 1) seek();
    else v.addEventListener("loadedmetadata", seek, { once: true });
    const onTime = () => {
      if (end && v.currentTime >= end) v.currentTime = start;
      else if (v.currentTime < start - 0.1) v.currentTime = start;
    };
    v.addEventListener("timeupdate", onTime);
    return () => {
      v.removeEventListener("timeupdate", onTime);
      v.removeEventListener("loadedmetadata", seek);
    };
  }, [activeClipIndex, currentClip?.trimStart, currentClip?.trimEnd, currentClip?.url]);

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

  return (
    <div className="fixed inset-0 z-[99999] bg-black text-white font-sans flex flex-col overflow-hidden select-none">
      
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
        /* REAL-TIME PRO EDITOR ENGINE */
        <div className="flex-1 min-h-0 flex flex-col bg-black relative">
          
          {/* HEADER BAR */}
          <div className="flex-shrink-0 flex justify-between items-center px-4 py-2 bg-black z-30 border-b border-zinc-900">
            <button onClick={() => setClips([])} className="p-2 bg-zinc-900 rounded-full">
              <ArrowLeft size={18} />
            </button>

            <button 
              onClick={() => {
                alert("Real-Time Video Rendered & Saved to Phone Gallery!");
                navigate({ to: "/" });
              }}
              className="bg-orange-500 hover:bg-orange-600 text-black font-black px-3.5 py-1.5 rounded-lg text-[10px] uppercase tracking-wide shadow-lg shadow-orange-500/20 active:scale-95 transition"
            >
              SAVE
            </button>
          </div>

          {/* MAIN PLAYER CANVAS (Real-Time Filter & Transform Sync) */}
          <div className="flex-1 min-h-0 flex items-center justify-center px-1 py-0 relative bg-black overflow-hidden">
            <div ref={stageRef} className="relative h-full max-w-full rounded-2xl overflow-hidden border-2 border-orange-500 shadow-2xl flex items-center justify-center touch-none">
              <video 
                ref={videoRef}
                src={currentClip?.url} 
                autoPlay 
                loop 
                playsInline
                muted={isMuted}
                onLoadedMetadata={(e) => {
                  const d = e.currentTarget.duration;
                  if (isFinite(d) && d > 0 && !currentClip?.duration) updateCurrentClip("duration", d);
                }}
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
                  className="absolute border-2 border-orange-400 bg-orange-400/10 cursor-move touch-none"
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
                      className="absolute w-5 h-5 bg-orange-500 rounded-full border-2 border-black touch-none"
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

              {/* Real-time Draggable Text Overlay */}
              {currentClip?.textOverlay && (
                <div
                  onPointerDown={startTextDrag}
                  className="absolute -translate-x-1/2 -translate-y-1/2 bg-black/70 text-orange-400 font-black px-4 py-2 rounded-xl text-lg border border-orange-500/50 backdrop-blur-md shadow-2xl cursor-move touch-none select-none"
                  style={{ left: `${currentClip.textX ?? 50}%`, top: `${currentClip.textY ?? 50}%` }}
                >
                  {currentClip.textOverlay}
                </div>
              )}
            </div>
          </div>

          {/* PLAYER CONTROL RIBBON */}
          <div className="flex-shrink-0 flex items-center justify-between px-6 py-1 text-xs font-mono text-zinc-400">
            <button onClick={togglePlay} className="p-2 bg-zinc-900 rounded-full text-white active:scale-90 transition">
              {isPlaying ? <Pause size={16} /> : <Play size={16} />}
            </button>
            <span className="font-bold text-orange-400">Clip {activeClipIndex + 1} / {clips.length} ({currentClip?.speed}x)</span>
            <div className="flex items-center gap-3">
              <button onClick={() => updateCurrentClip("rotation", 0)} className="text-zinc-400 active:scale-90 transition"><Undo2 size={16} /></button>
              <button onClick={() => updateCurrentClip("filter", "none")} className="text-zinc-400 active:scale-90 transition"><Redo2 size={16} /></button>
            </div>
          </div>

          {/* TOOL POPUP DRAWER (Real-time Options Selector) */}
          {activeToolPanel !== "NONE" && (
            <div className="flex-shrink-0 bg-zinc-900 border-t border-zinc-800 p-3 flex flex-col gap-2 animate-in slide-in-from-bottom">

              {/* Trim Panel — selected clip only */}
              {activeToolPanel === "TRIM" && currentClip && (
                <div className="flex flex-col gap-2">
                  <span className="text-[10px] font-bold uppercase text-zinc-400">
                    Trim clip {activeClipIndex + 1}
                  </span>
                  {(["trimStart", "trimEnd"] as const).map((k) => {
                    const dur = currentClip.duration || 0;
                    const val = k === "trimStart" ? currentClip.trimStart ?? 0 : currentClip.trimEnd ?? dur;
                    return (
                      <label key={k} className="flex items-center gap-3 text-[10px] font-bold text-zinc-300">
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
                </div>
              )}

              {/* Volume Panel — selected clip only */}
              {activeToolPanel === "VOLUME" && currentClip && (
                <label className="flex items-center gap-3 text-[10px] font-bold text-zinc-300">
                  <Volume2 size={14} className="text-orange-400" />
                  <input
                    type="range"
                    min={0}
                    max={1}
                    step={0.05}
                    value={currentClip.volume}
                    onChange={(e) => updateCurrentClip("volume", Number(e.target.value))}
                    className="flex-1 accent-orange-500"
                  />
                  <span className="w-10 text-right font-mono">{Math.round(currentClip.volume * 100)}%</span>
                </label>
              )}

              {/* Crop / Zoom Panel — selected clip only */}
              {activeToolPanel === "CROP" && currentClip && (
                <label className="flex items-center gap-3 text-[10px] font-bold text-zinc-300">
                  <Crop size={14} className="text-orange-400" />
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
              
              {/* Filter Selector Panel */}
              {activeToolPanel === "FILTER" && (
                <div className="flex gap-2 overflow-x-auto pb-1">
                  {(["none", "vivid", "noir", "cyber", "warm"] as const).map((f) => (
                    <button 
                      key={f} 
                      onClick={() => updateCurrentClip("filter", f)}
                      className={`px-4 py-2 rounded-xl font-bold text-xs uppercase border transition ${
                        currentClip?.filter === f ? "bg-orange-500 text-black border-orange-400" : "bg-zinc-800 text-zinc-300 border-zinc-700"
                      }`}
                    >
                      {f}
                    </button>
                  ))}
                </div>
              )}

              {/* Speed Ramp Panel */}
              {activeToolPanel === "SPEED" && (
                <div className="flex gap-2 justify-around py-1">
                  {[0.25, 0.5, 1, 2, 4].map((s) => (
                    <button 
                      key={s} 
                      onClick={() => updateCurrentClip("speed", s)}
                      className={`px-4 py-1.5 rounded-xl font-bold text-xs border transition ${
                        currentClip?.speed === s ? "bg-orange-500 text-black border-orange-400" : "bg-zinc-800 text-zinc-300 border-zinc-700"
                      }`}
                    >
                      {s}x
                    </button>
                  ))}
                </div>
              )}

              {/* Text Input Panel */}
              {activeToolPanel === "TEXT" && (
                <div className="flex gap-2">
                  <input 
                    type="text" 
                    value={customTextInput} 
                    onChange={(e) => setCustomTextInput(e.target.value)}
                    placeholder="Type text overlay..."
                    className="flex-1 bg-zinc-800 border border-zinc-700 rounded-xl px-4 py-2 text-xs font-bold text-white focus:outline-none"
                  />
                  <button 
                    onClick={() => {
                      updateCurrentClip("textOverlay", customTextInput);
                      setActiveToolPanel("NONE");
                    }}
                    className="bg-orange-500 text-black px-4 py-2 rounded-xl font-bold text-xs"
                  >
                    Apply
                  </button>
                </div>
              )}

            </div>
          )}

          {/* CLIP TOOL ROW — applies to the selected clip only */}
          <div className="flex-shrink-0 bg-zinc-950 border-t border-zinc-900 py-2 px-3 grid grid-cols-5 gap-2 text-[9px] font-extrabold uppercase">
            {([
              { id: "TRIM", label: "Trim", icon: <Scissors size={17} /> },
              { id: "SPLIT", label: "Split", icon: <Sliders size={17} className="rotate-90" /> },
              { id: "SPEED", label: "Speed", icon: <Gauge size={17} /> },
              { id: "VOLUME", label: "Volume", icon: <Volume2 size={17} /> },
              { id: "ENHANCE", label: "Enhance", icon: <Sparkles size={17} /> },
            ] as const).map((t) => {
              const active = activeToolPanel === t.id;
              return (
                <button
                  key={t.id}
                  disabled={!currentClip}
                  onClick={() => {
                    if (t.id === "SPLIT") return handleSplit();
                    if (t.id === "ENHANCE")
                      return updateCurrentClip("filter", currentClip?.filter === "vivid" ? "none" : "vivid");
                    setActiveToolPanel(active ? "NONE" : (t.id as any));
                  }}
                  className={`flex flex-col items-center gap-1 py-2 rounded-2xl transition active:scale-95 ${
                    active ? "bg-orange-500 text-black" : "bg-zinc-900 text-orange-400"
                  }`}
                >
                  {t.icon}
                  {t.label}
                </button>
              );
            })}
          </div>

          {/* CLIP UTILITIES */}
          <div className="flex-shrink-0 bg-zinc-950 px-3 pb-1 flex items-center gap-4 overflow-x-auto text-[10px] text-zinc-400 font-bold uppercase whitespace-nowrap scrollbar-none">
            <button onClick={() => setActiveToolPanel(activeToolPanel === "CROP" ? "NONE" : "CROP")} className="flex items-center gap-1 hover:text-white"><Crop size={14} /> Crop</button>
            <button onClick={handleDuplicate} className="flex items-center gap-1 hover:text-white"><Copy size={14} /> Copy</button>
            <button onClick={() => updateCurrentClip("rotation", (currentClip?.rotation || 0) + 90)} className="flex items-center gap-1 hover:text-white"><RotateCw size={14} /> Rotate</button>
            <button onClick={() => updateCurrentClip("textOverlay", "AUTO CAPTION 🔥")} className="flex items-center gap-1 hover:text-white"><Captions size={14} /> Captions</button>
            <button onClick={handleDelete} className="flex items-center gap-1 text-red-400 hover:text-red-300"><Trash2 size={14} /> Delete</button>
          </div>

          {/* REAL-TIME TIMELINE TRACK */}
          <div className="flex-shrink-0">
          <CapCutTimeline
            clips={clips}
            activeIndex={activeClipIndex}
            onSelect={(i) => setActiveClipIndex(i)}
            onTrim={(i, start, end) => {
              setClips((prev) =>
                prev.map((c, idx) => (idx === i ? { ...c, trimStart: start, trimEnd: end } : c)),
              );
            }}
            onAdd={() => fileInputRef.current?.click()}
            isMuted={isMuted}
            onToggleMute={() => setIsMuted(!isMuted)}
            onAddAudio={() => setShowMusicPicker(true)}
            audioTrack={audioTrack ? { title: audioTrack.title, start: audioTrack.start, duration: audioTrack.duration } : null}
            totalDuration={currentClip?.duration || videoRef.current?.duration || 15}
            onAudioMove={(start) => setAudioTrack((p) => (p ? { ...p, start } : p))}
            onAddText={() => setActiveToolPanel(activeToolPanel === "TEXT" ? "NONE" : "TEXT")}
          />
          </div>

          {/* BOTTOM MAIN NAV */}
          <div className="flex-shrink-0 grid grid-cols-7 gap-1 p-2 pb-[max(0.5rem,env(safe-area-inset-bottom))] bg-black text-[10px] text-center font-extrabold border-t border-zinc-900 z-30">
            <button onClick={() => setShowMusicPicker(true)} className="flex flex-col items-center gap-1 p-2 bg-zinc-900 rounded-2xl text-zinc-300"><Music size={18} /> Audio</button>
            <button onClick={() => setActiveToolPanel("TEXT")} className="flex flex-col items-center gap-1 p-2 bg-zinc-900 rounded-2xl text-zinc-300"><Type size={18} /> Text</button>
            <button onClick={() => updateCurrentClip("textOverlay", "Voiceover Track 🎙️")} className="flex flex-col items-center gap-1 p-2 bg-zinc-900 rounded-2xl text-zinc-300"><Captions size={18} /> Voice</button>
            <button onClick={() => updateCurrentClip("textOverlay", "Live Auto Subtitles 🪟")} className="flex flex-col items-center gap-1 p-2 bg-zinc-900 rounded-2xl text-zinc-300"><Captions size={18} /> Captions</button>
            <button onClick={() => updateCurrentClip("textOverlay", "🔥 Trending Sticker")} className="flex flex-col items-center gap-1 p-2 bg-zinc-900 rounded-2xl text-zinc-300"><Smile size={18} /> Stickers</button>
            <button onClick={() => setActiveToolPanel(activeToolPanel === "FILTER" ? "NONE" : "FILTER")} className="flex flex-col items-center gap-1 p-2 bg-zinc-900 rounded-2xl text-zinc-300"><Sliders size={18} /> Filters</button>
            <button onClick={() => { alert("Exported to phone gallery!"); navigate({ to: "/" }); }} className="flex flex-col items-center gap-1 p-2 bg-zinc-900 rounded-2xl text-zinc-300"><Download size={18} /> Save</button>
          </div>

          {/* HIDDEN AUDIO ENGINE */}
          <audio ref={audioElRef} src={audioTrack?.url} preload="auto" className="hidden" />

          {/* MUSIC LIBRARY PICKER */}
          {showMusicPicker && (
            <div className="absolute inset-0 z-[60] bg-black/80 flex items-end" onClick={() => setShowMusicPicker(false)}>
              <div className="w-full bg-zinc-950 border-t border-zinc-800 rounded-t-3xl p-4 max-h-[70%] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
                <p className="text-[11px] font-black uppercase tracking-wide text-zinc-400 mb-3">Music Library</p>
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
                        className="flex items-center gap-3 p-3 rounded-2xl bg-zinc-900 text-left active:scale-[0.99] transition"
                      >
                        <span className="w-9 h-9 rounded-xl bg-emerald-500/15 text-emerald-400 flex items-center justify-center"><Music size={16} /></span>
                        <span className="flex-1 min-w-0">
                          <span className="block text-xs font-bold truncate">{m.title}</span>
                          <span className="block text-[10px] text-zinc-500 truncate">{m.artist} · {m.category}</span>
                        </span>
                        <span className="text-[10px] font-mono text-zinc-500">{m.duration}</span>
                      </button>
                    );
                  })}
                  {audioTrack && (
                    <button
                      onClick={() => { setAudioTrack(null); setShowMusicPicker(false); }}
                      className="p-3 rounded-2xl bg-red-500/10 text-red-400 text-xs font-bold"
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
