import React, { useEffect, useRef, useState } from "react";
import { Plus, Music, Volume2, VolumeX, Play, Pause, Scissors, Trash2 } from "lucide-react";

export type LightClip = {
  id: string;
  url: string;
  trimStart?: number;
  trimEnd?: number;
  duration?: number;
};

type LightTimelineProps = {
  clips?: LightClip[];
  onClipsChange?: (clips: LightClip[]) => void;
  onSave?: () => void;
};

export const LightTimeline: React.FC<LightTimelineProps> = ({ clips = [], onClipsChange, onSave }) => {
  const [activeClipIndex, setActiveClipIndex] = useState<number>(0);
  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const videoRef = useRef<HTMLVideoElement>(null);

  const currentClip = clips[activeClipIndex] || clips[0];

  // Auto-play next clip sequentially on end
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
    <div className="flex flex-col h-full bg-black text-white">
      {/* Full Width Canvas (object-cover removes left & right white bars) */}
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
          <div className="text-gray-500">No Video Available</div>
        )}
      </div>

      {/* Timeline Controls */}
      <div className="p-4 bg-gray-900 flex flex-col gap-3">
        <div className="flex items-center justify-between">
          <button onClick={togglePlay} className="p-3 bg-orange-500 rounded-full text-white">
            {isPlaying ? <Pause className="w-5 h-5" /> : <Play className="w-5 h-5 ml-0.5" />}
          </button>
          <span className="text-xs text-gray-300 font-mono">
            Clip {clips.length > 0 ? activeClipIndex + 1 : 0} / {clips.length}
          </span>
        </div>

        {/* Scrollable Clips */}
        <div className="flex gap-2 overflow-x-auto py-2">
          {clips.map((clip, index) => (
            <button
              key={clip.id || index}
              onClick={(e) => {
                e.stopPropagation();
                setActiveClipIndex(index);
                setIsPlaying(true);
              }}
              className={`flex-shrink-0 h-16 w-24 rounded border-2 bg-gray-800 flex items-center justify-center text-xs font-bold ${
                index === activeClipIndex ? "border-orange-500 scale-105" : "border-transparent opacity-60"
              }`}
            >
              Clip #{index + 1}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
};

export default LightTimeline;
