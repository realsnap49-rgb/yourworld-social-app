import React, { useState, useEffect, useRef } from "react";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { 
  X, 
  RefreshCw, 
  Zap, 
  ZapOff, 
  Image as ImageIcon, 
  Music, 
  Clock, 
  Sparkles, 
  ChevronRight,
  Type,
  Crop,
  ZoomIn,
  RotateCw,
  Wand2,
  Download
} from "lucide-react";

export const Route = createFileRoute("/create")({
  component: CreateStudioPage,
});

type Mode = "POST" | "REEL" | "LIVE";

export function CreateStudioPage() {
  const navigate = useNavigate();
  const [activeMode, setActiveMode] = useState<Mode>("REEL");
  const [flash, setFlash] = useState(false);
  const [facingMode, setFacingMode] = useState<"user" | "environment">("user");
  const [isRecording, setIsRecording] = useState(false);
  const [recordProgress, setRecordProgress] = useState(0);
  const [showEditor, setShowEditor] = useState(false);
  const [videoUrl, setVideoUrl] = useState<string | null>(null);

  // Editor States
  const [scale, setScale] = useState(1);
  const [rotation, setRotation] = useState(0);
  const [aspectRatio, setAspectRatio] = useState("9:16");
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const dragStartRef = useRef({ x: 0, y: 0 });

  const videoRef = useRef<HTMLVideoElement | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  // Camera Setup
  useEffect(() => {
    let stream: MediaStream | null = null;
    if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
      navigator.mediaDevices.getUserMedia({ 
        video: { facingMode: facingMode, width: { ideal: 1280 }, height: { ideal: 720 } }, 
        audio: true 
      })
      .then((s) => {
        stream = s;
        if (videoRef.current) {
          videoRef.current.srcObject = s;
          videoRef.current.play().catch(() => {});
        }
      })
      .catch((err) => console.error("Camera error:", err));
    }

    return () => {
      if (stream) {
        stream.getTracks().forEach((track) => track.stop());
      }
    };
  }, [facingMode, showEditor]);

  // Flip Camera Front / Back
  const toggleCameraFacing = () => {
    setFacingMode((prev) => (prev === "user" ? "environment" : "user"));
  };

  // Recording Logic
  const toggleRecording = () => {
    if (!isRecording) {
      const stream = (videoRef.current?.srcObject as MediaStream);
      if (!stream) return;
      mediaRecorderRef.current = new MediaRecorder(stream);
      chunksRef.current = [];
      mediaRecorderRef.current.ondataavailable = (e) => chunksRef.current.push(e.data);
      mediaRecorderRef.current.onstop = () => {
        const blob = new Blob(chunksRef.current, { type: "video/webm" });
        setVideoUrl(URL.createObjectURL(blob));
        setShowEditor(true);
      };
      mediaRecorderRef.current.start();
      setIsRecording(true);
    } else {
      mediaRecorderRef.current?.stop();
      setIsRecording(false);
    }
  };

  useEffect(() => {
    let interval: any;
    if (isRecording) {
      interval = setInterval(() => {
        setRecordProgress((prev) => {
          if (prev >= 100) {
            toggleRecording();
            return 0;
          }
          return prev + 1;
        });
      }, 150);
    } else {
      setRecordProgress(0);
    }
    return () => clearInterval(interval);
  }, [isRecording]);

  const handleSaveVideo = () => {
    if (!videoUrl) return;
    const a = document.createElement("a");
    a.href = videoUrl;
    a.download = "my-creation.webm";
    a.click();
    alert("Saved to Gallery!");
    navigate({ to: "/" });
  };

  return (
    // fixed inset-0 z-[9999] forces full screen over all global layout navbars
    <div className="fixed inset-0 z-[9999] bg-black text-white flex flex-col justify-between select-none overflow-hidden font-sans">
      
      <input 
        type="file" 
        ref={fileInputRef} 
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) {
            setVideoUrl(URL.createObjectURL(file));
            setShowEditor(true);
          }
        }} 
        accept="image/*,video/*" 
        className="hidden" 
      />

      {!showEditor && (
        <>
          {/* Progress Bar */}
          {activeMode === "REEL" && (
            <div className="absolute top-0 left-0 right-0 z-30 h-1.5 bg-white/20">
              <div 
                className="h-full bg-gradient-to-r from-pink-500 via-purple-600 to-amber-500 transition-all duration-150"
                style={{ width: `${recordProgress}%` }}
              />
            </div>
          )}

          {/* Header Controls */}
          <div className="flex items-center justify-between p-4 z-20 bg-gradient-to-b from-black/80 via-black/40 to-transparent pt-6">
            <button 
              onClick={() => navigate({ to: "/" })} 
              className="p-2.5 rounded-full bg-black/40 backdrop-blur-xl border border-white/10 hover:bg-black/60 transition active:scale-90"
            >
              <X className="w-5 h-5 text-white" />
            </button>

            <button 
              className="flex items-center gap-2 px-4 py-1.5 rounded-full bg-black/50 backdrop-blur-xl border border-white/15 text-xs font-semibold"
            >
              <Music className="w-3.5 h-3.5 text-pink-400 animate-pulse" />
              <span>Add Sound</span>
            </button>

            <div className="flex items-center gap-2">
              <button 
                onClick={() => setFlash(!flash)} 
                className={`p-2.5 rounded-full backdrop-blur-xl border transition active:scale-90 ${
                  flash ? "bg-amber-400 text-black border-amber-300" : "bg-black/40 text-white border-white/10"
                }`}
              >
                {flash ? <Zap className="w-4 h-4 fill-current" /> : <ZapOff className="w-4 h-4" />}
              </button>

              {/* CAMERA FLIP BUTTON (Back/Front Camera Switch) */}
              <button 
                onClick={toggleCameraFacing} 
                className="p-2.5 rounded-full bg-black/40 backdrop-blur-xl border border-white/10 text-white active:scale-90 transition hover:bg-black/60"
                title="Switch Camera"
              >
                <RefreshCw className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Side Toolbar */}
          <div className="absolute left-3 top-20 z-20 flex flex-col gap-3 bg-black/40 backdrop-blur-md p-1.5 rounded-full border border-white/10 shadow-xl">
            <button className="p-2 rounded-full text-white/80"><Sparkles className="w-4 h-4 text-amber-300" /></button>
            <button className="p-2 rounded-full text-white/80"><Wand2 className="w-4 h-4 text-purple-400" /></button>
            <button className="p-2 rounded-full text-white/80"><Clock className="w-4 h-4 text-emerald-400" /></button>
          </div>

          {/* Live Camera Viewport */}
          <div className="absolute inset-0 bg-black z-0 flex items-center justify-center overflow-hidden">
            <video 
              ref={videoRef} 
              autoPlay 
              playsInline 
              muted 
              className="w-full h-full object-cover"
            />
          </div>

          {/* Shutter Bottom Controls */}
          <div className="flex flex-col items-center gap-5 pb-8 z-20 bg-gradient-to-t from-black via-black/80 to-transparent pt-14">
            <div className="flex items-center justify-around w-full px-8">
              <button 
                onClick={() => fileInputRef.current?.click()}
                className="w-12 h-12 rounded-2xl border-2 border-white/40 bg-zinc-900 overflow-hidden flex items-center justify-center active:scale-95 transition shadow-2xl"
              >
                <ImageIcon className="w-5 h-5 text-zinc-300" />
              </button>

              {/* Shutter Record */}
              <button 
                onClick={toggleRecording}
                className="relative flex items-center justify-center group"
              >
                <div className={`rounded-full transition-all duration-300 flex items-center justify-center ${
                  isRecording ? "w-20 h-20 border-4 border-red-500 bg-red-500/20 animate-pulse" : "w-20 h-20 border-4 border-white p-1"
                }`}>
                  <div className={`transition-all duration-300 ${isRecording ? "w-8 h-8 rounded-md bg-red-500" : "w-full h-full rounded-full bg-white"}`} />
                </div>
              </button>

              <button onClick={() => setShowEditor(true)} className="w-12 h-12 rounded-2xl bg-white/10 backdrop-blur-xl border border-white/15 flex items-center justify-center text-white active:scale-95 transition">
                <ChevronRight className="w-5 h-5" />
              </button>
            </div>

            {/* Mode Switcher */}
            <div className="flex items-center gap-7 bg-zinc-950/80 backdrop-blur-2xl px-5 py-2 rounded-full border border-white/10 shadow-2xl">
              {(["POST", "REEL", "LIVE"] as Mode[]).map((mode) => (
                <button
                  key={mode}
                  onClick={() => { setActiveMode(mode); setIsRecording(false); }}
                  className={`relative text-[11px] font-black tracking-widest transition-all ${
                    activeMode === mode ? "text-white scale-110 drop-shadow-[0_0_12px_rgba(255,255,255,0.9)]" : "text-zinc-500 hover:text-zinc-300"
                  }`}
                >
                  {mode}
                </button>
              ))}
            </div>
          </div>
        </>
      )}

      {/* Editor View */}
      {showEditor && (
        <div className="w-full h-full flex flex-col bg-zinc-950">
          <div className="flex justify-between p-4 border-b border-zinc-800">
            <button onClick={() => setShowEditor(false)}><X className="w-6 h-6" /></button>
            <button onClick={handleSaveVideo} className="flex items-center gap-2 bg-gradient-to-r from-pink-500 to-purple-600 px-5 py-2 rounded-full font-bold text-xs">
              <Download className="w-4 h-4" /> Save / Share
            </button>
          </div>

          <div className="flex-1 flex items-center justify-center p-4">
             <div 
              onMouseDown={(e) => { setIsDragging(true); dragStartRef.current = { x: e.clientX - position.x, y: e.clientY - position.y }; }}
              onMouseMove={(e) => { if(isDragging) setPosition({ x: e.clientX - dragStartRef.current.x, y: e.clientY - dragStartRef.current.y }); }}
              onMouseUp={() => setIsDragging(false)}
              onTouchStart={(e) => { setIsDragging(true); dragStartRef.current = { x: e.touches[0].clientX - position.x, y: e.touches[0].clientY - position.y }; }}
              onTouchMove={(e) => { if(isDragging) setPosition({ x: e.touches[0].clientX - dragStartRef.current.x, y: e.touches[0].clientY - dragStartRef.current.y }); }}
              onTouchEnd={() => setIsDragging(false)}
              className="overflow-hidden border border-white/20 rounded-2xl relative"
              style={{ aspectRatio: aspectRatio === "1:1" ? "1/1" : "9/16", maxHeight: "100%", maxWidth: "100%" }}
            >
              <video src={videoUrl || ""} autoPlay loop muted className="w-full h-full object-cover" style={{ transform: `translate(${position.x}px, ${position.y}px) scale(${scale}) rotate(${rotation}deg)` }} />
            </div>
          </div>

          <div className="bg-black p-4 flex justify-around border-t border-zinc-900 text-xs">
            <button onClick={() => setScale((s) => s + 0.2)} className="flex flex-col items-center gap-1"><ZoomIn className="w-5 h-5 text-pink-400"/> Zoom</button>
            <button onClick={() => setRotation((r) => r + 90)} className="flex flex-col items-center gap-1"><RotateCw className="w-5 h-5 text-cyan-400"/> Rotate</button>
            <button onClick={() => setAspectRatio(aspectRatio === "9:16" ? "1:1" : "9:16")} className="flex flex-col items-center gap-1"><Crop className="w-5 h-5 text-purple-400"/> Ratio</button>
            <button className="flex flex-col items-center gap-1"><Type className="w-5 h-5 text-amber-400"/> Text</button>
          </div>
        </div>
      )}

    </div>
  );
}
