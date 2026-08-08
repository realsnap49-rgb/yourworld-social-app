import React, { useState, useEffect, useRef } from "react";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import {
  X, RefreshCw, Zap, Music, Sparkles, Image as ImageIcon,
  Type, Pencil, Download, Smile, Wand2, MoreHorizontal, ChevronRight, Check
} from "lucide-react";

export const Route = createFileRoute("/moment/create")({
  component: MomentCreatePage,
});

export function MomentCreatePage() {
  const videoRef = useRef<HTMLVideoElement>(null);
  const navigate = useNavigate();

  // State Pipeline
  const [step, setStep] = useState<0 | 1 | 2>(0);
  const [facingMode, setFacingMode] = useState<"user" | "environment">("user");
  const [torch, setTorch] = useState(false);
  const [capturedImage, setCapturedImage] = useState<string | null>(null);

  // Gesture & Transform States
  const [scale, setScale] = useState(1);
  const [lastDist, setLastDist] = useState<number | null>(null);

  // Editor Dynamic Elements
  const [caption, setCaption] = useState("");
  const [textList, setTextList] = useState<{ id: number; text: string; x: number; y: number }[]>([]);
  const [selectedAudio, setSelectedAudio] = useState<string | null>("Nawal - Main");

  // Share Sheet States
  const [privacy, setPrivacy] = useState("everyone");
  const [duration, setDuration] = useState("24h");

  // 1. Ultra-HD High-Bitrate Camera Core
  useEffect(() => {
    if (step !== 0) return;
    let stream: MediaStream | null = null;

    const startCamera = async () => {
      try {
        stream = await navigator.mediaDevices.getUserMedia({
          video: {
            facingMode: facingMode,
            width: { ideal: 3840, min: 1920 },
            height: { ideal: 2160, min: 1080 }
          },
          audio: false
        });

        if (videoRef.current) {
          videoRef.current.srcObject = stream;
        }

        // Hardware Torch / Flash Toggle
        const track = stream.getVideoTracks()[0];
        const capabilities = track.getCapabilities() as any;
        if (capabilities?.torch) {
          await track.applyConstraints({ advanced: [{ torch }] } as any);
        }
      } catch (err) {
        console.error("Camera Init Error:", err);
      }
    };

    startCamera();

    return () => {
      stream?.getTracks().forEach((t) => t.stop());
    };
  }, [facingMode, step, torch]);

  // 2. High Resolution Uncompressed Snapshot Capture
  const captureUltraHdPhoto = () => {
    if (!videoRef.current) return;
    const video = videoRef.current;
    const canvas = document.createElement("canvas");
    canvas.width = video.videoWidth || 1920;
    canvas.height = video.videoHeight || 1080;

    const ctx = canvas.getContext("2d");
    if (ctx) {
      ctx.imageSmoothingEnabled = true;
      ctx.imageSmoothingQuality = "high";
      ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
      setCapturedImage(canvas.toDataURL("image/png", 1.0));
      setStep(1); // Transition to Canvas Editor
    }
  };

  // 3. Pro Multi-Touch Pinch-to-Zoom Gesture Handler
  const handleTouchStart = (e: React.TouchEvent) => {
    if (e.touches.length === 2) {
      const dist = Math.hypot(
        e.touches[0].clientX - e.touches[1].clientX,
        e.touches[0].clientY - e.touches[1].clientY
      );
      setLastDist(dist);
    }
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (e.touches.length === 2 && lastDist !== null) {
      const currentDist = Math.hypot(
        e.touches[0].clientX - e.touches[1].clientX,
        e.touches[0].clientY - e.touches[1].clientY
      );
      const delta = currentDist - lastDist;
      setScale((prevScale) => Math.min(Math.max(prevScale + delta * 0.008, 1), 3.5));
      setLastDist(currentDist);
    }
  };

  const handleTouchEnd = () => {
    setLastDist(null);
  };

  return (
    <div className="fixed inset-0 z-50 bg-black text-white font-sans select-none overflow-hidden">
      
      {/* STEP 0: ULTRA-HD CAMERA FEED */}
      {step === 0 && (
        <div className="relative w-full h-full flex flex-col justify-between">
          <video
            ref={videoRef}
            autoPlay
            playsInline
            muted
            className="absolute inset-0 w-full h-full object-cover"
          />

          {/* Top Bar */}
          <div className="relative z-10 flex justify-between p-4 pt-6 bg-gradient-to-b from-black/60 to-transparent">
            <button onClick={() => navigate({ to: ".." })} className="p-2.5 bg-black/40 backdrop-blur-md rounded-full">
              <X size={22} />
            </button>
            <div className="flex gap-3">
              <button onClick={() => setTorch(!torch)} className={`p-2.5 rounded-full backdrop-blur-md ${torch ? 'bg-yellow-400 text-black' : 'bg-black/40 text-white'}`}>
                <Zap size={22} />
              </button>
              <button onClick={() => setFacingMode(p => p === "user" ? "environment" : "user")} className="p-2.5 bg-black/40 backdrop-blur-md rounded-full">
                <RefreshCw size={22} />
              </button>
            </div>
          </div>

          {/* Bottom Controls */}
          <div className="relative z-10 flex flex-col items-center mb-8">
            <div className="flex items-center gap-6 mb-4">
              <button className="p-2.5 bg-black/40 backdrop-blur-md rounded-xl">
                <ImageIcon size={22} />
              </button>
              <button
                onClick={captureUltraHdPhoto}
                className="w-20 h-20 rounded-full border-4 border-white flex items-center justify-center active:scale-90 transition-transform shadow-2xl"
              >
                <div className="w-16 h-16 rounded-full border-2 border-black/20 bg-white/20" />
              </button>
              <button className="p-2.5 bg-black/40 backdrop-blur-md rounded-xl">
                <Sparkles size={22} />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* STEP 1: INSTAGRAM PRO EDITOR (Pinch Zoom + Draggable Text + Clean Compact Sidebar) */}
      {step === 1 && (
        <div
          className="relative w-full h-full bg-black flex flex-col justify-between overflow-hidden"
          onTouchStart={handleTouchStart}
          onTouchMove={handleTouchMove}
          onTouchEnd={handleTouchEnd}
        >
          {/* Main Photo with Scale Matrix */}
          <div className="absolute inset-0 w-full h-full overflow-hidden flex items-center justify-center">
            <img
              src={capturedImage!}
              alt="Captured"
              style={{ transform: `scale(${scale})` }}
              className="w-full h-full object-cover transition-transform duration-75 ease-out"
            />
          </div>

          {/* Top Bar */}
          <div className="relative z-30 flex items-center justify-between p-4 pt-6 bg-gradient-to-b from-black/60 to-transparent">
            <button onClick={() => setStep(0)} className="p-2 text-white">
              <X size={26} />
            </button>

            {selectedAudio && (
              <div className="flex items-center gap-2 bg-black/60 backdrop-blur-md px-3 py-1.5 rounded-2xl border border-white/20 max-w-[200px]">
                <div className="w-5 h-5 rounded-md bg-zinc-700 flex items-center justify-center overflow-hidden">
                  <Music size={12} className="text-white" />
                </div>
                <span className="text-xs font-bold truncate text-white">{selectedAudio}</span>
                <button onClick={() => setSelectedAudio(null)} className="ml-1 text-zinc-400 hover:text-white">
                  <X size={12} />
                </button>
              </div>
            )}

            <div className="w-6" />
          </div>

          {/* RIGHT SIDEBAR: COMPACT 32px STRAIGHT VERTICAL LINE (No Mention / Partnership) */}
          <div className="absolute right-3 top-20 z-30 flex flex-col gap-3 items-center bg-black/30 backdrop-blur-md p-1.5 rounded-full border border-white/10">
            <button
              onClick={() => {
                const t = prompt("Add text overlay:");
                if (t) setTextList([...textList, { id: Date.now(), text: t, x: 80, y: 200 }]);
              }}
              className="w-8 h-8 rounded-full bg-black/40 flex items-center justify-center font-serif text-sm font-bold active:scale-90"
            >
              Aa
            </button>
            <button onClick={() => alert("Sticker Panel")} className="w-8 h-8 rounded-full bg-black/40 flex items-center justify-center active:scale-90">
              <Smile size={16} />
            </button>
            <button
              onClick={() => {
                const song = prompt("Select Track:", "Nawal - Main");
                if (song) setSelectedAudio(song);
              }}
              className="w-8 h-8 rounded-full bg-black/40 flex items-center justify-center active:scale-90"
            >
              <Music size={16} />
            </button>
            <button onClick={() => alert("AI Restyle")} className="w-8 h-8 rounded-full bg-black/40 flex items-center justify-center active:scale-90">
              <Wand2 size={16} />
            </button>
            <button onClick={() => alert("Brush Draw")} className="w-8 h-8 rounded-full bg-black/40 flex items-center justify-center active:scale-90">
              <Pencil size={16} />
            </button>
            <button onClick={() => alert("Saved to gallery")} className="w-8 h-8 rounded-full bg-black/40 flex items-center justify-center active:scale-90">
              <Download size={16} />
            </button>
            <button onClick={() => alert("More tools")} className="w-8 h-8 rounded-full bg-black/40 flex items-center justify-center active:scale-90">
              <MoreHorizontal size={16} />
            </button>
          </div>

          {/* DRAGGABLE TEXT ELEMENTS OVERLAY */}
          {textList.map((t) => (
            <div
              key={t.id}
              className="absolute z-20 px-3 py-1 bg-black/60 rounded-xl text-lg font-bold text-white border border-white/20 cursor-move touch-none"
              style={{ left: t.x, top: t.y }}
              onTouchMove={(e) => {
                const x = e.touches[0].clientX - 40;
                const y = e.touches[0].clientY - 20;
                setTextList(prev => prev.map(item => item.id === t.id ? { ...item, x, y } : item));
              }}
            >
              {t.text}
            </div>
          ))}

          {/* BOTTOM CAPTION & NAVIGATION ROW */}
          <div className="relative z-30 p-4 pb-6 bg-gradient-to-t from-black/80 via-black/40 to-transparent flex flex-col gap-4">
            <input
              type="text"
              value={caption}
              onChange={(e) => setCaption(e.target.value)}
              placeholder="Add a caption..."
              className="w-full bg-transparent border-b border-white/30 pb-2 text-sm text-white placeholder-zinc-300 focus:outline-none"
            />

            <div className="flex items-center justify-between gap-3">
              <button
                onClick={() => { setPrivacy("everyone"); setStep(2); }}
                className="flex-1 py-3 bg-black/60 backdrop-blur-md rounded-full border border-white/20 flex items-center justify-center gap-2 text-xs font-bold"
              >
                <div className="w-5 h-5 rounded-full bg-blue-500 flex items-center justify-center text-[10px]">👤</div>
                Your stories
              </button>

              <button
                onClick={() => { setPrivacy("close_friends"); setStep(2); }}
                className="flex-1 py-3 bg-black/60 backdrop-blur-md rounded-full border border-white/20 flex items-center justify-center gap-2 text-xs font-bold text-emerald-400"
              >
                <div className="w-5 h-5 rounded-full bg-emerald-500 text-black flex items-center justify-center font-black text-[10px]">★</div>
                Close Friends
              </button>

              <button
                onClick={() => setStep(2)}
                className="w-12 h-12 rounded-full bg-indigo-600 flex items-center justify-center active:scale-90 transition-transform shadow-lg"
              >
                <ChevronRight size={24} className="text-white" />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* STEP 2: PREVIEW & SHARE SHEET (EXACT SCREENSHOT LAYOUT) */}
      {step === 2 && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex flex-col justify-end">
          <div className="w-full max-h-[85vh] bg-[#121214] border-t border-zinc-800 rounded-t-3xl p-5 overflow-y-auto space-y-6 text-white animate-in slide-in-from-bottom duration-300">
            <div className="flex justify-between items-center pb-2 border-b border-zinc-800">
              <h2 className="text-lg font-bold">Preview & Share</h2>
              <button onClick={() => setStep(1)} className="p-1 rounded-full bg-zinc-800 text-zinc-400"><X size={18} /></button>
            </div>

            <div className="space-y-2">
              <label className="text-xs font-semibold text-zinc-400 uppercase">Privacy</label>
              <div className="grid grid-cols-2 gap-2.5">
                {[
                  { key: "everyone", label: "Everyone", desc: "Anyone on YourWorld" },
                  { key: "followers", label: "Followers", desc: "People who follow you" },
                  { key: "close_friends", label: "Close Friends", desc: "Your green-list only" },
                  { key: "only_me", label: "Only Me", desc: "Private to you" }
                ].map((p) => (
                  <button
                    key={p.key}
                    onClick={() => setPrivacy(p.key)}
                    className={`p-3 rounded-2xl text-left border flex flex-col justify-between ${
                      privacy === p.key ? "bg-pink-950/40 border-pink-500 text-white" : "bg-zinc-900 border-zinc-800 text-zinc-400"
                    }`}
                  >
                    <span className="font-bold text-sm">{p.label}</span>
                    <span className="text-[11px] text-zinc-500 mt-1">{p.desc}</span>
                  </button>
                ))}
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-xs font-semibold text-zinc-400 uppercase">Duration</label>
              <div className="grid grid-cols-2 gap-3">
                {["12h", "24h"].map((d) => (
                  <button
                    key={d}
                    onClick={() => setDuration(d)}
                    className={`py-3 rounded-2xl font-bold text-sm border ${
                      duration === d ? "bg-pink-950/40 border-pink-500 text-white" : "bg-zinc-900 border-zinc-800 text-zinc-400"
                    }`}
                  >
                    {d === "12h" ? "12 Hours" : "24 Hours"}
                  </button>
                ))}
              </div>
            </div>

            <button
              onClick={() => { alert("Moment Published Successfully! 🚀"); navigate({ to: ".." }); }}
              className="w-full py-4 bg-gradient-to-r from-teal-400 via-pink-500 to-rose-500 text-white font-black text-base rounded-full shadow-2xl"
            >
              Share moment
            </button>
          </div>
        </div>
      )}

    </div>
  );
}

export default MomentCreatePage;
