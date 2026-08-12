import React, { useState, useRef } from "react";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { 
  X, Download, Scissors, Music, Type, 
  Sparkles, Layers, Captions, Sliders, ChevronDown, 
  Play, Pause, Plus, Trash2, CheckCircle2
} from "lucide-react";

export const Route = createFileRoute("/create")({
  component: CreateStudioPage,
});

export function CreateStudioPage() {
  const navigate = useNavigate();
  const [selectedMedia, setSelectedMedia] = useState<string[]>([]);
  const [currentClipIndex, setCurrentClipIndex] = useState(0);
  const [showResMenu, setShowResMenu] = useState(false);
  const [resolution, setResolution] = useState("4K Ultra HD");
  
  const videoRef = useRef<HTMLVideoElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const resolutions = ["8K Master", "4K Ultra HD", "2K Pro", "Pro Ultra HD", "1080P Full HD", "720P HD"];

  // Logic: Max 10 media clips limit
  const handleMediaSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files) return;

    const currentCount = selectedMedia.length;
    const remainingSlots = 10 - currentCount;

    if (remainingSlots <= 0) {
      alert("Limit Reached: Aap ek baar me maximum 10 clips hi add kar sakte hain.");
      return;
    }

    const filesToProcess = Array.from(files).slice(0, remainingSlots);
    
    if (files.length > remainingSlots) {
      alert(`Limit Reached: Sirf ${remainingSlots} clips aur add ho sakti hain.`);
    }

    const newMediaUrls = filesToProcess.map((file) => URL.createObjectURL(file));
    setSelectedMedia((prev) => [...prev, ...newMediaUrls]);
  };

  const removeClip = (index: number) => {
    const updated = selectedMedia.filter((_, i) => i !== index);
    setSelectedMedia(updated);
    if (currentClipIndex >= updated.length) {
      setCurrentClipIndex(Math.max(0, updated.length - 1));
    }
  };

  const saveVideo = () => {
    if (selectedMedia.length === 0) return;
    const a = document.createElement("a");
    a.href = selectedMedia[0];
    a.download = `YourWorld_${resolution}_Export.webm`;
    a.click();
    navigate({ to: "/" });
  };

  return (
    <div className="fixed inset-0 z-[99999] bg-zinc-950 text-white flex flex-col font-sans select-none overflow-hidden">
      
      <input 
        type="file" 
        ref={fileInputRef} 
        onChange={handleMediaSelect} 
        accept="video/*,image/*" 
        multiple
        className="hidden" 
      />

      {selectedMedia.length === 0 ? (
        /* GALLERY PICKER SCREEN */
        <div className="flex-1 flex flex-col justify-between p-4 bg-black">
          <div>
            <div className="flex justify-between items-center py-4">
              <button onClick={() => navigate({ to: "/" })}><X size={24} /></button>
              <span className="font-extrabold text-lg">Albums ▾</span>
              <div className="w-6" />
            </div>
            
            <div className="flex gap-8 mb-6 font-bold text-zinc-400 text-sm">
              <button className="text-teal-400 border-b-2 border-teal-400 pb-1">Videos & Photos</button>
            </div>

            <div 
              onClick={() => fileInputRef.current?.click()}
              className="w-full h-72 rounded-3xl border-2 border-dashed border-zinc-700 bg-zinc-900/60 flex flex-col items-center justify-center gap-3 cursor-pointer hover:border-teal-500 transition active:scale-98"
            >
              <div className="w-16 h-16 rounded-full bg-teal-500/20 text-teal-400 flex items-center justify-center">
                <Plus size={32} />
              </div>
              <p className="font-bold text-sm text-zinc-300">Tap to Select Media</p>
              <p className="text-xs text-zinc-500">Max 10 clips only</p>
            </div>
          </div>

          <button 
            onClick={() => fileInputRef.current?.click()} 
            className="w-full py-4 bg-teal-500 hover:bg-teal-600 text-black font-black text-base rounded-2xl transition active:scale-95 shadow-lg shadow-teal-500/20"
          >
            Choose Files From Gallery ({selectedMedia.length}/10)
          </button>
        </div>
      ) : (
        /* PRO MULTI-CLIP CAPCUT EDITOR SCREEN */
        <div className="flex-1 flex flex-col justify-between">
          
          <div className="flex justify-between items-center p-4 border-b border-zinc-800/80 bg-black z-20">
            <button onClick={() => setSelectedMedia([])}><X size={22} /></button>
            
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
                Save
              </button>
            </div>
          </div>

          <div className="flex-1 flex items-center justify-center p-4 relative bg-zinc-950">
            <video 
              ref={videoRef}
              src={selectedMedia[currentClipIndex]} 
              autoPlay 
              loop 
              controls
              playsInline
              className="max-h-full max-w-full rounded-2xl border border-zinc-800 shadow-2xl" 
            />
          </div>

          <div className="bg-zinc-900/90 border-t border-zinc-800 p-4 flex flex-col gap-3">
            <div className="flex items-center justify-between text-xs font-bold text-zinc-400 px-1">
              <span>SELECTED CLIPS ({selectedMedia.length}/10)</span>
              {selectedMedia.length < 10 && (
                <button onClick={() => fileInputRef.current?.click()} className="text-teal-400 flex items-center gap-1">
                  <Plus size={14} /> Add
                </button>
              )}
            </div>

            <div className="flex gap-2 overflow-x-auto pb-2">
              {selectedMedia.map((url, index) => (
                <div 
                  key={index} 
                  onClick={() => setCurrentClipIndex(index)}
                  className={`relative min-w-[70px] h-16 rounded-xl overflow-hidden border-2 cursor-pointer transition-all ${
                    currentClipIndex === index ? "border-teal-400 scale-105 shadow-lg shadow-teal-500/20" : "border-zinc-700 opacity-60"
                  }`}
                >
                  <video src={url} className="w-full h-full object-cover pointer-events-none" />
                  <button 
                    onClick={(e) => { e.stopPropagation(); removeClip(index); }} 
                    className="absolute top-1 right-1 p-1 bg-black/70 rounded-full text-red-400"
                  >
                    <Trash2 size={10} />
                  </button>
                </div>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-7 gap-1 p-3 bg-black text-[10px] text-center border-t border-zinc-800/80 font-bold">
            {[
              { icon: Scissors, label: "Edit" },
              { icon: Music, label: "Audio" },
              { icon: Type, label: "Text" },
              { icon: Sparkles, label: "Effects" },
              { icon: Layers, label: "Overlay" },
              { icon: Captions, label: "Captions" },
              { icon: Sliders, label: "Filters" }
            ].map((tool, i) => (
              <button key={i} className="flex flex-col items-center gap-1.5 py-2 text-zinc-300 hover:text-white hover:bg-zinc-900 rounded-xl transition">
                <tool.icon size={18} /> {tool.label}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
