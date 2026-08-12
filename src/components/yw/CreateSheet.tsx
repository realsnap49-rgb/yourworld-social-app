import React from "react";
import { useNavigate } from "@tanstack/react-router";
import { Image, Video, Radio, X } from "lucide-react";

interface CreateSheetProps {
  isOpen: boolean;
  onClose: () => void;
}

export function CreateSheet({ isOpen, onClose }: CreateSheetProps) {
  const navigate = useNavigate();

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/70 backdrop-blur-sm p-4">
      <div className="w-full max-w-md bg-zinc-950 text-white rounded-3xl border border-zinc-800 p-5 flex flex-col gap-4">
        
        <div className="flex items-center justify-between pb-2 border-b border-zinc-800">
          <h2 className="text-lg font-bold">Create</h2>
          <button onClick={onClose} className="p-1 rounded-full bg-zinc-900">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="flex flex-col gap-3">
          <button 
            onClick={() => { onClose(); navigate({ to: "/create" }); }}
            className="flex items-center gap-4 p-4 rounded-2xl bg-zinc-900 border border-zinc-800 text-left"
          >
            <Image className="w-6 h-6 text-purple-400" />
            <div>
              <p className="font-bold text-sm">Post</p>
              <p className="text-xs text-zinc-400">Photo or video for feed</p>
            </div>
          </button>

          <button 
            onClick={() => { onClose(); navigate({ to: "/create" }); }}
            className="flex items-center gap-4 p-4 rounded-2xl bg-zinc-900 border border-zinc-800 text-left"
          >
            <Video className="w-6 h-6 text-pink-400" />
            <div>
              <p className="font-bold text-sm">Reel</p>
              <p className="text-xs text-zinc-400">Short video</p>
            </div>
          </button>
        </div>

      </div>
    </div>
  );
}
