import React, { useState, useRef, useEffect } from "react";
import { X, ShieldAlert, Clock, Sparkles, Eye, Check, Download, Archive } from "lucide-react";

type MediaEditorProps = {
  onClose?: () => void;
  media?: { url: string; type: string; name?: string };
  kind?: string;
  onBank?: () => void;
  onNext?: () => void;
};

export const MediaEditor: React.FC<MediaEditorProps> = ({
  onClose,
  media,
  kind,
  onBank,
  onNext
}) => {
  const [privacy, setPrivacy] = useState<"everyone" | "followers" | "close_friends" | "only_me">("everyone");
  const [duration, setDuration] = useState<"12h" | "24h">("24h");
  const [screenshotAlert, setScreenshotAlert] = useState<boolean>(true);
  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const [isExporting, setIsExporting] = useState<boolean>(false);

  const videoRef = useRef<HTMLVideoElement>(null);

  // Play/Pause Toggle with safety check
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

  // Direct Save/Export Logic to trigger real MP4 Download
  const handleSaveAndExport = () => {
    if (!media?.url) return;
    setIsExporting(true);

    try {
      const link = document.createElement("a");
      link.href = media.url;
      link.download = media.name || `edited-video-${Date.now()}.mp4`;
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
      {/* Top Bar */}
      <div className="p-4 flex justify-between items-center bg-gradient-to-b from-black/80 to-transparent z-10">
        <button onClick={onClose} className="p-2 rounded-full bg-white/10 hover:bg-white/20">
          <X className="w-6 h-6" />
        </button>
        <span className="font-semibold text-lg">Edit Media</span>
        <button
          onClick={handleSaveAndExport}
          disabled={isExporting}
          className="px-5 py-2 bg-orange-500 hover:bg-orange-600 text-white font-bold rounded-full transition duration-200"
        >
          {isExporting ? "Saving..." : "SAVE"}
        </button>
      </div>

      {/* Main Video Canvas - Key prop prevents Black Screen / Freezing */}
      <div className="relative flex-1 flex items-center justify-center bg-black overflow-hidden" onClick={togglePlay}>
        {media?.type === "video" || media?.url?.includes(".mp4") ? (
          <video
            key={media?.url || "active-video-canvas"}
            ref={videoRef}
            src={media?.url}
            className="max-h-full max-w-full object-contain rounded-lg"
            playsInline
            loop
            onPlay={() => setIsPlaying(true)}
            onPause={() => setIsPlaying(false)}
          />
        ) : (
          <img src={media?.url} alt="Preview" className="max-h-full max-w-full object-contain" />
        )}
      </div>

      {/* Bottom Controls */}
      <div className="p-4 bg-gradient-to-t from-black/90 to-transparent flex justify-around items-center z-10">
        <button onClick={handleSaveAndExport} className="flex flex-col items-center text-xs gap-1">
          <Download className="w-6 h-6 text-orange-400" />
          <span>Save</span>
        </button>
      </div>
    </div>
  );
};

export default MediaEditor;
