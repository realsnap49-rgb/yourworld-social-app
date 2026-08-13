import React, { useState, useRef, useEffect } from "react";
import { X, Play, Pause, Download, Scissors, Trash2, Volume2, Sparkles, Image as ImageIcon } from "lucide-react";

type Clip = {
  id: string;
  url: string;
  duration?: number;
};

type MediaEditorProps = {
  onClose?: () => void;
  media?: { url: string; type: string; name?: string };
  clips?: Clip[];
  onNext?: () => void;
};

export const MediaEditor: React.FC<MediaEditorProps> = ({
  onClose,
  media,
  clips = [],
  onNext
}) => {
  // Combine single media or clips array into one continuous list
  const activeClips: Clip[] = clips.length > 0 
    ? clips 
    : media?.url 
      ? [{ id: "1", url: media.url }] 
      : [];

  const [activeClipIndex, setActiveClipIndex] = useState<number>(0);
  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const [isExporting, setIsExporting] = useState<boolean>(false);

  const videoRef = useRef<HTMLVideoElement>(null);
  const currentClip = activeClips[activeClipIndex] || activeClips[0];

  // 1. Continuous Sequential Playback: Auto-play next clip on end
  const handleVideoEnded = () => {
    if (activeClips.length > 0) {
      const nextIndex = (activeClipIndex + 1) % activeClips.length;
      setActiveClipIndex(nextIndex);
      setIsPlaying(true);
    }
  };

  useEffect(() => {
    if (videoRef.current && isPlaying) {
      videoRef.current.play().catch(() => {});
    }
  }, [activeClipIndex]);

  // Play/Pause Toggle
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

  // Real Save/Export trigger for MP4 download
  const handleSaveAndExport = () => {
    if (!currentClip?.url) return;
    setIsExporting(true);

    try {
      const link = document.createElement("a");
      link.href = currentClip.url;
      link.download = `edited-video-${Date.now()}.mp4`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } catch (err) {
      console.error("Export error:", err);
    } finally {
      setTimeout(() => setIsExporting(false), 1000);
      if (onNext) onNext();
    }
  };

  return (
    <div className="fixed inset-0 bg-black text-white z-50 flex flex-col justify-between">
      {/* Top Navigation Bar */}
      <div className="p-4 flex justify-between items-center bg-gradient-to-b from-black/90 to-transparent z-20">
        <button onClick={onClose} className="p-2 rounded-full bg-white/10 hover:bg-white/20">
          <X className="w-6 h-6" />
        </button>
        <span className="font-semibold text-lg">EDIT</span>
        <button
          onClick={handleSaveAndExport}
          disabled={isExporting}
          className="px-5 py-2 bg-orange-500 hover:bg-orange-600 text-white font-bold rounded-full transition duration-200"
        >
          {isExporting ? "Saving..." : "SAVE"}
        </button>
      </div>

      {/* Main Full-Screen Canvas (object-cover removes side blank/white spaces) */}
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
          <div className="text-gray-400">No media selected</div>
        )}
      </div>

      {/* Bottom Timeline & Controls */}
      <div className="p-4 bg-gradient-to-t from-black via-black/90 to-transparent flex flex-col gap-3 z-20">
        {/* Playhead and Status */}
        <div className="flex items-center justify-between">
          <button onClick={togglePlay} className="p-3 bg-orange-500 rounded-full text-white shadow-lg">
            {isPlaying ? <Pause className="w-5 h-5" /> : <Play className="w-5 h-5 ml-0.5" />}
          </button>
          <span className="text-xs font-mono text-gray-300">
            Clip {activeClips.length > 0 ? activeClipIndex + 1 : 0} / {activeClips.length}
          </span>
        </div>

        {/* Scrollable Clips Timeline */}
        {activeClips.length > 0 && (
          <div className="flex gap-2 overflow-x-auto py-2 scrollbar-none">
            {activeClips.map((clip, index) => (
              <button
                key={clip.id || index}
                onClick={(e) => {
                  e.stopPropagation();
                  setActiveClipIndex(index);
                  setIsPlaying(true);
                }}
                className={`flex-shrink-0 h-16 w-24 rounded-lg border-2 overflow-hidden bg-gray-900 flex flex-col items-center justify-center transition-all ${
                  index === activeClipIndex ? "border-orange-500 scale-105 shadow-md" : "border-transparent opacity-60"
                }`}
              >
                <span className="text-xs font-bold text-white">#{index + 1}</span>
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default MediaEditor;
