import React, { useState, useEffect, useRef } from "react";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { 
  X, 
  RefreshCw, 
  Zap, 
  ZapOff, 
  Image as ImageIcon, 
  Music, 
  Sliders, 
  Clock, 
  Sparkles, 
  ChevronRight,
  Video,
  Radio,
  Grid,
  Infinity as BoomerangIcon,
  LayoutGrid,
  Scissors,
  Type,
  Smile,
  FolderDown,
  Wand2,
  Sparkle
} from "lucide-react";

export const Route = createFileRoute("/create")({
  component: CreateStudioPage,
});

type Mode = "POST" | "REEL" | "LIVE";

export function CreateStudioPage() {
  const navigate = useNavigate();
  const [activeMode, setActiveMode] = useState<Mode>("REEL");
  const [flash, setFlash] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [recordProgress, setRecordProgress] = useState(0);
  const [speed, setSpeed] = useState("1x");
  const [isBoomerang, setIsBoomerang] = useState(false);
  const [isLayoutGrid, setIsLayoutGrid] = useState(false);
  const [showEditor, setShowEditor] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [facingMode, setFacingMode] = useState<"user" | "environment">("user");
  const [pickedFile, setPickedFile] = useState<{ url: string; type: string } | null>(null);

  // Live webcam feed
  useEffect(() => {
    let cancelled = false;
    async function start() {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode, width: { ideal: 1920 }, height: { ideal: 1080 } },
          audio: false,
        });
        if (cancelled) {
          stream.getTracks().forEach((t) => t.stop());
          return;
        }
        streamRef.current = stream;
        setCameraError(null);
        if (videoRef.current) videoRef.current.srcObject = stream;
      } catch (err: any) {
        if (!cancelled) setCameraError(err?.message ?? "Camera unavailable");
      }
    }
    start();
    return () => {
      cancelled = true;
      streamRef.current?.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
    };
  }, [facingMode]);

  useEffect(() => {
    return () => {
      if (pickedFile) URL.revokeObjectURL(pickedFile.url);
    };
  }, [pickedFile]);

  const onPickFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setPickedFile({ url: URL.createObjectURL(file), type: file.type });
    setShowEditor(true);
    e.target.value = "";
  };

  // Recording Progress Bar Animation
  useEffect(() => {
    let interval: any;
    if (isRecording) {
      interval = setInterval(() => {
        setRecordProgress((prev) => {
          if (prev >= 100) {
            setIsRecording(false);
            setShowEditor(true); // Open Pro Editor after recording
            return 0;
          }
          return prev + 1;
        });
      }, 120);
    } else {
      setRecordProgress(0);
    }
    return () => clearInterval(interval);
  }, [isRecording]);

  return (
    <div className="fixed inset-0 z-50 bg-black text-white flex flex-col justify-between select-none overflow-hidden font-sans">
      
      {/* Top Reel Progress Bar */}
      {activeMode === "REEL" && (
        <div className="absolute top-0 left-0 right-0 z-30 h-1.5 bg-white/20">
          <div 
            className="h-full bg-gradient-to-r from-pink-500 via-purple-600 to-amber-500 transition-all duration-150"
            style={{ width: `${recordProgress}%` }}
          />
        </div>
      )}

      {/* Header Bar */}
      <div className="flex items-center justify-between p-4 z-20 bg-gradient-to-b from-black/80 via-black/40 to-transparent pt-6">
        <button 
          onClick={() => navigate({ to: "/" })} 
          className="p-2.5 rounded-full bg-black/40 backdrop-blur-xl border border-white/10 hover:bg-black/60 transition active:scale-90"
        >
          <X className="w-5 h-5 text-white" />
        </button>

        {/* Audio Picker Button */}
        {activeMode === "REEL" && (
          <button className="flex items-center gap-2 px-4 py-2 rounded-full bg-black/50 backdrop-blur-xl border border-white/15 text-xs font-semibold hover:border-pink-500/50 transition active:scale-95">
            <Music className="w-3.5 h-3.5 text-pink-400 animate-pulse" />
            <span>Add Sound</span>
          </button>
        )}

        <div className="flex items-center gap-2">
          <button 
            onClick={() => setFlash(!flash)} 
            className={`p-2.5 rounded-full backdrop-blur-xl border transition active:scale-90 ${
              flash ? "bg-amber-400 text-black border-amber-300" : "bg-black/40 text-white border-white/10"
            }`}
          >
            {flash ? <Zap className="w-5 h-5 fill-current" /> : <ZapOff className="w-5 h-5" />}
          </button>

          <button
            onClick={() => setFacingMode((m) => (m === "user" ? "environment" : "user"))}
            className="p-2.5 rounded-full bg-black/40 backdrop-blur-xl border border-white/10 text-white active:scale-90 transition"
          >
            <RefreshCw className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* Left CapCut/Instagram Capture Modes Toolbar */}
      <div className="absolute left-4 top-24 z-20 flex flex-col gap-4 bg-black/40 backdrop-blur-md p-2.5 rounded-2xl border border-white/10">
        <button 
          onClick={() => setIsBoomerang(!isBoomerang)} 
          className={`flex flex-col items-center gap-1 text-[10px] font-medium transition ${isBoomerang ? "text-pink-400" : "text-white/80"}`}
        >
          <div className={`p-2 rounded-xl ${isBoomerang ? "bg-pink-500/20 border border-pink-500" : "bg-white/10"}`}>
            <BoomerangIcon className="w-4 h-4" />
          </div>
          <span>Boomerang</span>
        </button>

        <button 
          onClick={() => setIsLayoutGrid(!isLayoutGrid)} 
          className={`flex flex-col items-center gap-1 text-[10px] font-medium transition ${isLayoutGrid ? "text-cyan-400" : "text-white/80"}`}
        >
          <div className={`p-2 rounded-xl ${isLayoutGrid ? "bg-cyan-500/20 border border-cyan-500" : "bg-white/10"}`}>
            <LayoutGrid className="w-4 h-4" />
          </div>
          <span>Layout</span>
        </button>

        <button 
          onClick={() => setSpeed(speed === "1x" ? "2x" : speed === "2x" ? "0.5x" : "1x")}
          className="flex flex-col items-center gap-1 text-[10px] font-medium text-white/80"
        >
          <div className="p-2 rounded-xl bg-white/10 font-bold text-xs">{speed}</div>
          <span>Speed</span>
        </button>
      </div>

      {/* Right AI & Beauty Tools Toolbar */}
      <div className="absolute right-4 top-24 z-20 flex flex-col gap-4 bg-black/40 backdrop-blur-md p-2.5 rounded-2xl border border-white/10">
        <button className="flex flex-col items-center gap-1 text-[10px] font-medium text-white/80">
          <div className="p-2 rounded-xl bg-white/10"><Sparkles className="w-4 h-4 text-amber-300" /></div>
          <span>Effects</span>
        </button>

        <button className="flex flex-col items-center gap-1 text-[10px] font-medium text-white/80">
          <div className="p-2 rounded-xl bg-white/10"><Wand2 className="w-4 h-4 text-purple-400" /></div>
          <span>AutoCut</span>
        </button>

        <button className="flex flex-col items-center gap-1 text-[10px] font-medium text-white/80">
          <div className="p-2 rounded-xl bg-white/10"><Clock className="w-4 h-4 text-emerald-400" /></div>
          <span>Timer</span>
        </button>
      </div>

      {/* Live Camera Viewport */}
      <div className="absolute inset-0 bg-zinc-950 z-0">
        <video
          ref={videoRef}
          autoPlay
          playsInline
          muted
          className={`w-full h-full object-contain ${facingMode === "user" ? "scale-x-[-1]" : ""}`}
        />
        {cameraError && (
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="text-center flex flex-col items-center gap-2">
              <div className="w-20 h-20 rounded-full border border-white/10 flex items-center justify-center bg-white/5 backdrop-blur-xl">
                {activeMode === "POST" && <Grid className="w-8 h-8 text-white/60" />}
                {activeMode === "REEL" && <Video className="w-8 h-8 text-pink-400" />}
                {activeMode === "LIVE" && <Radio className="w-8 h-8 text-red-500 animate-pulse" />}
              </div>
              <p className="text-xs font-semibold text-zinc-500 uppercase tracking-widest">
                Camera unavailable
              </p>
            </div>
          </div>
        )}
      </div>

      {/* Bottom Shutter & Mode Switcher */}
      <div className="flex flex-col items-center gap-6 pb-10 z-20 bg-gradient-to-t from-black via-black/80 to-transparent pt-16">
        
        <div className="flex items-center justify-around w-full px-8">
          {/* Gallery Picker */}
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*,video/*"
            className="hidden"
            onChange={onPickFile}
          />
          <button
            onClick={() => fileInputRef.current?.click()}
            className="w-12 h-12 rounded-2xl border-2 border-white/30 bg-zinc-900 overflow-hidden flex items-center justify-center active:scale-95 transition shadow-2xl"
          >
            <ImageIcon className="w-6 h-6 text-zinc-300" />
          </button>

          {/* Shutter Button */}
          <button 
            onClick={() => setIsRecording(!isRecording)}
            className="relative flex items-center justify-center group"
          >
            <div className={`rounded-full transition-all duration-300 flex items-center justify-center ${
              isRecording 
                ? "w-24 h-24 border-4 border-red-500 bg-red-500/20 animate-pulse" 
                : "w-22 h-22 border-4 border-white p-1.5"
            }`}>
              <div className={`transition-all duration-300 ${
                isRecording 
                  ? "w-10 h-10 rounded-lg bg-red-500" 
                  : "w-full h-full rounded-full bg-white group-hover:scale-95"
              }`} />
            </div>
          </button>

          {/* Drafts or Editor Next Button */}
          <button 
            onClick={() => setShowEditor(true)}
            className="w-12 h-12 rounded-2xl bg-white/10 backdrop-blur-xl border border-white/15 flex items-center justify-center text-white active:scale-95 transition"
          >
            <ChevronRight className="w-6 h-6" />
          </button>
        </div>

        {/* Mode Swiper */}
        <div className="flex items-center gap-8 bg-zinc-950/80 backdrop-blur-2xl px-6 py-2.5 rounded-full border border-white/10 shadow-2xl">
          {(["POST", "REEL", "LIVE"] as Mode[]).map((mode) => (
            <button
              key={mode}
              onClick={() => {
                setActiveMode(mode);
                setIsRecording(false);
              }}
              className={`relative text-xs font-black tracking-widest transition-all duration-200 ${
                activeMode === mode 
                  ? "text-white scale-110 drop-shadow-[0_0_12px_rgba(255,255,255,0.9)]" 
                  : "text-zinc-500 hover:text-zinc-300"
              }`}
            >
              {mode}
              {activeMode === mode && (
                <span className="absolute -bottom-1.5 left-1/2 -translate-x-1/2 w-1.5 h-1.5 rounded-full bg-white shadow-[0_0_8px_#fff]" />
              )}
            </button>
          ))}
        </div>

      </div>

      {/* CAPCUT / INSHOT STYLE PRO EDITOR MODAL */}
      {showEditor && (
        <div className="fixed inset-0 z-50 bg-black text-white flex flex-col justify-between animate-in fade-in duration-200">
          
          {/* Top Editor Bar */}
          <div className="flex items-center justify-between p-4 border-b border-zinc-800 bg-zinc-950">
            <button onClick={() => setShowEditor(false)} className="p-2 rounded-full hover:bg-zinc-900">
              <X className="w-5 h-5" />
            </button>
            <span className="text-xs font-bold tracking-wider uppercase">InShot / CapCut Studio</span>
            <button className="px-4 py-1.5 bg-gradient-to-r from-pink-500 to-purple-600 rounded-full text-xs font-bold shadow-lg hover:opacity-90">
              Export / Share
            </button>
          </div>

          {/* Timeline / Video Preview Box */}
          <div className="flex-1 bg-zinc-900 flex items-center justify-center relative overflow-hidden">
            {pickedFile ? (
              pickedFile.type.startsWith("video") ? (
                <video src={pickedFile.url} controls className="max-h-full max-w-full object-contain" />
              ) : (
                <img src={pickedFile.url} alt="Selected media preview" className="max-h-full max-w-full object-contain" />
              )
            ) : (
              <p className="text-xs text-zinc-500 tracking-widest uppercase">Video Multi-Layer Preview</p>
            )}
          </div>

          {/* CapCut Style Editing Tools Slider */}
          <div className="bg-zinc-950 border-t border-zinc-800 p-4 flex flex-col gap-4">
            <div className="flex items-center justify-around gap-2 overflow-x-auto py-2">
              <button className="flex flex-col items-center gap-1 text-[10px] font-semibold text-zinc-300 hover:text-white">
                <div className="p-3 bg-zinc-900 rounded-2xl border border-zinc-800"><Scissors className="w-5 h-5 text-pink-400" /></div>
                <span>Trim / Cut</span>
              </button>

              <button className="flex flex-col items-center gap-1 text-[10px] font-semibold text-zinc-300 hover:text-white">
                <div className="p-3 bg-zinc-900 rounded-2xl border border-zinc-800"><Music className="w-5 h-5 text-cyan-400" /></div>
                <span>Audio</span>
              </button>

              <button className="flex flex-col items-center gap-1 text-[10px] font-semibold text-zinc-300 hover:text-white">
                <div className="p-3 bg-zinc-900 rounded-2xl border border-zinc-800"><Type className="w-5 h-5 text-amber-400" /></div>
                <span>Captions</span>
              </button>

              <button className="flex flex-col items-center gap-1 text-[10px] font-semibold text-zinc-300 hover:text-white">
                <div className="p-3 bg-zinc-900 rounded-2xl border border-zinc-800"><Sparkle className="w-5 h-5 text-purple-400" /></div>
                <span>Enhance HD</span>
              </button>

              <button className="flex flex-col items-center gap-1 text-[10px] font-semibold text-zinc-300 hover:text-white">
                <div className="p-3 bg-zinc-900 rounded-2xl border border-zinc-800"><Smile className="w-5 h-5 text-emerald-400" /></div>
                <span>Stickers</span>
              </button>
            </div>
          </div>

        </div>
      )}

    </div>
  );
}
