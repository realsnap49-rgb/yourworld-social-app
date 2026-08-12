import React, { useState, useRef } from "react";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { 
  X, Download, Share2, Scissors, Music, Type, 
  Sparkles, Layers, Captions, Sliders, ChevronDown, 
  Play, Pause, ChevronUp
} from "lucide-react";

export const Route = createFileRoute("/create")({
  component: CreateStudioPage,
});

export function CreateStudioPage() {
  const navigate = useNavigate();
  const [videoUrl, setVideoUrl] = useState<string | null>(null);
  const [showResMenu, setShowResMenu] = useState(false);
  const [resolution, setResolution] = useState("4K Ultra HD");
  
  // Basic States
  const videoRef = useRef<HTMLVideoElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Resolution Options
  const resolutions = ["8K", "4K Ultra HD", "2K", "Pro Ultra HD", "1080P", "720P"];

  return (
    <div className="fixed inset-0 z-[99999] bg-zinc-950 text-white flex flex-col font-sans select-none">
      
      <input type="file" ref={fileInputRef} onChange={(e) => {
        const file = e.target.files?.[0];
        if (file) setVideoUrl(URL.createObjectURL(file));
      }} accept="video/*" className="hidden" />

      {!videoUrl ? (
        /* GALLERY PICKER SCREEN */
        <div className="flex-1 flex flex-col p-4">
          <div className="flex justify-between items-center py-4">
            <button onClick={() => navigate({ to: "/" })}><X size={24} /></button>
            <span className="font-bold text-lg">Albums</span>
            <div className="w-6" />
          </div>
          
          <div className="flex gap-8 mb-6 font-bold text-zinc-500">
            <button className="text-white border-b-2 border-white pb-1">Videos</button>
            <button>Photos</button>
          </div>

          <div className="flex-1 grid grid-cols-3 gap-1 overflow-y-auto">
            {/* Mock Gallery Grid */}
            {[...Array(12)].map((_, i) => (
              <div key={i} onClick={() => fileInputRef.current?.click()} className="aspect-square bg-zinc-800 relative flex items-center justify-center border border-zinc-700">
                <span className="text-[10px] text-zinc-400">00:{10 + i}</span>
              </div>
            ))}
          </div>

          <button onClick={() => fileInputRef.current?.click()} className="w-full py-4 bg-teal-600 rounded-xl font-bold mt-4">Add</button>
        </div>
      ) : (
        /* PRO EDITOR SCREEN */
        <div className="flex-1 flex flex-col">
          {/* Top Bar */}
          <div className="flex justify-between items-center p-4">
            <button onClick={() => setVideoUrl(null)}><X size={24} /></button>
            
            <div className="flex items-center gap-3">
              <div className="relative">
                <button onClick={() => setShowResMenu(!showResMenu)} className="flex items-center gap-1 bg-zinc-800 px-3 py-1.5 rounded-full text-xs font-bold">
                  {resolution} <ChevronDown size={14}/>
                </button>
                {showResMenu && (
                  <div className="absolute right-0 top-10 bg-zinc-900 border border-zinc-700 rounded-xl p-2 w-32 z-50">
                    {resolutions.map(res => (
                      <button key={res} onClick={() => { setResolution(res); setShowResMenu(false); }} className="block w-full text-left p-2 hover:bg-zinc-800 text-xs">{res}</button>
                    ))}
                  </div>
                )}
              </div>
              <button className="bg-gradient-to-r from-pink-500 to-purple-600 px-4 py-1.5 rounded-full text-xs font-bold">Export</button>
            </div>
          </div>

          {/* Video Preview */}
          <div className="flex-1 flex items-center justify-center p-4">
            <video src={videoUrl} controls className="max-h-full rounded-xl border border-zinc-800" />
          </div>

          {/* Timeline & Actions */}
          <div className="h-40 bg-zinc-900 p-4 border-t border-zinc-800">
            <div className="flex gap-4 mb-4">
               <div className="flex items-center gap-2"><div className="w-10 h-10 bg-zinc-800 rounded-lg flex items-center justify-center">🔇</div> <span className="text-xs">Mute</span></div>
               <div className="flex-1 h-10 bg-zinc-800 rounded-lg flex items-center px-4">+ Add Track</div>
            </div>
          </div>

          {/* Bottom Toolbar */}
          <div className="grid grid-cols-7 gap-1 p-2 bg-black text-[10px] text-center border-t border-zinc-800">
            {[
              { icon: Scissors, label: "Edit" },
              { icon: Music, label: "Audio" },
              { icon: Type, label: "Text" },
              { icon: Sparkles, label: "Effects" },
              { icon: Layers, label: "Overlay" },
              { icon: Captions, label: "Captions" },
              { icon: Sliders, label: "Filters" }
            ].map((tool, i) => (
              <button key={i} className="flex flex-col items-center gap-1 py-2 hover:bg-zinc-900 rounded-lg">
                <tool.icon size={20} /> {tool.label}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
