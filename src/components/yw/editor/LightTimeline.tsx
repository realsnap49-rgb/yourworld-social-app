import React, { useEffect, useRef, useState } from "react";
import { Play, Pause, Scissors, Music, Sliders, Sparkles, Type, Trash2, Undo, Redo } from "lucide-react";

export type LightClip = {
  id: string;
  url: string;
  duration?: number;
};

type LightTimelineProps = {
  clips?: LightClip[];
};

export const LightTimeline: React.FC<LightTimelineProps> = ({ clips = [] }) => {
  const [activeClipIndex, setActiveClipIndex] = useState<number>(0);
  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const videoRef = useRef<HTMLVideoElement>(null);

  const currentClip = clips[activeClipIndex] || clips[0];

  const handleVideoEnded = () => {
    if (clips.length > 0) {
      const nextIndex = (activeClipIndex + 1) % clips.length;
      setActiveClipIndex(nextIndex);
      setIsPlaying(true);
    }
  };

  useEffect(() => {
    if (videoRef.current && isPlaying) {
      videoRef.current.play().catch(() => {});
    }
  }, [activeClipIndex]);

  const togglePlay = () => {
    if (videoRef.current) {
      if (isPlaying) {
        videoRef.current.pause();
      } else {
        videoRef.current.play().catch(() => {});
      }
      setIsPlaying(!isPlaying);
    }
  };

  return (
    <div className="flex flex-col h-full bg-black text-white justify-between overflow-hidden">
      {/* 1. Main Video Preview Canvas - TOP ONLY */}
      <div className="relative flex-1 bg-black flex items-center justify-center overflow-hidden min-h-[50vh]" onClick={togglePlay}>
        {currentClip ? (
          <video
            key={currentClip.url || activeClipIndex}
            ref={videoRef}
            src={currentClip.url}
            className="w-full h-full object-cover"
            playsInline
            onEnded={handleVideoEnded}
            onPlay={() => setIsPlaying(true)}
            onPause={() => setIsPlaying(false)}
          />
        ) : (
          <div className="text-gray-500">No Media</div>
        )}
      </div>

      {/* 2. Controls & Tools Area - BOTTOM ONLY */}
      <div className="bg-[#12151a] flex flex-col border-t border-gray-800">
        
        {/* Playhead & Undo/Redo Strip */}
        <div className="px-4 py-2 flex items-center justify-between border-b border-gray-800/60">
          <div className="flex items-center gap-3">
            <button onClick={togglePlay} className="p-2.5 bg-orange-500 rounded-full text-white">
              {isPlaying ? <Pause className="w-4 h-4 fill-current" /> : <Play className="w-4 h-4 ml-0.5 fill-current" />}
            </button>
            <span className="text-xs text-gray-300 font-medium">
              Clip {clips.length > 0 ? activeClipIndex + 1 : 1}/{clips.length || 1}
            </span>
          </div>
          <div className="flex items-center gap-3 text-gray-400">
            <Undo className="w-4 h-4 cursor-pointer hover:text-white" />
            <Redo className="w-4 h-4 cursor-pointer hover:text-white" />
            <Trash2 className="w-4 h-4 cursor-pointer hover:text-red-500" />
          </div>
        </div>

        {/* Professional Tools Menu (Icons below video) */}
        <div className="px-2 py-3 flex justify-around border-b border-gray-800/40">
          <button className="flex flex-col items-center gap-1.5 text-gray-300 text-[10px] hover:text-orange-400">
            <div className="p-2.5 rounded-xl bg-gray-800/80"><Scissors className="w-5 h-5" /></div>
            <span>TRIM</span>
          </button>
          <button className="flex flex-col items-center gap-1.5 text-gray-300 text-[10px] hover:text-orange-400">
            <div className="p-2.5 rounded-xl bg-gray-800/80"><Music className="w-5 h-5" /></div>
            <span>MUSIC</span>
          </button>
          <button className="flex flex-col items-center gap-1.5 text-gray-300 text-[10px] hover:text-orange-400">
            <div className="p-2.5 rounded-xl bg-gray-800/80"><Sliders className="w-5 h-5" /></div>
            <span>FILTER</span>
          </button>
          <button className="flex flex-col items-center gap-1.5 text-gray-300 text-[10px] hover:text-orange-400">
            <div className="p-2.5 rounded-xl bg-gray-800/80"><Sparkles className="w-5 h-5" /></div>
            <span>EFFECT</span>
          </button>
          <button className="flex flex-col items-center gap-1.5 text-gray-300 text-[10px] hover:text-orange-400">
            <div className="p-2.5 rounded-xl bg-gray-800/80"><Type className="w-5 h-5" /></div>
            <span>TEXT</span>
          </button>
        </div>

        {/* Clips Sequence Timeline */}
        <div className="p-3 bg-[#090b0e] flex items-center gap-2 overflow-x-auto scrollbar-none border-t border-gray-800/50">
          {clips.map((clip, index) => (
            <button
              key={clip.id || index}
              onClick={(e) => {
                e.stopPropagation();
                setActiveClipIndex(index);
                setIsPlaying(true);
              }}
              className={`flex-shrink-0 h-14 w-24 rounded-lg border-2 bg-black flex items-end p-1 transition-all ${
                index === activeClipIndex ? "border-orange-500 scale-100 ring-1 ring-orange-500/50" : "border-gray-700 opacity-60"
              }`}
            >
              <span className="text-[10px] font-bold text-white bg-black/60 px-1.5 rounded">#{index + 1}</span>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
};

export default LightTimeline;
