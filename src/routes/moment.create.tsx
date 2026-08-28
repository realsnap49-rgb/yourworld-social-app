import React, { useState, useEffect, useRef } from "react";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import {
  X, RefreshCw, Zap, Music, Sparkles, Image as ImageIcon,
  Type, Pencil, Download, Smile, Wand2, MoreHorizontal, ChevronRight,
  Lock, Check, BarChart2, Bell, Archive, Shield
} from "lucide-react";

export const Route = createFileRoute("/moment/create")({
  component: MomentCreatePage,
});

export function MomentCreatePage() {
  const videoRef = useRef<HTMLVideoElement>(null);
  const navigate = useNavigate();

  // Flow State
  const [step, setStep] = useState<0 | 1 | 2>(0);
  const [facingMode, setFacingMode] = useState<"user" | "environment">("user");
  const [torch, setTorch] = useState(false);
  const [capturedImage, setCapturedImage] = useState<string | null>(null);

  // Gesture States
  const [scale, setScale] = useState(1);
  const [lastDist, setLastDist] = useState<number | null>(null);

  // Editor States
  const [textList, setTextList] = useState<{ id: number; text: string; x: number; y: number }[]>([]);
  const [selectedAudio, setSelectedAudio] = useState<string | null>("Nawal - Main");

  // Share Sheet Complete Form States
  const [caption, setCaption] = useState("");
  const [privacy, setPrivacy] = useState<"everyone" | "followers" | "close_friends" | "only_me">("everyone");
  const [duration, setDuration] = useState<"12h" | "24h">("24h");
  const [addPoll, setAddPoll] = useState(false);
  const [screenshotAlert, setScreenshotAlert] = useState(true);
  const [allowDownloads, setAllowDownloads] = useState(true);
  const [saveToArchive, setSaveToArchive] = useState(true);

  // Camera Setup
  useEffect(() => {
    if (step !== 0) return;
    let stream: MediaStream | null = null;

    const startCamera = async () => {
      try {
        stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode, width: { ideal: 3840, min: 1920 }, height: { ideal: 2160, min: 1080 } },
          audio: false
        });

        if (videoRef.current) {
          videoRef.current.srcObject = stream;
        }

        const track = stream.getVideoTracks()[0];
        const capabilities = track.getCapabilities() as any;
        if (capabilities?.torch) {
          await track.applyConstraints({ advanced: [{ torch }] } as any);
        }
      } catch (err) {
        console.error("Camera Error:", err);
      }
    };

    startCamera();
    return () => stream?.getTracks().forEach((t) => t.stop());
  }, [facingMode, step, torch]);

  const capturePhoto = () => {
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
      setStep(1);
    }
  };

  // Pinch Zoom
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
      setScale((prev) => Math.min(Math.max(prev + delta * 0.008, 1), 3.5));
      setLastDist(currentDist);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black text-white font-sans select-none overflow-hidden">
      
      {/* STEP 0: CAMERA */}
      {step === 0 && (
        <div className="relative w-full h-full flex flex-col justify-between">
          <video ref={videoRef} autoPlay playsInline muted className="absolute inset-0 w-full h-full object-cover" />

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

          <div className="relative z-10 flex flex-col items-center mb-8">
            <div className="flex items-center gap-6 mb-4">
              <button className="p-2.5 bg-black/40 backdrop-blur-md rounded-xl"><ImageIcon size={22} /></button>
              <button onClick={capturePhoto} className="w-20 h-20 rounded-full border-4 border-white flex items-center justify-center active:scale-90 transition-transform shadow-2xl">
                <div className="w-16 h-16 rounded-full border-2 border-black/20 bg-white/20" />
              </button>
              <button className="p-2.5 bg-black/40 backdrop-blur-md rounded-xl"><Sparkles size={22} /></button>
            </div>
          </div>
        </div>
      )}

      {/* STEP 1: EDITOR */}
      {step === 1 && (
        <div
          className="relative w-full h-full bg-black flex flex-col justify-between overflow-hidden"
          onTouchStart={handleTouchStart}
          onTouchMove={handleTouchMove}
          onTouchEnd={() => setLastDist(null)}
        >
          <div className="absolute inset-0 w-full h-full overflow-hidden flex items-center justify-center">
            <img src={capturedImage!} alt="Captured" style={{ transform: `scale(${scale})` }} className="w-full h-full object-cover transition-transform duration-75 ease-out" />
          </div>

          {/* Top Bar */}
          <div className="relative z-30 flex items-center justify-between p-4 pt-6 bg-gradient-to-b from-black/60 to-transparent">
            <button onClick={() => setStep(0)} className="p-2 text-white"><X size={26} /></button>
            {selectedAudio && (
              <div className="flex items-center gap-2 bg-black/60 backdrop-blur-md px-3 py-1.5 rounded-2xl border border-white/20 max-w-[200px]">
                <div className="w-5 h-5 rounded-md bg-zinc-700 flex items-center justify-center overflow-hidden"><Music size={12} className="text-white" /></div>
                <span className="text-xs font-bold truncate text-white">{selectedAudio}</span>
                <button onClick={() => setSelectedAudio(null)} className="ml-1 text-zinc-400 hover:text-white"><X size={12} /></button>
              </div>
            )}
            <div className="w-6" />
          </div>

          {/* Right Sidebar */}
          <div className="absolute right-3 top-20 z-30 flex flex-col gap-3 items-center bg-black/30 backdrop-blur-md p-1.5 rounded-full border border-white/10">
            <button onClick={() => { const t = prompt("Add text overlay:"); if (t) setTextList([...textList, { id: Date.now(), text: t, x: 80, y: 200 }]); }} className="w-8 h-8 rounded-full bg-black/40 flex items-center justify-center font-serif text-sm font-bold active:scale-90">Aa</button>
            <button onClick={() => alert("Sticker Panel")} className="w-8 h-8 rounded-full bg-black/40 flex items-center justify-center active:scale-90"><Smile size={16} /></button>
            <button onClick={() => { const song = prompt("Select Track:", "Nawal - Main"); if (song) setSelectedAudio(song); }} className="w-8 h-8 rounded-full bg-black/40 flex items-center justify-center active:scale-90"><Music size={16} /></button>
            <button onClick={() => alert("AI Restyle")} className="w-8 h-8 rounded-full bg-black/40 flex items-center justify-center active:scale-90"><Wand2 size={16} /></button>
            <button onClick={() => alert("Brush Draw")} className="w-8 h-8 rounded-full bg-black/40 flex items-center justify-center active:scale-90"><Pencil size={16} /></button>
            <button onClick={() => alert("Saved to gallery")} className="w-8 h-8 rounded-full bg-black/40 flex items-center justify-center active:scale-90"><Download size={16} /></button>
            <button onClick={() => alert("More tools")} className="w-8 h-8 rounded-full bg-black/40 flex items-center justify-center active:scale-90"><MoreHorizontal size={16} /></button>
          </div>

          {/* Draggable Text */}
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

          {/* Bottom Navigation */}
          <div className="relative z-30 p-4 pb-6 bg-gradient-to-t from-black/80 via-black/40 to-transparent flex flex-col gap-4">
            <input type="text" value={caption} onChange={(e) => setCaption(e.target.value)} placeholder="Add a caption..." className="w-full bg-transparent border-b border-white/30 pb-2 text-sm text-white placeholder-zinc-300 focus:outline-none" />

            <div className="flex items-center justify-between gap-3">
              <button onClick={() => { setPrivacy("everyone"); setStep(2); }} className="flex-1 py-3 bg-black/60 backdrop-blur-md rounded-full border border-white/20 flex items-center justify-center gap-2 text-xs font-bold">
                <div className="w-5 h-5 rounded-full bg-blue-500 flex items-center justify-center text-[10px]">👤</div>
                Your stories
              </button>

              <button onClick={() => { setPrivacy("close_friends"); setStep(2); }} className="flex-1 py-3 bg-black/60 backdrop-blur-md rounded-full border border-white/20 flex items-center justify-center gap-2 text-xs font-bold text-emerald-400">
                <div className="w-5 h-5 rounded-full bg-emerald-500 text-black flex items-center justify-center font-black text-[10px]">★</div>
                Close Friends
              </button>

              <button onClick={() => setStep(2)} className="w-12 h-12 rounded-full bg-indigo-600 flex items-center justify-center active:scale-90 transition-transform shadow-lg">
                <ChevronRight size={24} className="text-white" />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* STEP 2: PREVIEW & SHARE SHEET (EXACT SCREENSHOT MATCH) */}
      {step === 2 && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex flex-col justify-end">
          <div className="w-full max-h-[88vh] bg-[#121214] border-t border-zinc-800 rounded-t-3xl p-5 overflow-y-auto space-y-6 text-white font-sans animate-in slide-in-from-bottom duration-300">
            
            {/* Header */}
            <div className="flex justify-between items-center pb-2 border-b border-zinc-800">
              <h2 className="text-lg font-bold text-white">Preview & Share</h2>
              <button onClick={() => setStep(1)} className="p-1 rounded-full bg-zinc-800 text-zinc-400 hover:text-white">
                <X size={18} />
              </button>
            </div>

            {/* Caption Box */}
            <div className="space-y-2">
              <label className="text-xs font-semibold text-zinc-400 uppercase tracking-wider">CAPTION</label>
              <textarea 
                value={caption} 
                onChange={e => setCaption(e.target.value)} 
                placeholder="Say something about this moment..." 
                className="w-full bg-[#1c1c1e] border border-zinc-800 rounded-2xl p-3 text-sm text-white focus:outline-none focus:border-pink-500"
                rows={2}
              />
            </div>

            {/* Privacy Selectors */}
            <div className="space-y-2">
              <label className="text-xs font-semibold text-zinc-400 uppercase tracking-wider">PRIVACY</label>
              <div className="grid grid-cols-2 gap-2.5">
                {[
                  { key: "everyone", label: "Everyone", desc: "Anyone on YourWorld" },
                  { key: "followers", label: "Followers", desc: "People who follow you" },
                  { key: "close_friends", label: "Close Friends", desc: "Your green-list only" },
                  { key: "only_me", label: "Only Me", desc: "Private to you" }
                ].map((p) => (
                  <button 
                    key={p.key} 
                    onClick={() => setPrivacy(p.key as any)} 
                    className={`p-3 rounded-2xl text-left border flex flex-col justify-between transition-all ${
                      privacy === p.key ? "bg-[#2a1324] border-pink-500 text-white" : "bg-[#1c1c1e] border-zinc-800/80 text-zinc-400"
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-1.5">
                        <Lock size={13} className={privacy === p.key ? "text-pink-400" : "text-zinc-500"} />
                        <span className="font-bold text-sm text-white">{p.label}</span>
                      </div>
                      {privacy === p.key && <Check size={16} className="text-pink-500" />}
                    </div>
                    <span className="text-[11px] text-zinc-500 mt-1">{p.desc}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Duration Selector */}
            <div className="space-y-2">
              <label className="text-xs font-semibold text-zinc-400 uppercase tracking-wider">DURATION</label>
              <div className="grid grid-cols-2 gap-3">
                {[
                  { key: "12h", label: "12 Hours" },
                  { key: "24h", label: "24 Hours" }
                ].map((d) => (
                  <button 
                    key={d.key} 
                    onClick={() => setDuration(d.key as any)} 
                    className={`py-3 rounded-2xl font-bold text-sm border transition-all ${
                      duration === d.key ? "bg-[#2a1324] border-pink-500 text-white" : "bg-[#1c1c1e] border-zinc-800/80 text-zinc-400"
                    }`}
                  >
                    {d.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Interaction & Safety Section */}
            <div className="space-y-3">
              <label className="text-xs font-semibold text-zinc-400 uppercase tracking-wider">INTERACTION & SAFETY</label>
              
              {/* Add a poll */}
              <div className="flex items-center justify-between bg-[#1c1c1e] p-3.5 rounded-2xl border border-zinc-800/80">
                <div className="flex items-center gap-3">
                  <BarChart2 size={18} className="text-zinc-400" />
                  <div>
                    <div className="text-sm font-semibold text-white">Add a poll</div>
                    <div className="text-xs text-zinc-500">Let viewers vote on your moment</div>
                  </div>
                </div>
                <input 
                  type="checkbox" 
                  checked={addPoll} 
                  onChange={e => setAddPoll(e.target.checked)} 
                  className="w-5 h-5 accent-pink-500 rounded cursor-pointer" 
                />
              </div>

              {/* Screenshot alert */}
              <div className="flex items-center justify-between bg-[#1c1c1e] p-3.5 rounded-2xl border border-zinc-800/80">
                <div className="flex items-center gap-3">
                  <Bell size={18} className="text-zinc-400" />
                  <div>
                    <div className="text-sm font-semibold text-white">Screenshot alert</div>
                    <div className="text-xs text-zinc-500">Tell me when someone captures this moment</div>
                  </div>
                </div>
                <input 
                  type="checkbox" 
                  checked={screenshotAlert} 
                  onChange={e => setScreenshotAlert(e.target.checked)} 
                  className="w-5 h-5 accent-pink-500 rounded cursor-pointer" 
                />
              </div>

              {/* Allow downloads */}
              <div className="flex items-center justify-between bg-[#1c1c1e] p-3.5 rounded-2xl border border-zinc-800/80">
                <div className="flex items-center gap-3">
                  <Download size={18} className="text-zinc-400" />
                  <div>
                    <div className="text-sm font-semibold text-white">Allow downloads</div>
                    <div className="text-xs text-zinc-500">Viewers can save it with YW watermark</div>
                  </div>
                </div>
                <input 
                  type="checkbox" 
                  checked={allowDownloads} 
                  onChange={e => setAllowDownloads(e.target.checked)} 
                  className="w-5 h-5 accent-pink-500 rounded cursor-pointer" 
                />
              </div>

              {/* Save to archive */}
              <div className="flex items-center justify-between bg-[#1c1c1e] p-3.5 rounded-2xl border border-zinc-800/80">
                <div className="flex items-center gap-3">
                  <Archive size={18} className="text-zinc-400" />
                  <div>
                    <div className="text-sm font-semibold text-white">Save to archive</div>
                    <div className="text-xs text-zinc-500">Keep a private copy after it expires</div>
                  </div>
                </div>
                <input 
                  type="checkbox" 
                  checked={saveToArchive} 
                  onChange={e => setSaveToArchive(e.target.checked)} 
                  className="w-5 h-5 accent-pink-500 rounded cursor-pointer" 
                />
              </div>
            </div>

            {/* Share Moment Button */}
            <button 
              onClick={() => { alert("Moment Published Successfully! 🚀"); navigate({ to: ".." }); }} 
              className="w-full py-4 bg-gradient-to-r from-teal-400 via-pink-500 to-rose-500 text-white font-black text-base rounded-full shadow-2xl active:scale-98 transition-transform mt-4"
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
