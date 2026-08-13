import React, { useState, useRef, useEffect } from "react";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { ArrowLeft, Play, Pause, Scissors, Gauge, Volume2, Sparkles, Captions, Trash2, Copy, RotateCw, Music, Type, Smile, Sliders, Download, Undo2, Redo2, Crop, PictureInPicture2 } from "lucide-react";
import { toast } from "sonner";
import { CameraCapture } from "@/components/yw/CameraCapture";
import { LightTimeline } from "@/components/yw/editor/LightTimeline";

export const Route = createFileRoute("/create")({
  head: () => ({
    meta: [{ title: "Camera & Pro Edit Studio - Yourworld" }],
  }),
  component: CreateStudio,
});

function CreateStudio() {
  const navigate = useNavigate();
  const videoRef = useRef<HTMLVideoElement>(null);
  const [clips, setClips] = useState<any[]>([]);
  const [activeClipIndex, setActiveClipIndex] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [playbackRate, setPlaybackRate] = useState(1);

  const currentClip = clips[activeClipIndex];

  // Auto Advance Clips
  const handleVideoEnded = () => {
    if (activeClipIndex < clips.length - 1) {
      setActiveClipIndex((prev) => prev + 1);
    } else {
      setActiveClipIndex(0);
    }
  };

  return (
    <div className="fixed inset-0 z-[99999] bg-black text-white font-sans flex flex-col overflow-hidden select-none">
      {/* Top Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-zinc-800 bg-zinc-950 z-20">
        <button onClick={() => navigate({ to: "/" })} className="p-2 rounded-full hover:bg-zinc-800">
          <ArrowLeft className="w-5 h-5 text-white" />
        </button>
        <span className="text-xs font-bold tracking-widest text-zinc-400">EDIT STUDIO</span>
        <button className="bg-orange-500 text-white font-bold text-xs px-4 py-1.5 rounded-full shadow-lg">SAVE</button>
      </div>

      {/* Main Video Canvas - Full Screen Cover (No White Bars) */}
      <div className="relative flex-1 w-full bg-black flex items-center justify-center overflow-hidden">
        {currentClip ? (
          <video
            ref={videoRef}
            src={currentClip.url}
            className="w-full h-full object-cover"
            playsInline
            playbackRate={playbackRate}
            onTimeUpdate={(e) => setCurrentTime(e.currentTarget.currentTime)}
            onEnded={handleVideoEnded}
          />
        ) : (
          <div className="text-zinc-500 text-sm">No Clip Selected</div>
        )}
      </div>

      {/* Controls & Timeline */}
      <div className="flex flex-col bg-zinc-950 border-t border-zinc-800 z-20">
        {/* Play/Pause & Clip Indicator */}
        <div className="flex items-center justify-between px-4 py-2 border-b border-zinc-900">
          <button
            onClick={() => {
              if (videoRef.current) {
                if (isPlaying) videoRef.current.pause();
                else videoRef.current.play();
                setIsPlaying(!isPlaying);
              }
            }}
            className="w-8 h-8 rounded-full bg-orange-500 flex items-center justify-center text-white"
          >
            {isPlaying ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4 ml-0.5" />}
          </button>
          <span className="text-xs text-zinc-400 font-medium">
            Clip {activeClipIndex + 1}/{clips.length || 1} • {playbackRate}x
          </span>
        </div>

        {/* Timeline Component */}
        <LightTimeline
          clips={clips}
          activeIndex={activeClipIndex}
          currentTime={currentTime}
          onSeek={(t) => {
            if (videoRef.current) {
              videoRef.current.currentTime = t;
              setCurrentTime(t);
            }
          }}
          onSelect={(i) => setActiveClipIndex(i)}
        />
      </div>
    </div>
  );
}
