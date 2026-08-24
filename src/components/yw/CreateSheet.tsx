import React from "react";
import { useNavigate } from "@tanstack/react-router";
import { Video, Radio, Film, X } from "lucide-react";

interface CreateSheetProps {
  isOpen: boolean;
  onClose: () => void;
}

export function CreateSheet({ isOpen, onClose }: CreateSheetProps) {
  const navigate = useNavigate();

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/70 backdrop-blur-sm p-4">
      <div className="w-full max-w-md bg-zinc-950 text-white rounded-3xl border border-zinc-800 p-5 flex flex-col gap-4 animate-in slide-in-from-bottom duration-200">
        
        {/* Header */}
        <div className="flex items-center justify-between pb-2 border-b border-zinc-800">
          <h2 className="text-lg font-bold">Create</h2>
          <button onClick={onClose} className="p-1 rounded-full bg-zinc-900 hover:bg-zinc-800">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Options Grid */}
        <div className="flex flex-col gap-3">

          <button 
            onClick={() => { onClose(); navigate({ to: "/create", search: { mode: "reel" } }); }}
            className="flex items-center gap-4 p-4 rounded-2xl bg-zinc-900/60 hover:bg-zinc-800 border border-zinc-800/50 text-left transition"
          >
            <div className="p-3 rounded-xl bg-zinc-800 text-pink-400">
              <Video className="w-6 h-6" />
            </div>
            <div>
              <p className="font-bold text-sm">Reel</p>
              <p className="text-xs text-zinc-400">Short video</p>
            </div>
          </button>

          <button 
            onClick={() => { onClose(); navigate({ to: "/video/upload" }); }}
            className="flex items-center gap-4 p-4 rounded-2xl bg-zinc-900/60 hover:bg-zinc-800 border border-zinc-800/50 text-left transition"
          >
            <div className="p-3 rounded-xl bg-zinc-800 text-sky-400">
              <Film className="w-6 h-6" />
            </div>
            <div>
              <p className="font-bold text-sm">Long Video</p>
              <p className="text-xs text-zinc-400">Upload horizontal or vertical long-form video</p>
            </div>
          </button>

          <button 
            onClick={() => { onClose(); navigate({ to: "/create" }); }}
            className="flex items-center gap-4 p-4 rounded-2xl bg-zinc-900/60 hover:bg-zinc-800 border border-zinc-800/50 text-left transition"
          >
            <div className="p-3 rounded-xl bg-zinc-800 text-red-500">
              <Radio className="w-6 h-6" />
            </div>
            <div>
              <p className="font-bold text-sm">Live</p>
              <p className="text-xs text-zinc-400">Stream to your world right now</p>
            </div>
          </button>
        </div>

      </div>
    </div>
  );
}
