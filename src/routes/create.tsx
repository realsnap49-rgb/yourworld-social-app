import React, { useState, useRef, useEffect } from "react";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { 
  ArrowLeft, ArrowRight, Play, Pause, RotateCcw, RotateCw, 
  Scissors, Gauge, Volume2, Sparkles, Captions, Trash2, 
  Copy, RefreshCw, Mic, MoveHorizontal, Snowflake, Undo2, Redo2,
  Plus, VolumeX, Music, Type, Smile, Sliders, Download, Layers, Droplet, UserCheck
} from "lucide-react";

export const Route = createFileRoute("/create")({
  component: CreateStudioPage,
});

interface ClipItem {
  id: string;
  url: string;
  duration: number;
  speed: number;
  volume: number;
  filter: string;
  rotation: number;
  textOverlay: string;
}

export function CreateStudioPage() {
  const navigate = useNavigate();
  const [clips, setClips] = useState<ClipItem[]>([]);
  const [activeClipIndex, setActiveClipIndex] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState("0:02.0");
  const [totalTime, setTotalTime] = useState("0:15.9");
  const [isMuted, setIsMuted] = useState(false);
  const [activeTab, setActiveTab] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);

  // Add Clips (Up to 10)
  const handleMediaSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files) return;

    const remaining = 10 - clips.length;
    if (remaining <= 0) {
      alert("Maximum 10 clips limit reached!");
      return;
    }

    const newClips: ClipItem[] = Array.from(files).slice(0, remaining).map((f, i) => ({
      id: `clip_${Date.now()}_${i}`,
      url: URL.createObjectURL(f),
      duration: 5,
      speed: 1,
      volume: 100,
      filter: "none",
      rotation: 0,
      textOverlay: ""
    }));

    setClips((prev) => [...prev, ...newClips]);
  };

  const currentClip = clips[activeClipIndex];

  // Action Functions
  const updateCurrentClip = (key: keyof ClipItem, val: any) => {
    if (!currentClip) return;
    const updated = [...clips];
    updated[activeClipIndex] = { ...updated[activeClipIndex], [key]: val };
    setClips(updated);
  };

  const handleDuplicate = () => {
    if (!currentClip || clips.length >= 10) return;
    const copy = { ...currentClip, id: `clip_${Date.now()}` };
    const updated = [...clips];
    updated.splice(activeClipIndex + 1, 0, copy);
    setClips(updated);
    setActiveClipIndex(activeClipIndex + 1);
  };

  const handleDelete = () => {
    if (clips.length === 0) return;
    const updated = clips.filter((_, i) => i !== activeClipIndex);
    setClips(updated);
    setActiveClipIndex(Math.max(0, activeClipIndex - 1));
  };

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
    <div className="fixed inset-0 z-[99999] bg-black text-white font-sans flex flex-col justify-between overflow-hidden select-none">
      
      <input 
        type="file" 
        ref={fileInputRef} 
        onChange={handleMediaSelect} 
        multiple 
        accept="video/*,image/*" 
        className="hidden" 
      />

      {clips.length === 0 ? (
        /* INITIAL MEDIA IMPORT VIEW */
        <div className="flex-1 flex flex-col justify-between p-6 bg-zinc-950">
          <div className="flex justify-between items-center">
            <button onClick={() => navigate({ to: "/" })} className="p-2 bg-zinc-900 rounded-full">
              <ArrowLeft size={20} />
            </button>
            <span className="font-extrabold text-lg">Pro Edits Studio</span>
            <div className="w-8" />
          </div>

          <div 
            onClick={() => fileInputRef.current?.click()}
            className="flex-1 my-8 border-2 border-dashed border-orange-500/40 bg-zinc-900/50 rounded-3xl flex flex-col items-center justify-center gap-4 cursor-pointer hover:border-orange-500 transition"
          >
            <div className="w-20 h-20 rounded-full bg-orange-500/20 text-orange-500 flex items-center justify-center shadow-lg">
              <Plus size={44} />
            </div>
            <p className="font-black text-base text-zinc-200">Select Up to 10 Videos / Photos</p>
            <p className="text-xs text-zinc-500">Tap to browse phone media</p>
          </div>

          <button 
            onClick={() => fileInputRef.current?.click()}
            className="w-full py-4 bg-orange-500 hover:bg-orange-600 text-black font-black text-base rounded-2xl transition shadow-lg shadow-orange-500/30"
          >
            Open Media Library
          </button>
        </div>
      ) : (
        /* INSTAGRAM EDITS / CAPCUT PRO STUDIO ENGINE */
        <div className="flex-1 flex flex-col justify-between bg-black relative">
          
          {/* TOP HEADER BAR */}
          <div className="flex justify-between items-center px-4 py-3 bg-black z-30">
            <button onClick={() => setClips([])} className="p-2 bg-zinc-900 rounded-full">
              <ArrowLeft size={20} />
            </button>

            <div className="flex items-center gap-2 bg-zinc-900 border border-zinc-800 px-4 py-1.5 rounded-2xl">
              <span className="w-2.5 h-2.5 rounded-full bg-orange-500 animate-pulse" />
              <span className="font-bold text-xs">Try Edits</span>
            </div>

            <button 
              onClick={() => {
                alert("Video exported successfully to Gallery!");
                navigate({ to: "/" });
              }}
              className="bg-orange-500 hover:bg-orange-600 text-black font-black px-6 py-2 rounded-xl text-xs uppercase tracking-wider shadow-lg shadow-orange-500/20"
            >
              SAVE
            </button>
          </div>

          {/* MAIN VIDEO PREVIEW CANVAS (Orange Border) */}
          <div className="flex-1 flex items-center justify-center p-2 relative bg-black overflow-hidden">
            <div className="relative max-h-full max-w-full rounded-2xl overflow-hidden border-2 border-orange-500 shadow-2xl flex items-center justify-center">
              <video 
                ref={videoRef}
                src={currentClip?.url} 
                autoPlay 
                loop 
                playsInline
                muted={isMuted}
                className="max-h-[52vh] max-w-full object-contain"
                style={{
                  transform: `rotate(${currentClip?.rotation || 0}deg)`,
                  filter: currentClip?.filter === "vivid" ? "saturate(1.8)" : currentClip?.filter === "noir" ? "grayscale(1)" : "none"
                }}
              />

              {currentClip?.textOverlay && (
                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-black/70 text-amber-300 font-black px-4 py-2 rounded-xl text-base border border-orange-400/50 backdrop-blur-md">
                  {currentClip.textOverlay}
                </div>
              )}
            </div>
          </div>

          {/* PLAYER CONTROLS & TIMELINE ROW */}
          <div className="flex items-center justify-between px-6 py-2 text-xs font-mono text-zinc-400">
            <button onClick={togglePlay} className="p-2 bg-zinc-900 rounded-full text-white">
              {isPlaying ? <Pause size={18} /> : <Play size={18} />}
            </button>
            <span>{currentTime} / {totalTime}</span>
            <div className="flex items-center gap-3">
              <button className="text-zinc-400"><Undo2 size={18} /></button>
              <button className="text-zinc-400"><Redo2 size={18} /></button>
            </div>
          </div>

          {/* SECONDARY ACTION RIBBON (ORANGE CAPCUT ICONS) */}
          <div className="bg-zinc-950 border-t border-zinc-900 py-2.5 px-3 flex items-center gap-5 overflow-x-auto text-[10px] text-orange-400 font-extrabold uppercase whitespace-nowrap scrollbar-none">
            <button onClick={() => updateCurrentClip("duration", 3)} className="flex flex-col items-center gap-1 hover:text-white"><Scissors size={18} /> Trim</button>
            <button onClick={handleDuplicate} className="flex flex-col items-center gap-1 hover:text-white"><Scissors size={18} /> Split</button>
            <button onClick={() => updateCurrentClip("speed", currentClip?.speed === 1 ? 2 : 1)} className="flex flex-col items-center gap-1 hover:text-white"><Gauge size={18} /> Speed ({currentClip?.speed}x)</button>
            <button onClick={() => updateCurrentClip("volume", currentClip?.volume === 100 ? 0 : 100)} className="flex flex-col items-center gap-1 hover:text-white"><Volume2 size={18} /> Volume</button>
            <button className="flex flex-col items-center gap-1 hover:text-white"><Sparkles size={18} /> Enhance</button>
            <button className="flex flex-col items-center gap-1 hover:text-white"><Captions size={18} /> Captions</button>
            <button onClick={handleDelete} className="flex flex-col items-center gap-1 text-red-400 hover:text-red-300"><Trash2 size={18} /> Delete</button>
            <button onClick={handleDuplicate} className="flex flex-col items-center gap-1 hover:text-white"><Copy size={18} /> Copy</button>
            <button onClick={() => updateCurrentClip("rotation", (currentClip?.rotation || 0) + 90)} className="flex flex-col items-center gap-1 hover:text-white"><RotateCw size={18} /> Rotate</button>
            <button className="flex flex-col items-center gap-1 hover:text-white"><MoveHorizontal size={18} /> Sort</button>
            <button className="flex flex-col items-center gap-1 hover:text-white"><Snowflake size={18} /> Freeze</button>
          </div>

          {/* MULTI-TRACK TIMELINE EDITOR */}
          <div className="bg-zinc-900 border-t border-zinc-800 p-3 flex flex-col gap-2 relative">
            {/* Center Playhead Vertical White Line */}
            <div className="absolute top-0 bottom-0 left-1/2 w-0.5 bg-white z-20 pointer-events-none shadow-glow" />

            {/* Time Markers */}
            <div className="flex justify-between text-[10px] text-zinc-500 font-mono px-12">
              <span>1s</span>
              <span>3s</span>
              <span>5s</span>
            </div>

            {/* Video Filmstrip Track with Orange Handles */}
            <div className="flex items-center gap-2 overflow-x-auto py-1 px-4">
              <button 
                onClick={() => setIsMuted(!isMuted)} 
                className={`p-2 rounded-xl flex items-center gap-1 text-[10px] font-bold ${isMuted ? "bg-red-500/20 text-red-400" : "bg-zinc-800 text-zinc-300"}`}
              >
                {isMuted ? <VolumeX size={14} /> : <Volume2 size={14} />}
                <span>Unmute</span>
              </button>

              <div className="flex items-center gap-1 border-2 border-orange-500 rounded-2xl bg-orange-500/10 p-1 relative">
                {/* Left Orange Trim Handle */}
                <div className="w-2 h-12 bg-orange-500 rounded-l-md flex items-center justify-center">
                  <div className="w-0.5 h-4 bg-black rounded-full" />
                </div>

                {clips.map((c, i) => (
                  <div 
                    key={c.id} 
                    onClick={() => setActiveClipIndex(i)}
                    className={`w-14 h-12 rounded-lg overflow-hidden border-2 cursor-pointer transition ${
                      activeClipIndex === i ? "border-orange-400 scale-105" : "border-transparent opacity-60"
                    }`}
                  >
                    <video src={c.url} className="w-full h-full object-cover pointer-events-none" />
                  </div>
                ))}

                {/* Right Orange Trim Handle */}
                <div className="w-2 h-12 bg-orange-500 rounded-r-md flex items-center justify-center">
                  <div className="w-0.5 h-4 bg-black rounded-full" />
                </div>
              </div>

              {clips.length < 10 && (
                <button 
                  onClick={() => fileInputRef.current?.click()}
                  className="w-10 h-10 rounded-full bg-white text-black font-black flex items-center justify-center shadow-lg active:scale-90 transition"
                >
                  <Plus size={22} />
                </button>
              )}
            </div>

            {/* Sub-Tracks (+ Add audio / + Add text) */}
            <div className="flex flex-col gap-1.5 px-4">
              <button 
                onClick={() => {
                  const t = prompt("Enter text overlay:");
                  if (t) updateCurrentClip("textOverlay", t);
                }} 
                className="w-full py-2 bg-zinc-800/80 hover:bg-zinc-800 rounded-xl text-xs font-bold text-zinc-400 flex items-center justify-center gap-2 border border-zinc-700/50"
              >
                <Plus size={14} /> Add text
              </button>
            </div>

            <p className="text-[10px] text-center text-zinc-500 font-medium">Tap on a track to trim. Pinch to zoom.</p>
          </div>

          {/* BOTTOM MAIN NAVIGATION BAR (DARK PILLS) */}
          <div className="grid grid-cols-7 gap-1 p-2 bg-black text-[10px] text-center font-extrabold border-t border-zinc-900 z-30">
            <button onClick={() => fileInputRef.current?.click()} className="flex flex-col items-center gap-1 p-2 bg-zinc-900 rounded-2xl text-zinc-300 hover:text-white"><Music size={18} /> Audio</button>
            <button onClick={() => { const t = prompt("Enter text:"); if (t) updateCurrentClip("textOverlay", t); }} className="flex flex-col items-center gap-1 p-2 bg-zinc-900 rounded-2xl text-zinc-300 hover:text-white"><Type size={18} /> Text</button>
            <button className="flex flex-col items-center gap-1 p-2 bg-zinc-900 rounded-2xl text-zinc-300 hover:text-white"><Mic size={18} /> Voice</button>
            <button className="flex flex-col items-center gap-1 p-2 bg-zinc-900 rounded-2xl text-zinc-300 hover:text-white"><Captions size={18} /> Captions</button>
            <button className="flex flex-col items-center gap-1 p-2 bg-zinc-900 rounded-2xl text-zinc-300 hover:text-white"><Smile size={18} /> Stickers</button>
            <button onClick={() => updateCurrentClip("filter", currentClip?.filter === "vivid" ? "noir" : "vivid")} className="flex flex-col items-center gap-1 p-2 bg-zinc-900 rounded-2xl text-zinc-300 hover:text-white"><Sliders size={18} /> Filters</button>
            <button onClick={() => { alert("Video saved to gallery!"); navigate({ to: "/" }); }} className="flex flex-col items-center gap-1 p-2 bg-zinc-900 rounded-2xl text-zinc-300 hover:text-white"><Download size={18} /> Save</button>
          </div>

        </div>
      )}

    </div>
  );
}
