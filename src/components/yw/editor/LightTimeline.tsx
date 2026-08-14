import React, { useState, useRef } from "react";
import {
  Scissors, Gauge, Volume2, Sparkles, Type, Sliders, Crop, 
  Copy, Trash2, RotateCw, Play, Pause, Plus, ZoomIn
} from "lucide-react";
import { toast } from "sonner";

interface Clip {
  id: string;
  title: string;
  duration: number;
  thumbnailUrl?: string;
}

interface EditorProps {
  clips?: Clip[];
  onClipSelect?: (index: number) => void;
}

export default function CapCutProTimeline({ clips: initialClips, onClipSelect }: EditorProps) {
  const [selectedClipIndex, setSelectedClipIndex] = useState(0);
  const [activeTool, setActiveTool] = useState<string | null>("trim");
  const [isPlaying, setIsPlaying] = useState(false);

  // Mock clips if none provided from parent
  const clips = initialClips || [
    { id: "1", title: "Clip 1", duration: 4 },
    { id: "2", title: "Clip 2", duration: 5 },
    { id: "3", title: "Clip 3", duration: 3 },
  ];

  // CapCut Style Single-Tap Selection Handler
  const handleClipTap = (index: number, e: React.PointerEvent) => {
    e.stopPropagation(); // Stop timeline drag from blocking clip tap
    setSelectedClipIndex(index);
    if (onClipSelect) onClipSelect(index);
    toast.success(`Clip #${index + 1} Selected`);
  };

  return (
    <div className="w-full bg-zinc-950 text-white flex flex-col border-t border-zinc-800 select-none">
      
      {/* 1. Quick Editing Controls Header */}
      <div className="flex items-center justify-between px-4 py-2 bg-zinc-900/80 border-b border-zinc-800 text-xs">
        <div className="flex items-center gap-3">
          <button 
            onClick={() => setIsPlaying(!isPlaying)}
            className="p-2 bg-orange-500 text-white rounded-full hover:bg-orange-600 transition"
          >
            {isPlaying ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4 ml-0.5" />}
          </button>
          <span className="font-mono text-gray-300">
            Clip {selectedClipIndex + 1} / {clips.length}
          </span>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-3 text-gray-400">
          <button onClick={() => toast("Clip Duplicated")} className="hover:text-white p-1">
            <Copy className="w-4 h-4" />
          </button>
          <button onClick={() => toast("Clip Rotated")} className="hover:text-white p-1">
            <RotateCw className="w-4 h-4" />
          </button>
          <button onClick={() => toast("Clip Deleted")} className="text-red-400 hover:text-red-300 p-1">
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* 2. CapCut & YouCut Feature Toolbar */}
      <div className="flex items-center gap-5 overflow-x-auto px-4 py-3 bg-zinc-900 border-b border-zinc-800 scrollbar-none">
        {[
          { id: "trim", name: "TRIM / CUT", icon: Scissors },
          { id: "speed", name: "SPEED (1x-10x)", icon: Gauge },
          { id: "volume", name: "VOLUME", icon: Volume2 },
          { id: "filter", name: "FILTERS", icon: Sliders },
          { id: "effect", name: "EFFECTS", icon: Sparkles },
          { id: "text", name: "TEXT / STICKER", icon: Type },
          { id: "crop", name: "CROP & ZOOM", icon: Crop },
        ].map((tool) => {
          const Icon = tool.icon;
          const isActive = activeTool === tool.id;
          return (
            <button
              key={tool.id}
              onClick={() => setActiveTool(tool.id)}
              className={`flex flex-col items-center gap-1 min-w-[60px] transition ${
                isActive ? "text-orange-500 scale-105" : "text-gray-400 hover:text-gray-200"
              }`}
            >
              <div className={`p-2 rounded-xl ${isActive ? "bg-orange-500/10 border border-orange-500/30" : "bg-zinc-800"}`}>
                <Icon className="w-5 h-5" />
              </div>
              <span className="text-[10px] font-semibold">{tool.name}</span>
            </button>
          );
        })}
      </div>

      {/* 3. Smooth & Instant Touch Timeline Track */}
      <div className="relative h-28 bg-black p-3 flex items-center overflow-x-auto space-x-3 scrollbar-none">
        {/* Central Playhead Indicator */}
        <div className="absolute left-1/2 top-0 bottom-0 w-0.5 bg-orange-500 z-20 pointer-events-none flex flex-col items-center">
          <div className="w-2 h-2 bg-orange-500 rotate-45 -mt-1" />
        </div>

        {clips.map((clip, index) => {
          const isSelected = selectedClipIndex === index;
          return (
            <div
              key={clip.id || index}
              onPointerDown={(e) => handleClipTap(index, e)}
              className={`relative flex-shrink-0 h-16 w-32 rounded-lg overflow-hidden cursor-pointer transition-all border-2 touch-manipulation ${
                isSelected
                  ? "border-orange-500 scale-105 z-10 shadow-lg shadow-orange-500/30"
                  : "border-zinc-800 opacity-60 hover:opacity-90"
              }`}
              style={{ touchAction: "manipulation" }}
            >
              {/* Thumbnail Background Placeholder */}
              <div className="absolute inset-0 bg-zinc-900 flex items-center justify-center">
                <span className="text-xs font-bold text-white bg-black/70 px-2 py-0.5 rounded border border-zinc-700">
                  #{index + 1}
                </span>
              </div>

              {/* Selection Yellow Handles (CapCut Style) */}
              {isSelected && (
                <>
                  <div className="absolute left-0 top-0 bottom-0 w-2 bg-orange-500 rounded-l" />
                  <div className="absolute right-0 top-0 bottom-0 w-2 bg-orange-500 rounded-r" />
                </>
              )}
            </div>
          );
        })}

        {/* Add Track Button */}
        <button 
          onClick={() => toast("Add new clip")}
          className="flex-shrink-0 h-16 w-16 rounded-lg border-2 border-dashed border-zinc-700 flex items-center justify-center text-gray-500 hover:text-white hover:border-gray-500 transition"
        >
          <Plus className="w-6 h-6" />
        </button>
      </div>

    </div>
  );
}
