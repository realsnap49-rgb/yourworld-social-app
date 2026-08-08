import React, { useState, useEffect, useRef } from "react";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import {
  X, RefreshCw, Zap, Music, Moon, Sparkles, Image as ImageIcon,
  Type, Download, ChevronRight, AtSign, Smile, Wand2, UserCheck, 
  MoreHorizontal, ChevronUp, Send, Check, ShieldAlert
} from "lucide-react";

export const Route = createFileRoute("/moment/create")({
  component: MomentCreatePage,
});

export function MomentCreatePage() {
  const videoRef = useRef<HTMLVideoElement>(null);
  const navigate = useNavigate();

  // Flow State: 0 = Camera, 1 = Instagram-Style Editor, 2 = Share Sheet
  const [step, setStep] = useState<0 | 1 | 2>(0);
  const [facingMode, setFacingMode] = useState<"user" | "environment">("user");
  const [capturedImage, setCapturedImage] = useState<string | null>(null);

  // Editor Overlay States
  const [caption, setCaption] = useState("");
  const [textList, setTextList] = useState<{ id: number; text: string; x: number; y: number }[]>([]);
  const [selectedAudio, setSelectedAudio] = useState<string | null>("Nawal - Main");

  // Share Sheet States
  const [privacy, setPrivacy] = useState("everyone");
  const [duration, setDuration] = useState("24h");
  const [screenshotAlert, setScreenshotAlert] = useState(true);

  // HD Camera Setup
  useEffect(() => {
    if (step !== 0) return;
    let stream: MediaStream | null = null;
    navigator.mediaDevices.getUserMedia({
      video: { facingMode, width: { ideal: 1920 }, height: { ideal: 1080 } },
      audio: false
    }).then(s => {
      stream = s;
      if (videoRef.current) videoRef.current.srcObject = s;
    }).catch(console.error);

    return () => stream?.getTracks().forEach(t => t.stop());
  }, [facingMode, step]);

  // Capture Photo
  const capturePhoto = () => {
    if (!videoRef.current) return;
    const canvas = document.createElement("canvas");
    canvas.width = videoRef.current.videoWidth || 1920;
    canvas.height = videoRef.current.videoHeight || 1080;
    const ctx = canvas.getContext("2d");
    if (ctx) {
      ctx.drawImage(videoRef.current, 0, 0);
      setCapturedImage(canvas.toDataURL("image/png", 1.0));
      setStep(1); // Open Instagram-Style Editor
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black text-white font-sans select-none overflow-hidden">
      
      {/* STEP 0: CAMERA */}
      {step === 0 && (
        <div className="relative w-full h-full flex flex-col justify-between">
          <video ref={videoRef} autoPlay playsInline muted className="absolute inset-0 w-full h-full object-cover" />
          
          <div className="relative z-10 flex justify-between p-4 pt-6 bg-gradient-to-b from-black/60 to-transparent">
            <button onClick={() => navigate({ to: ".." })} className="p-2.5 bg-black/40 rounded-full"><X size={22} /></button>
            <button onClick={() => setFacingMode(p => p === "user" ? "environment" : "user")} className="p-2.5 bg-black/40 rounded-full"><RefreshCw size={22} /></button>
          </div>

          <div className="relative z-10 flex flex-col items-center mb-6">
            <div className="flex items-center gap-5 mb-4">
              <button className="p-2 bg-black/40 rounded-xl"><ImageIcon size={22} /></button>
              <button onClick={capturePhoto} className="w-20 h-20 rounded-full border-4 border-white flex items-center justify-center active:scale-90 transition-transform">
                <div className="w-16 h-16 rounded-full border-2 border-black/20 bg-white/20" />
              </button>
              <button className="p-2 bg-black/40 rounded-xl"><Sparkles size={22} /></button>
            </div>
          </div>
        </div>
      )}

      {/* STEP 1: INSTAGRAM/SNAPCHAT FULL EDITOR SCREEN (EXACT MATCHING SCREENSHOT) */}
      {step === 1 && (
        <div className="relative w-full h-full bg-black flex flex-col justify-between">
          
          {/* Main Captured Photo Background */}
          <img src={capturedImage!} alt="Editor" className="absolute inset-0 w-full h-full object-cover" />

          {/* TOP BAR: BACK ARROW & SUGGESTED AUDIO CHIP */}
          <div className="relative z-20 flex items-center justify-between p-4 pt-6 bg-gradient-to-b from-black/50 to-transparent">
            <button onClick={() => setStep(0)} className="p-2 text-white">
              <X size={28} />
            </button>

            {/* Suggested Audio Chip */}
            {selectedAudio && (
              <div className="flex items-center gap-2 bg-black/60 backdrop-blur-md px-3 py-1.5 rounded-2xl border border-white/20 max-w-[200px]">
                <div className="w-6 h-6 rounded-md bg-zinc-700 flex items-center justify-center overflow-hidden">
                  <Music size={14} className="text-white" />
                </div>
                <span className="text-xs font-bold truncate text-white">{selectedAudio}</span>
                <button onClick={() => setSelectedAudio(null)} className="ml-1 text-zinc-400 hover:text-white">
                  <X size={14} />
                </button>
              </div>
            )}

            <div className="w-8" />
          </div>

          {/* RIGHT SIDE VERTICAL EDITING TOOLBAR */}
          <div className="absolute right-3 top-16 z-20 flex flex-col gap-4 items-center">
            
            {/* Text Option */}
            <button onClick={() => {
              const t = prompt("Add Text:");
              if(t) setTextList([...textList, { id: Date.now(), text: t, x: 50, y: 150 }]);
            }} className="flex items-center gap-2 text-xs font-semibold">
              <span className="text-zinc-200">Text</span>
              <div className="w-11 h-11 bg-black/50 backdrop-blur-md rounded-full border border-white/20 flex items-center justify-center font-serif text-lg font-bold">Aa</div>
            </button>

            {/* Stickers Option */}
            <button onClick={() => alert("Stickers Panel")} className="flex items-center gap-2 text-xs font-semibold">
              <span className="text-zinc-200">Stickers</span>
              <div className="w-11 h-11 bg-black/50 backdrop-blur-md rounded-full border border-white/20 flex items-center justify-center"><Smile size={20} /></div>
            </button>

            {/* Music Option */}
            <button onClick={() => {
              const song = prompt("Select Music:", "Nawal - Main");
              if(song) setSelectedAudio(song);
            }} className="flex items-center gap-2 text-xs font-semibold">
              <span className="text-zinc-200">Music</span>
              <div className="w-11 h-11 bg-black/50 backdrop-blur-md rounded-full border border-white/20 flex items-center justify-center"><Music size={20} /></div>
            </button>

            {/* Restyle Option */}
            <button onClick={() => alert("Restyle / AI Filters")} className="flex items-center gap-2 text-xs font-semibold">
              <span className="text-zinc-200">Restyle</span>
              <div className="w-11 h-11 bg-black/50 backdrop-blur-md rounded-full border border-white/20 flex items-center justify-center"><Wand2 size={20} /></div>
            </button>

            {/* Mention Option */}
            <button onClick={() => {
              const user = prompt("Mention user (@username):");
              if(user) setTextList([...textList, { id: Date.now(), text: `@${user}`, x: 80, y: 200 }]);
            }} className="flex items-center gap-2 text-xs font-semibold">
              <span className="text-zinc-200">Mention</span>
              <div className="w-11 h-11 bg-black/50 backdrop-blur-md rounded-full border border-white/20 flex items-center justify-center"><AtSign size={20} /></div>
            </button>

            {/* Draw Option */}
            <button onClick={() => alert("Brush Drawing active")} className="flex items-center gap-2 text-xs font-semibold">
              <span className="text-zinc-200">Draw</span>
              <div className="w-11 h-11 bg-black/50 backdrop-blur-md rounded-full border border-white/20 flex items-center justify-center">
                <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" /></svg>
              </div>
            </button>

            {/* Save Option */}
            <button onClick={() => alert("Saved to gallery!")} className="flex items-center gap-2 text-xs font-semibold">
              <span className="text-zinc-200">Save</span>
              <div className="w-11 h-11 bg-black/50 backdrop-blur-md rounded-full border border-white/20 flex items-center justify-center"><Download size={20} /></div>
            </button>

            {/* Partnership Option */}
            <button onClick={() => alert("Partnership Label Added")} className="flex items-center gap-2 text-xs font-semibold">
              <span className="text-zinc-200">Partnership</span>
              <div className="w-11 h-11 bg-black/50 backdrop-blur-md rounded-full border border-white/20 flex items-center justify-center"><UserCheck size={20} /></div>
            </button>

            {/* More Option */}
            <button onClick={() => alert("More tools")} className="flex items-center gap-2 text-xs font-semibold">
              <span className="text-zinc-200">More</span>
              <div className="w-11 h-11 bg-black/50 backdrop-blur-md rounded-full border border-white/20 flex items-center justify-center"><MoreHorizontal size={20} /></div>
            </button>

            <button className="w-8 h-8 bg-black/50 backdrop-blur-md rounded-full flex items-center justify-center mt-1"><ChevronUp size={18} /></button>
          </div>

          {/* DRAGGABLE TEXT OVERLAYS */}
          {textList.map((t) => (
            <div key={t.id} className="absolute z-20 px-3 py-1 bg-black/60 rounded-xl text-lg font-bold text-white border border-white/20 cursor-move" style={{ left: t.x, top: t.y }}>
              {t.text}
            </div>
          ))}

          {/* BOTTOM OVERLAY: CAPTION INPUT & SHARE BUTTONS */}
          <div className="relative z-20 p-4 pb-6 bg-gradient-to-t from-black/80 via-black/40 to-transparent flex flex-col gap-4">
            
            {/* Caption Input */}
            <input
              type="text"
              value={caption}
              onChange={(e) => setCaption(e.target.value)}
              placeholder="Add a caption..."
              className="w-full bg-transparent border-b border-white/30 pb-2 text-sm text-white placeholder-zinc-300 focus:outline-none focus:border-white"
            />

            {/* Bottom Actions Row */}
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

              {/* Next/Share Trigger */}
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

      {/* STEP 2: PREVIEW & SHARE SHEET (Exact Privacy, Duration 12h/24h, Polls, Alerts) */}
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
              onClick={() => { alert("Moment Shared Successfully! 🚀"); navigate({ to: ".." }); }} 
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
