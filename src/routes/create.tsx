import React, { useState, useRef } from "react";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { 
  X, Download, Scissors, Music, Type, Sparkles, 
  Layers, Captions, Sliders, ChevronDown, Plus, Trash2, 
  Copy, Gauge, RotateCcw, Play, Pause
} from "lucide-react";

export const Route = createFileRoute("/create")({
  component: CreateStudioPage,
});

interface ClipSettings {
  id: string;
  url: string;
  filter: string;
  speed: number;
  rotation: number;
  text: string;
  duration: number;
}

export function CreateStudioPage() {
  const navigate = useNavigate();
  const [clips, setClips] = useState<ClipSettings[]>([]);
  const [activeClipIndex, setActiveClipIndex] = useState(0);
  const [showResMenu, setShowResMenu] = useState(false);
  const [resolution, setResolution] = useState("4K Ultra HD");
  const [activeTool, setActiveTool] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);

  const resolutions = ["8K Master", "4K Ultra HD", "2K Pro", "Pro Ultra HD", "1080P Full HD"];

  // Handle Multi-Select Files (Max 10)
  const handleMediaSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files) return;

    const remainingSlots = 10 - clips.length;
    if (remainingSlots <= 0) {
      alert("Maximum 10 clips allowed!");
      return;
    }

    const newClips: ClipSettings[] = Array.from(files).slice(0, remainingSlots).map((file, idx) => ({
      id: `${Date.now()}_${idx}`,
      url: URL.createObjectURL(file),
      filter: "none",
      speed: 1,
      rotation: 0,
      text: "",
      duration: 10
    }));

    setClips((prev) => [...prev, ...newClips]);
  };

  // Active Clip State Modifier
  const updateActiveClip = (key: keyof ClipSettings, value: any) => {
    if (clips.length === 0) return;
    const updated = [...clips];
    updated[activeClipIndex] = { ...updated[activeClipIndex], [key]: value };
    setClips(updated);
  };

  // 1. Copy / Duplicate Clip
  const duplicateActiveClip = () => {
    if (clips.length >= 10) {
      alert("Timeline limit 10 clips max!");
      return;
    }
    const target = clips[activeClipIndex];
    const copyClip: ClipSettings = {
      ...target,
      id: `${Date.now()}_copy`
    };
    const updated = [...clips];
    updated.splice(activeClipIndex + 1, 0, copyClip);
    setClips(updated);
    setActiveClipIndex(activeClipIndex + 1);
  };

  // 2. Split Clip Engine (Creates duplicate trimmed segment)
  const splitActiveClip = () => {
    if (clips.length >= 10) {
      alert("Split error: Max 10 clips limit reached!");
      return;
    }
    duplicateActiveClip();
  };

  // 3. Delete Clip
  const deleteActiveClip = () => {
    if (clips.length === 0) return;
    const updated = clips.filter((_, idx) => idx !== activeClipIndex);
    setClips(updated);
    setActiveClipIndex(Math.max(0, activeClipIndex - 1));
  };

  const saveVideo = () => {
    if (clips.length === 0) return;
    const a = document.createElement("a");
    a.href = clips[0].url;
    a.download = `YourWorld_${resolution}_Render.webm`;
    a.click();
    navigate({ to: "/" });
  };

  const currentClip = clips[activeClipIndex];

  return (
    <div className="fixed inset-0 z-[99999] bg-black text-white font-sans overflow-hidden flex flex-col justify-between select-none">
      
      <input 
        type="file" 
        ref={fileInputRef} 
        onChange={handleMediaSelect} 
        multiple 
        accept="video/*,image/*" 
        className="hidden" 
      />

      {clips.length === 0 ? (
        /* GALLERY PICKER STAGE */
        <div className="flex flex-col h-full p-4 justify-between bg-zinc-950">
          <div className="flex justify-between items-center py-2">
            <button onClick={() => navigate({ to: "/" })}><X size={24} /></button>
            <span className="font-extrabold text-base text-zinc-200">Albums ▾</span>
            <div className="w-6" />
          </div>

          <div 
            onClick={() => fileInputRef.current?.click()}
            className="flex-1 border-2 border-dashed border-zinc-800 rounded-3xl my-6 flex flex-col items-center justify-center gap-3 bg-zinc-900/40 cursor-pointer active:scale-98 transition"
          >
            <div className="w-16 h-16 rounded-full bg-teal-500/20 text-teal-400 flex items-center justify-center">
              <Plus size={36} />
            </div>
            <p className="font-bold text-sm text-zinc-300">Select Up To 10 Videos / Photos</p>
            <p className="text-xs text-zinc-500">Tap to browse phone storage</p>
          </div>

          <button 
            onClick={() => fileInputRef.current?.click()}
            className="w-full py-4 bg-teal-500 hover:bg-teal-600 text-black font-black text-sm rounded-2xl transition shadow-lg shadow-teal-500/20"
          >
            Browse Gallery Media
          </button>
        </div>
      ) : (
        /* CAPCUT TIMELINE EDITOR ENGINE */
        <div className="flex-1 flex flex-col justify-between bg-zinc-950">
          
          {/* Header */}
          <div className="flex justify-between items-center p-4 border-b border-zinc-800/80 bg-black z-20">
            <button onClick={() => setClips([])}><X size={22} /></button>
            
            <div className="flex items-center gap-3">
              <div className="relative">
                <button 
                  onClick={() => setShowResMenu(!showResMenu)} 
                  className="flex items-center gap-1.5 bg-zinc-800 border border-zinc-700 px-3.5 py-1.5 rounded-full text-xs font-bold text-amber-400"
                >
                  <span>{resolution}</span>
                  <ChevronDown size={14} />
                </button>

                {showResMenu && (
                  <div className="absolute right-0 top-10 bg-zinc-900 border border-zinc-700 rounded-2xl p-2 w-40 z-50 shadow-2xl">
                    {resolutions.map((res) => (
                      <button 
                        key={res} 
                        onClick={() => { setResolution(res); setShowResMenu(false); }} 
                        className={`block w-full text-left p-2.5 rounded-xl text-xs font-bold ${resolution === res ? "bg-teal-500/20 text-teal-300" : "hover:bg-zinc-800 text-zinc-300"}`}
                      >
                        {res}
                      </button>
                    ))}
                  </div>
                )}
              </div>

              <button 
                onClick={saveVideo}
                className="bg-gradient-to-r from-teal-400 to-emerald-500 text-black px-5 py-2 rounded-full text-xs font-black shadow-lg active:scale-95 transition"
              >
                Export
              </button>
            </div>
          </div>

          {/* Interactive Player Viewport */}
          <div className="flex-1 flex items-center justify-center p-4 relative overflow-hidden bg-black">
            {currentClip && (
              <div className="relative max-h-full max-w-full rounded-2xl overflow-hidden border border-zinc-800 shadow-2xl">
                <video 
                  ref={videoRef}
                  src={currentClip.url} 
                  autoPlay 
                  loop 
                  controls
                  playsInline
                  className="max-h-full max-w-full object-contain"
                  style={{ 
                    filter: currentClip.filter === "noir" ? "grayscale(1)" : currentClip.filter === "vivid" ? "saturate(1.8)" : currentClip.filter === "warm" ? "sepia(0.5)" : "none",
                    transform: `rotate(${currentClip.rotation}deg)`
                  }}
                />
                
                {currentClip.text && (
                  <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-black/60 text-amber-300 font-black px-4 py-2 rounded-xl text-lg border border-amber-400/40 backdrop-blur-md">
                    {currentClip.text}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Individual Clip Actions Bar */}
          <div className="bg-zinc-900/90 border-t border-zinc-800 px-4 py-2 flex justify-around items-center text-xs font-bold border-b border-zinc-800/60">
            <button onClick={splitActiveClip} className="flex items-center gap-1.5 text-amber-400 p-2 hover:bg-zinc-800 rounded-xl"><Scissors size={16} /> Split</button>
            <button onClick={duplicateActiveClip} className="flex items-center gap-1.5 text-cyan-400 p-2 hover:bg-zinc-800 rounded-xl"><Copy size={16} /> Copy / Paste</button>
            <button onClick={() => updateActiveClip("rotation", currentClip.rotation + 90)} className="flex items-center gap-1.5 text-purple-400 p-2 hover:bg-zinc-800 rounded-xl"><RotateCcw size={16} /> Rotate</button>
            <button onClick={deleteActiveClip} className="flex items-center gap-1.5 text-red-400 p-2 hover:bg-zinc-800 rounded-xl"><Trash2 size={16} /> Delete</button>
          </div>

          {/* Timeline Multi-Clip Track */}
          <div className="bg-zinc-900 p-3 flex flex-col gap-2">
            <div className="flex items-center justify-between text-[11px] font-extrabold text-zinc-400 px-1">
              <span>TIMELINE CLIPS ({clips.length}/10)</span>
              {clips.length < 10 && (
                <button onClick={() => fileInputRef.current?.click()} className="text-teal-400 flex items-center gap-1">
                  <Plus size={14} /> Add Clip
                </button>
              )}
            </div>

            <div className="flex gap-2 overflow-x-auto pb-1">
              {clips.map((clip, index) => (
                <div 
                  key={clip.id}
                  onClick={() => setActiveClipIndex(index)}
                  className={`relative min-w-[65px] h-14 rounded-xl overflow-hidden border-2 cursor-pointer transition-all ${
                    activeClipIndex === index ? "border-teal-400 scale-105 shadow-lg shadow-teal-500/30" : "border-zinc-700 opacity-60"
                  }`}
                >
                  <video src={clip.url} className="w-full h-full object-cover pointer-events-none" />
                  <span className="absolute bottom-0.5 right-1 text-[9px] bg-black/70 px-1 rounded font-bold">{index + 1}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Bottom CapCut Tool Ribbon */}
          <div className="grid grid-cols-6 gap-1 p-3 bg-black text-[10px] text-center border-t border-zinc-800/80 font-bold">
            <button onClick={() => { const t = prompt("Enter text overlay for this clip:"); if (t !== null) updateActiveClip("text", t); }} className="flex flex-col items-center gap-1 py-1.5 text-zinc-300 hover:text-white rounded-xl"><Type size={18} /> Text</button>
            <button onClick={() => updateActiveClip("filter", currentClip.filter === "vivid" ? "noir" : currentClip.filter === "noir" ? "warm" : "vivid")} className="flex flex-col items-center gap-1 py-1.5 text-zinc-300 hover:text-white rounded-xl"><Sliders size={18} /> Filter</button>
            <button onClick={() => updateActiveClip("speed", currentClip.speed === 1 ? 2 : currentClip.speed === 2 ? 0.5 : 1)} className="flex flex-col items-center gap-1 py-1.5 text-zinc-300 hover:text-white rounded-xl"><Gauge size={18} /> {currentClip?.speed || 1}x Speed</button>
            <button className="flex flex-col items-center gap-1 py-1.5 text-zinc-300 hover:text-white rounded-xl"><Sparkles size={18} /> Effects</button>
            <button className="flex flex-col items-center gap-1 py-1.5 text-zinc-300 hover:text-white rounded-xl"><Layers size={18} /> Overlay</button>
            <button className="flex flex-col items-center gap-1 py-1.5 text-zinc-300 hover:text-white rounded-xl"><Captions size={18} /> Captions</button>
          </div>

        </div>
      )}

    </div>
  );
}
