import React, { useState, useRef, useEffect } from "react";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import {
  ArrowLeft, Play, Pause, Scissors, Gauge, Volume2,
  Sparkles, Captions, Trash2, Copy, RotateCw,
  Music, Type, Smile, Sliders, Download, Undo2, Redo2, Crop,
  PictureInPicture, Plus
} from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/create")({
  component: VideoEditorStudio,
});

interface VideoClip {
  id: string;
  url: string;
  duration: number;
}

function VideoEditorStudio() {
  const navigate = useNavigate();
  const [isPlaying, setIsPlaying] = useState(false);
  const [selectedClipIndex, setSelectedClipIndex] = useState(0);
  const [activeTool, setActiveTool] = useState<string | null>("trim");

  // Multi-clip setup for CapCut / YouCut style testing
  const [clips, setClips] = useState<VideoClip[]>([
    { id: "1", url: "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerBlazes.mp4", duration: 4 },
    { id: "2", url: "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerEscapes.mp4", duration: 5 },
    { id: "3", url: "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerFun.mp4", duration: 3 },
  ]);

  const videoRef = useRef<HTMLVideoElement | null>(null);

  // Play / Pause Fixer
  const togglePlay = () => {
    if (videoRef.current) {
      if (isPlaying) {
        videoRef.current.pause();
      } else {
        videoRef.current.play();
      }
      setIsPlaying(!isPlaying);
    }
  };

  // Instant Pointer Down Fixer (Solves the "Clip Click Not Working" issue on mobile)
  const handleSelectClip = (index: number, e: React.PointerEvent) => {
    e.stopPropagation(); // Prevents horizontal drag scroll from stealing tap event
    setSelectedClipIndex(index);
    if (videoRef.current) {
      videoRef.current.src = clips[index].url;
      videoRef.current.play();
      setIsPlaying(true);
    }
    toast.success(`Clip #${index + 1} Selected`);
  };

  return (
    <div className="flex flex-col h-screen bg-black text-white select-none">
      {/* 1. Original Top Header (Pehle jaisa hi rakha hai) */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-gray-800">
        <button onClick={() => navigate({ to: "/" })} className="p-2 text-gray-300 hover:text-white">
          <ArrowLeft className="w-6 h-6" />
        </button>
        <span className="font-semibold text-sm tracking-wide">EDIT STUDIO</span>
        <button 
          onClick={() => toast.success("Video rendered & saved to gallery!")} 
          className="bg-orange-500 hover:bg-orange-600 text-white font-bold px-4 py-1.5 rounded-full text-xs flex items-center gap-1"
        >
          <Download className="w-4 h-4" /> SAVE
        </button>
      </div>

      {/* 2. Main Video Preview Window */}
      <div className="flex-1 flex items-center justify-center bg-zinc-950 relative overflow-hidden">
        <video
          ref={videoRef}
          src={clips[selectedClipIndex]?.url}
          className="max-h-full max-w-full object-contain"
          playsInline
          onEnded={() => setIsPlaying(false)}
        />
      </div>

      {/* 3. Action Control Bar (Play, Clip counter, Undo/Redo) */}
      <div className="flex items-center justify-between px-6 py-2 bg-zinc-900 border-t border-zinc-800">
        <button onClick={togglePlay} className="p-3 bg-orange-500 rounded-full text-white shadow-lg shadow-orange-500/20">
          {isPlaying ? <Pause className="w-5 h-5" /> : <Play className="w-5 h-5 ml-0.5" />}
        </button>
        <span className="text-xs text-gray-400 font-mono">
          Clip {selectedClipIndex + 1} / {clips.length}
        </span>
        <div className="flex gap-3">
          <button onClick={() => toast("Undo")} className="p-2 text-gray-400 hover:text-white"><Undo2 className="w-5 h-5" /></button>
          <button onClick={() => toast("Redo")} className="p-2 text-gray-400 hover:text-white"><Redo2 className="w-5 h-5" /></button>
        </div>
      </div>

      {/* 4. CapCut / YouCut Editing Tools Menu */}
      <div className="flex items-center gap-6 overflow-x-auto px-4 py-3 bg-zinc-900 border-t border-zinc-800 scrollbar-none">
        {[
          { id: "trim", name: "TRIM", icon: Scissors },
          { id: "speed", name: "SPEED", icon: Gauge },
          { id: "music", name: "MUSIC", icon: Music },
          { id: "filter", name: "FILTER", icon: Sliders },
          { id: "effect", name: "EFFECT", icon: Sparkles },
          { id: "text", name: "TEXT", icon: Type },
          { id: "crop", name: "CROP", icon: Crop },
        ].map((tool) => {
          const Icon = tool.icon;
          const isActive = activeTool === tool.id;
          return (
            <button
              key={tool.id}
              onClick={() => setActiveTool(tool.id)}
              className={`flex flex-col items-center gap-1 min-w-[50px] transition ${
                isActive ? "text-orange-500 scale-105" : "text-gray-400 hover:text-gray-200"
              }`}
            >
              <Icon className="w-5 h-5" />
              <span className="text-[10px] font-semibold">{tool.name}</span>
            </button>
          );
        })}
      </div>

      {/* 5. FIXER: CapCut Style 100% Responsive Single-Tap Timeline */}
      <div className="h-32 bg-zinc-950 p-4 border-t border-zinc-900 flex items-center overflow-x-auto space-x-3 scrollbar-none">
        {clips.map((clip, index) => {
          const isSelected = selectedClipIndex === index;
          return (
            <div
              key={clip.id || index}
              onPointerDown={(e) => handleSelectClip(index, e)}
              className={`relative flex-shrink-0 h-20 w-28 rounded-lg overflow-hidden cursor-pointer transition-all border-2 touch-manipulation ${
                isSelected
                  ? "border-orange-500 scale-105 z-10 shadow-lg shadow-orange-500/30"
                  : "border-zinc-800 opacity-60 hover:opacity-100"
              }`}
              style={{ touchAction: "manipulation" }}
            >
              {/* Thumbnail Display */}
              <div className="absolute inset-0 bg-zinc-900 flex items-center justify-center">
                <span className="text-xs font-bold text-white bg-black/70 px-2 py-1 rounded border border-zinc-700">
                  #{index + 1}
                </span>
              </div>

              {/* CapCut Selection Yellow Borders */}
              {isSelected && (
                <>
                  <div className="absolute left-0 top-0 bottom-0 w-1.5 bg-orange-500 rounded-l" />
                  <div className="absolute right-0 top-0 bottom-0 w-1.5 bg-orange-500 rounded-r" />
                </>
              )}
            </div>
          );
        })}

        <button 
          onClick={() => toast("Add clip clicked")}
          className="flex-shrink-0 h-20 w-16 rounded-lg border-2 border-dashed border-zinc-800 flex items-center justify-center text-gray-500 hover:text-white"
        >
          <Plus className="w-5 h-5" />
        </button>
      </div>
    </div>
  );
}
