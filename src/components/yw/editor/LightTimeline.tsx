import React from "react";

interface LightTimelineProps {
  clips: any[];
  activeIndex: number;
  currentTime: number;
  onSeek: (time: number) => void;
  onSelect: (index: number) => void;
}

export const LightTimeline: React.FC<LightTimelineProps> = ({
  clips,
  activeIndex,
  currentTime,
  onSeek,
  onSelect,
}) => {
  return (
    <div className="w-full bg-zinc-900 py-3 px-2 overflow-x-auto flex items-center gap-2">
      {clips.map((clip, idx) => (
        <div
          key={idx}
          onClick={() => onSelect(idx)}
          className={`relative h-14 min-w-[70px] rounded-lg border-2 cursor-pointer overflow-hidden flex-shrink-0 ${
            idx === activeIndex ? "border-orange-500" : "border-zinc-700 opacity-60"
          }`}
        >
          <video src={clip.url} className="w-full h-full object-cover pointer-events-none" />
          <span className="absolute bottom-1 left-1 bg-black/70 text-[10px] text-white px-1 rounded">
            #{idx + 1}
          </span>
        </div>
      ))}
    </div>
  );
};
