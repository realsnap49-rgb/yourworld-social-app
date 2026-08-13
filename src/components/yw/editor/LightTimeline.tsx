import React, { useEffect, useRef, useState } from "react";
import { Play, Pause, Scissors, Music, Sliders, Sparkles, Type, Trash2, Copy, Undo, Redo, Plus } from "lucide-react";

export type LightClip = {
  id: string;
  url: string;
  duration?: number;
};

type LightTimelineProps = {
  clips?: LightClip[];
  onClipsChange?: (clips: LightClip[]) => void;
  onSave?: () => void;
};

export const LightTimeline: React.FC<LightTimelineProps> = ({
  clips = [],
  onClipsChange,
  onSave
}) => {
  const [activeClipIndex, setActiveClipIndex] = useState<number>(0);
  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const videoRef = useRef<HTMLVideoElement>(null);

  const currentClip = clips[activeClipIndex] || clips[0];

  // Sequential continuous playback
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
    <div className="flex flex-col h-screen bg-[#0d0f12] text-white overflow-hidden justify-between">
      {/* Top Main Canvas - Cover mode removes side white bars */}
      <div className="relative flex-1 bg-black flex items-center justify-center overflow-hidden" onClick={togglePlay}>
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

      {/* Control Strip (Play Button & Clip Info) */}
      <div className="bg-[#12151a] px-4 py-2 flex items-center justify-between border-t border-gray-800">
        <div className="flex items-center gap-3">
          <button onClick={togglePlay} className="p-3 bg-orange-500 rounded-full text-white shadow-md">
            {isPlaying ? <Pause className="w-5 h-5 fill-current" /> : <Play className="w-5 h-5 ml-0.5 fill-current" />}
          </button>
          <span className="text-xs text-gray-300 font-medium">
            Clip {clips.length > 0 ? activeClipIndex + 1 : 1}/{clips.length || 1} · 1x
          </span>
        </div>

        <div className="flex items-center gap-3 text-gray-400">
          <Undo className="w-5 h-5 hover:text-white cursor-pointer" />
          <Redo className="w-5 h-5 hover:text-white cursor-pointer" />
          <Copy className="w-5 h-5 hover:text-white cursor-pointer" />
          <Trash2 className="w-5 h-5 hover:text-red-500 cursor-pointer" />
        </div>
      </div>

      {/* Tools Grid Menu */}
      <div className="bg-[#12151a] px-2 py-3 flex justify-around border-t border-gray-800/50">
        <div className="flex flex-col items-center gap-1 text-gray-300 text-[10px]">
          <div className="p-2.5 rounded-xl bg-gray-800/80"><Scissors className="w-5 h-5" /></div>
          <span>TRIM</span>
        </div>
        <div className="flex flex-col items-center gap-1 text-gray-300 text-[10px]">
          <div className="p-2.5 rounded-xl bg-gray-800/80"><Music className="w-5 h-5" /></div>
          <span>MUSIC</span>
        </div>
        <div className="flex flex-col items-center gap-1 text-gray-300 text-[10px]">
          <div className="p-2.5 rounded-xl bg-gray-800/80"><Sliders className="w-5 h-5" /></div>
          <span>FILTER</span>
        </div>
        <div className="flex flex-col items-center gap-1 text-gray-300 text-[10px]">
          <div className="p-2.5 rounded-xl bg-gray-800/80"><Sparkles className="w-5 h-5" /></div>
          <span>EFFECT</span>
        </div>
        <div className="flex flex-col items-center gap-1 text-gray-300 text-[10px]">
          <div className="p-2.5 rounded-xl bg-gray-800/80"><Type className="w-5 h-5" /></div>
          <span>TEXT</span>
        </div>
      </div>

      {/* Bottom Timeline with Orange Clips Sequence */}
      <div className="bg-[#090b0e] p-3 border-t border-gray-800">
        <div className="flex items-center gap-2 overflow-x-auto py-1 scrollbar-none">
          {clips.map((clip, index) => (
            <button
              key={clip.id || index}
              onClick={(e) => {
                e.stopPropagation();
                setActiveClipIndex(index);
                setIsPlaying(true);
              }}
              className={`relative flex-shrink-0 h-16 w-28 rounded-xl border-2 overflow-hidden bg-black flex items-end justify-between p-1 transition-all ${
                index === activeClipIndex ? "border-orange-500 scale-100 ring-2 ring-orange-500/30" : "border-gray-700 opacity-60"
              }`}
            >
              <span className="text-[10px] font-bold bg-black/60 px-1 rounded text-white">#{index + 1}</span>
            </button>
          ))}
          <button className="flex-shrink-0 h-16 w-12 rounded-xl border-2 border-dashed border-gray-700 flex items-center justify-center bg-gray-900/50 text-gray-400">
            <Plus className="w-5 h-5" />
          </button>
        </div>
      </div>
    </div>
  );
};

export default LightTimeline;
