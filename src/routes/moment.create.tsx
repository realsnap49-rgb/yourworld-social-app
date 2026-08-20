import React, { useState, useRef, useEffect } from "react";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import {
  X, RefreshCw, Zap, Music, Image as ImageIcon, Sparkles,
  Moon, Grid3X3, Timer, Crop, Trash2, Download, Star, ChevronRight
} from "lucide-react";

export const Route = createFileRoute("/moment/create")({
  component: MomentCreatePage,
});

export function MomentCreatePage() {
  const navigate = useNavigate();
  const videoRef = useRef<HTMLVideoElement>(null);
  const imageInputRef = useRef<HTMLInputElement>(null);
  const audioInputRef = useRef<HTMLInputElement>(null);

  // States
  const [step, setStep] = useState<0 | 1>(0);
  const [facingMode, setFacingMode] = useState<"user" | "environment">("user");
  const [isFlashOn, setIsFlashOn] = useState(false);
  const [isGridOn, setIsGridOn] = useState(false);
  const [isNightMode, setIsNightMode] = useState(false);
  const [isCropMode, setIsCropMode] = useState(false);
  const [timerSeconds, setTimerSeconds] = useState<number | null>(null);

  const [mediaUrl, setMediaUrl] = useState<string | null>(null);
  const [isVideo, setIsVideo] = useState(false);
  const [selectedAudio, setSelectedAudio] = useState<string | null>(null);
  const [caption, setCaption] = useState("");

  // Snapchat Draggable Text Overlay States
  const [overlayText, setOverlayText] = useState("");
  const [showTextInput, setShowTextInput] = useState(false);
  const [textPos, setTextPos] = useState({ x: 80, y: 220 });
  const [isDraggingText, setIsDraggingText] = useState(false);
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });

  // 1. Live Camera Stream
  useEffect(() => {
    let stream: MediaStream | null = null;
    const startCamera = async () => {
      try {
        stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode, width: { ideal: 1920 }, height: { ideal: 1080 } },
          audio: false,
        });
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
        }
      } catch (err) {
        console.error("Camera access error:", err);
      }
    };
    if (step === 0) startCamera();
    return () => stream?.getTracks().forEach((track) => track.stop());
  }, [facingMode, step]);

  // 2. File Pickers
  const handleMediaUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setIsVideo(file.type.startsWith("video/"));
      setMediaUrl(URL.createObjectURL(file));
      setStep(1);
    }
  };

  const handleAudioUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setSelectedAudio(e.target.files[0].name);
    }
  };

  // 3. Shutter Click Capture with Timer Support
  const capturePhoto = () => {
    if (timerSeconds) {
      setTimeout(() => performSnap(), 3000);
    } else {
      performSnap();
    }
  };

  const performSnap = () => {
  const video = videoRef.current;
  if (!video) return;
  const canvas = document.createElement("canvas");
  canvas.width = video.videoWidth || 1280;
  canvas.height = video.videoHeight || 720;
  const ctx = canvas.getContext("2d");
  if (ctx) {
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
    setMediaUrl(canvas.toDataURL("image/jpeg"));
    setStep(1);
  }
};

  // 4. Touch/Drag Event Handlers for Text
  const handleTouchStart = (e: React.TouchEvent | React.MouseEvent) => {
    setIsDraggingText(true);
    const clientX = "touches" in e ? e.touches[0].clientX : e.clientX;
    const clientY = "touches" in e ? e.touches[0].clientY : e.clientY;
    setDragOffset({ x: clientX - textPos.x, y: clientY - textPos.y });
  };

  const handleTouchMove = (e: React.TouchEvent | React.MouseEvent) => {
    if (!isDraggingText) return;
    const clientX = "touches" in e ? e.touches[0].clientX : e.clientX;
    const clientY = "touches" in e ? e.touches[0].clientY : e.clientY;
    setTextPos({ x: clientX - dragOffset.x, y: clientY - dragOffset.y });
  };

  const handleTouchEnd = () => setIsDraggingText(false);

  // 5. Download Media
  const handleDownload = () => {
    if (!mediaUrl) return;
    const link = document.createElement("a");
    link.href = mediaUrl;
    link.download = `snap-${Date.now()}.${isVideo ? "mp4" : "jpg"}`;
    link.click();
  };

  // 6. Save & Publish to Local Storage / Feed
  const handlePublish = (target: string) => {
    const newMoment = {
      id: Date.now().toString(),
      image: mediaUrl,
      isVideo,
      caption: caption || overlayText,
      audio: selectedAudio,
      privacy: target,
      createdAt: new Date().toISOString(),
    };
    const existing = JSON.parse(localStorage.getItem("yw_moments") || "[]");
    localStorage.setItem("yw_moments", JSON.stringify([newMoment, ...existing]));
    navigate({ to: "/moment" });
  };

  return (
    <div
      className="relative w-full h-screen bg-black overflow-hidden flex flex-col justify-between text-white font-sans select-none"
      onMouseMove={handleTouchMove}
      onMouseUp={handleTouchEnd}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
    >
      {/* Hidden File Inputs */}
      <input type="file" ref={imageInputRef} className="hidden" accept="image/*,video/*" onChange={handleMediaUpload} />
      <input type="file" ref={audioInputRef} className="hidden" accept="audio/*" onChange={handleAudioUpload} />

      {step === 0 ? (
        /* ================= CAMERA SCREEN ================= */
        <div className="relative w-full h-full flex flex-col justify-between">
          
          {/* Live Stream */}
          <video
            ref={videoRef}
            autoPlay
            playsInline
            muted
            className={`absolute inset-0 w-full h-full object-cover z-0 ${
              isNightMode ? "brightness-125 contrast-110" : ""
            }`}
          />

          {/* Grid Overlay */}
          {isGridOn && (
            <div className="absolute inset-0 z-10 grid grid-cols-3 grid-rows-3 pointer-events-none">
              {[...Array(9)].map((_, i) => (
                <div key={i} className="border border-white/20" />
              ))}
            </div>
          )}

          {/* Top Bar */}
          <div className="absolute top-0 w-full p-4 flex justify-between items-center z-20">
            <button
              onClick={() => navigate({ to: ".." })}
              className="bg-black/30 p-2.5 rounded-full backdrop-blur-md active:scale-90 transition"
            >
              <X size={24} />
            </button>
          </div>

          {/* Right Snapchat Vertical Toolbar */}
          <div className="absolute right-3 top-16 z-20 flex flex-col gap-5 bg-black/20 p-2.5 rounded-3xl backdrop-blur-md border border-white/10 text-white/90">
            <button onClick={() => setFacingMode((m) => (m === "user" ? "environment" : "user"))} className="p-1">
              <RefreshCw size={24} />
            </button>
            <button onClick={() => setShowTextInput(!showTextInput)} className="p-1 font-bold text-lg">
              Aa
            </button>
            <button onClick={() => setIsFlashOn(!isFlashOn)} className={`p-1 ${isFlashOn ? "text-yellow-400" : ""}`}>
              <Zap size={24} />
            </button>
            <button onClick={() => audioInputRef.current?.click()} className="p-1">
              <Music size={24} />
            </button>
            <button className="p-1 font-extrabold text-sm border border-white px-1 rounded">HD</button>
            <button onClick={() => setIsNightMode(!isNightMode)} className={`p-1 ${isNightMode ? "text-blue-400" : ""}`}>
              <Moon size={24} />
            </button>
            <button onClick={() => setTimerSeconds(timerSeconds ? null : 3)} className={`p-1 ${timerSeconds ? "text-emerald-400" : ""}`}>
              <Timer size={24} />
            </button>
            <button onClick={() => setIsGridOn(!isGridOn)} className={`p-1 ${isGridOn ? "text-pink-400" : ""}`}>
              <Grid3X3 size={24} />
            </button>
            <button onClick={() => setIsCropMode(!isCropMode)} className={`p-1 ${isCropMode ? "text-indigo-400" : ""}`}>
              <Crop size={24} />
            </button>
          </div>

          {/* Text Input Prompt */}
          {showTextInput && (
            <div className="absolute top-20 left-4 right-20 z-30 bg-black/80 backdrop-blur-md p-2 rounded-2xl border border-white/20">
              <input
                type="text"
                autoFocus
                placeholder="Add text..."
                value={overlayText}
                onChange={(e) => setOverlayText(e.target.value)}
                className="w-full bg-transparent px-3 py-1 text-white focus:outline-none"
              />
            </div>
          )}

          {/* Bottom Controls */}
          <div className="absolute bottom-6 w-full flex items-center justify-around z-20 px-6">
            {/* Memories / Gallery */}
            <button
              onClick={() => imageInputRef.current?.click()}
              className="flex flex-col items-center justify-center bg-black/40 p-3 rounded-2xl backdrop-blur-md border border-white/20 active:scale-90 transition"
            >
              <ImageIcon size={26} />
            </button>

            {/* Snapchat Shutter */}
            <button
              onClick={capturePhoto}
              className="relative flex items-center justify-center w-20 h-20 rounded-full border-4 border-white p-1 active:scale-90 transition shadow-xl shadow-white/20"
            >
              <div className="w-full h-full rounded-full bg-white/30 backdrop-blur-sm border-2 border-white" />
            </button>

            <div className="w-12 h-12" />
          </div>
        </div>
      ) : (
        /* ================= EDITOR SCREEN ================= */
        <div className="relative w-full h-full flex flex-col justify-between p-4 bg-black overflow-hidden">
          
          {/* Render Media Preview */}
          {mediaUrl &&
            (isVideo ? (
              <video src={mediaUrl} autoPlay loop muted playsInline className={`absolute inset-0 w-full h-full object-cover z-0 ${isCropMode ? "scale-90" : ""}`} />
            ) : (
              <img src={mediaUrl} alt="Preview" className={`absolute inset-0 w-full h-full object-cover z-0 ${isCropMode ? "scale-90" : ""}`} />
            ))}

          {/* Draggable Text Overlay Badge */}
          {overlayText && (
            <div
              onMouseDown={handleTouchStart}
              onTouchStart={handleTouchStart}
              style={{ left: `${textPos.x}px`, top: `${textPos.y}px` }}
              className="absolute z-20 cursor-move bg-black/60 backdrop-blur-md px-4 py-2 rounded-2xl text-xl font-bold flex items-center gap-2 touch-none border border-white/20 active:scale-105 transition-transform"
            >
              <span>{overlayText}</span>
              <button onClick={() => setOverlayText("")} className="p-1 hover:text-red-400">
                <Trash2 size={16} />
              </button>
            </div>
          )}

          {/* Top Bar */}
          <div className="flex justify-between items-center z-30 pt-2">
            <button onClick={() => setStep(0)} className="p-2.5 bg-black/50 backdrop-blur-md rounded-full active:scale-90 transition">
              <X size={22} />
            </button>
            {selectedAudio && (
              <div className="flex items-center gap-2 bg-black/60 backdrop-blur-md px-4 py-1.5 rounded-full border border-white/20 text-xs font-semibold">
                <Music size={14} className="text-pink-400 animate-pulse" />
                <span className="max-w-[140px] truncate">{selectedAudio}</span>
              </div>
            )}
          </div>

          {/* Right Toolbar */}
          <div className="absolute right-4 top-20 z-30 flex flex-col gap-3 p-2 rounded-full bg-black/50 backdrop-blur-md border border-white/10 shadow-2xl">
            <button onClick={() => setShowTextInput(!showTextInput)} className="w-10 h-10 rounded-full flex items-center justify-center font-bold">
              Aa
            </button>
            <button onClick={() => audioInputRef.current?.click()} className="w-10 h-10 rounded-full flex items-center justify-center">
              <Music size={20} />
            </button>
            <button onClick={handleDownload} className="w-10 h-10 rounded-full flex items-center justify-center">
              <Download size={20} />
            </button>
          </div>

          {/* Bottom Share Controls */}
          <div className="z-30 flex flex-col gap-3 pb-6">
            <input
              type="text"
              value={caption}
              onChange={(e) => setCaption(e.target.value)}
              placeholder="Add a caption..."
              className="w-full bg-black/60 backdrop-blur-md border border-white/20 rounded-xl px-4 py-3 text-sm text-white placeholder-zinc-400 focus:outline-none"
            />
            <div className="flex items-center justify-between gap-3">
              <button
                onClick={() => handlePublish("everyone")}
                className="flex-1 py-3 px-4 rounded-full bg-black/70 border border-white/20 text-white font-semibold text-xs flex items-center justify-center gap-2 active:scale-95 transition"
              >
                <div className="w-4 h-4 rounded-full bg-blue-500 flex items-center justify-center text-[10px] font-bold">YW</div>
                <span>Your moment</span>
              </button>
              <button
                onClick={() => handlePublish("close_friends")}
                className="flex-1 py-3 px-4 rounded-full bg-black/70 border border-emerald-500/50 text-emerald-400 font-semibold text-xs flex items-center justify-center gap-2 active:scale-95 transition"
              >
                <Star size={14} className="fill-emerald-400 text-emerald-400" />
                <span>Close Friends</span>
              </button>
              <button
                onClick={() => handlePublish("everyone")}
                className="w-12 h-12 rounded-full bg-indigo-600 text-white flex items-center justify-center active:scale-95 transition shadow-lg shadow-indigo-600/40"
              >
                <ChevronRight size={22} />
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
