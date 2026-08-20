import React, { useState, useRef, useEffect } from "react";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import {
  X, RefreshCw, Zap, Music, Sparkles, Image as ImageIcon,
  Type, Pencil, Download, Smile, Wand2, ChevronRight, Star, Trash2
} from "lucide-react";

export const Route = createFileRoute("/moment/create")({
  component: MomentCreatePage,
});

export function MomentCreatePage() {
  const navigate = useNavigate();
  const imageInputRef = useRef<HTMLInputElement>(null);
  const audioInputRef = useRef<HTMLInputElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const [step, setStep] = useState<0 | 1>(0);
  const [capturedImage, setCapturedImage] = useState<string | null>(null);
  const [selectedAudio, setSelectedAudio] = useState<string | null>(null);
  const [caption, setCaption] = useState("");
  
  // Real Snapchat Tool States
  const [overlayText, setOverlayText] = useState("");
  const [showTextInput, setShowTextInput] = useState(false);
  const [isDrawingMode, setIsDrawingMode] = useState(false);
  const [isDrawing, setIsDrawing] = useState(false);

  // 1. Gallery Photo Upload
  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setCapturedImage(URL.createObjectURL(file));
      setStep(1);
    }
  };

  // 2. Gallery Audio/Music Picker
  const handleAudioUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setSelectedAudio(e.target.files[0].name);
    }
  };

  // 3. Shutter Click Snap
  const capturePhoto = () => {
    setCapturedImage("https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=800&q=80");
    setStep(1);
  };

  // 4. Real Canvas Pencil Drawing Logic
  const startDrawing = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    if (!isDrawingMode) return;
    setIsDrawing(true);
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    
    const rect = canvas.getBoundingClientRect();
    const x = ('touches' in e) ? e.touches[0].clientX - rect.left : e.clientX - rect.left;
    const y = ('touches' in e) ? e.touches[0].clientY - rect.top : e.clientY - rect.top;

    ctx.strokeStyle = "#ff0055";
    ctx.lineWidth = 4;
    ctx.lineCap = "round";
    ctx.beginPath();
    ctx.moveTo(x, y);
  };

  const draw = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    if (!isDrawing || !isDrawingMode) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const rect = canvas.getBoundingClientRect();
    const x = ('touches' in e) ? e.touches[0].clientX - rect.left : e.clientX - rect.left;
    const y = ('touches' in e) ? e.touches[0].clientY - rect.top : e.clientY - rect.top;

    ctx.lineTo(x, y);
    ctx.stroke();
  };

  const stopDrawing = () => {
    setIsDrawing(false);
  };

  // 5. Download Image to Device Storage
  const handleDownload = () => {
    if (!capturedImage) return;
    const link = document.createElement("a");
    link.href = capturedImage;
    link.download = `snap-moment-${Date.now()}.jpg`;
    link.click();
  };

  // 6. Real Publish Handler (Saves to App State / LocalStorage)
  const handlePublish = (target: string) => {
    const newMoment = {
      id: Date.now().toString(),
      image: capturedImage || "https://images.unsplash.com/photo-1534528741775-53994a69daeb",
      caption: caption || overlayText,
      audio: selectedAudio,
      privacy: target,
      createdAt: new Date().toISOString()
    };

    const existingMoments = JSON.parse(localStorage.getItem("yw_moments") || "[]");
    localStorage.setItem("yw_moments", JSON.stringify([newMoment, ...existingMoments]));

    // Route back to Moments view
    navigate({ to: "/moment" });
  };

  return (
    <div className="relative w-full h-screen bg-black overflow-hidden flex flex-col justify-between text-white select-none">
      {/* Hidden File Inputs */}
      <input type="file" ref={imageInputRef} className="hidden" accept="image/*,video/*" onChange={handleImageUpload} />
      <input type="file" ref={audioInputRef} className="hidden" accept="audio/*" onChange={handleAudioUpload} />

      {step === 0 ? (
        /* ================= STEP 0: CAMERA VIEW ================= */
        <div className="relative w-full h-full flex flex-col justify-between p-4">
          <div className="flex justify-between items-center z-10 pt-2">
            <button onClick={() => navigate({ to: ".." })} className="p-2.5 bg-black/40 backdrop-blur-md rounded-full active:scale-90 transition">
              <X size={22} />
            </button>
          </div>

          <div className="flex items-center justify-around z-10 pb-8">
            <button onClick={() => imageInputRef.current?.click()} className="p-3 bg-black/40 backdrop-blur-md rounded-2xl active:scale-90 transition">
              <ImageIcon size={24} />
            </button>
            
            {/* Snapchat Double Ring Shutter */}
            <button onClick={capturePhoto} className="relative flex items-center justify-center w-20 h-20 rounded-full border-4 border-white p-1 active:scale-90 transition shadow-lg shadow-white/30">
              <div className="w-full h-full rounded-full bg-white shadow-inner" />
            </button>

            <button className="p-3 bg-black/40 backdrop-blur-md rounded-2xl active:scale-90 transition">
              <Sparkles size={24} />
            </button>
          </div>
        </div>
      ) : (
        /* ================= STEP 1: SNAPCHAT EDITOR VIEW ================= */
        <div className="relative w-full h-full flex flex-col justify-between p-4 bg-zinc-900">
          
          {/* Background Captured Image */}
          {capturedImage && (
            <img src={capturedImage} alt="Moment Preview" className="absolute inset-0 w-full h-full object-cover z-0 pointer-events-none" />
          )}

          {/* Interactive Drawing Canvas Layer */}
          <canvas
            ref={canvasRef}
            width={window.innerWidth}
            height={window.innerHeight}
            onMouseDown={startDrawing}
            onMouseMove={draw}
            onMouseUp={stopDrawing}
            onTouchStart={startDrawing}
            onTouchMove={draw}
            onTouchEnd={stopDrawing}
            className={`absolute inset-0 z-10 ${isDrawingMode ? 'cursor-crosshair pointer-events-auto' : 'pointer-events-none'}`}
          />

          {/* Screen Text Overlay Display */}
          {overlayText && (
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-20 bg-black/60 backdrop-blur-sm px-5 py-2.5 rounded-2xl text-xl font-extrabold text-white shadow-2xl border border-white/20">
              {overlayText}
            </div>
          )}

          {/* Top Control Bar */}
          <div className="flex justify-between items-center z-30 pt-2">
            <button onClick={() => setStep(0)} className="p-2.5 bg-black/50 backdrop-blur-md rounded-full active:scale-90 transition">
              <X size={22} />
            </button>
            
            {/* Selected Music Badge */}
            {selectedAudio && (
              <div className="flex items-center gap-2 bg-black/60 backdrop-blur-md px-4 py-1.5 rounded-full border border-white/20 text-xs font-semibold">
                <Music size={14} className="text-pink-400 animate-pulse" />
                <span className="max-w-[150px] truncate">{selectedAudio}</span>
              </div>
            )}
          </div>

          {/* Floating Right Snapchat Toolbar */}
          <div className="absolute right-4 top-20 z-30 flex flex-col gap-3 p-2 rounded-full bg-black/50 backdrop-blur-md border border-white/10 shadow-2xl">
            {/* Text Tool */}
            <button onClick={() => setShowTextInput(!showTextInput)} className={`w-10 h-10 rounded-full flex items-center justify-center font-bold text-base transition ${showTextInput ? 'bg-white text-black' : 'hover:bg-white/20'}`}>
              Aa
            </button>

            {/* Music Picker Tool */}
            <button onClick={() => audioInputRef.current?.click()} className="w-10 h-10 rounded-full flex items-center justify-center hover:bg-white/20 transition">
              <Music size={20} />
            </button>

            {/* Pencil Drawing Tool */}
            <button onClick={() => setIsDrawingMode(!isDrawingMode)} className={`w-10 h-10 rounded-full flex items-center justify-center transition ${isDrawingMode ? 'bg-pink-500 text-white' : 'hover:bg-white/20'}`}>
              <Pencil size={20} />
            </button>

            {/* Download Tool */}
            <button onClick={handleDownload} className="w-10 h-10 rounded-full flex items-center justify-center hover:bg-white/20 transition">
              <Download size={20} />
            </button>
          </div>

          {/* Text Overlay Input Field */}
          {showTextInput && (
            <div className="z-30 mb-2">
              <input
                type="text"
                autoFocus
                placeholder="Type overlay text..."
                value={overlayText}
                onChange={(e) => setOverlayText(e.target.value)}
                className="w-full bg-black/80 backdrop-blur-md border border-white/20 rounded-xl px-4 py-2.5 text-white placeholder-zinc-400 focus:outline-none"
              />
            </div>
          )}

          {/* Bottom Share Bar */}
          <div className="z-30 flex flex-col gap-3 pb-6">
            <input
              type="text"
              value={caption}
              onChange={(e) => setCaption(e.target.value)}
              placeholder="Add a caption..."
              className="w-full bg-black/60 backdrop-blur-md border border-white/20 rounded-xl px-4 py-3 text-sm text-white placeholder-zinc-400 focus:outline-none"
            />

            <div className="flex items-center justify-between gap-3">
              {/* Your Moment Instant Share */}
              <button onClick={() => handlePublish('everyone')} className="flex-1 py-3 px-4 rounded-full bg-black/70 border border-white/20 text-white font-semibold text-xs flex items-center justify-center gap-2 active:scale-95 transition">
                <div className="w-4 h-4 rounded-full bg-blue-500 flex items-center justify-center text-[10px] font-bold">YW</div>
                <span>Your moment</span>
              </button>

              {/* Close Friends Instant Share */}
              <button onClick={() => handlePublish('close_friends')} className="flex-1 py-3 px-4 rounded-full bg-black/70 border border-emerald-500/50 text-emerald-400 font-semibold text-xs flex items-center justify-center gap-2 active:scale-95 transition">
                <Star size={14} className="fill-emerald-400 text-emerald-400" />
                <span>Close Friends</span>
              </button>

              {/* Instant Next Button */}
              <button onClick={() => handlePublish('everyone')} className="w-12 h-12 rounded-full bg-indigo-600 text-white flex items-center justify-center active:scale-95 transition shadow-lg shadow-indigo-600/40">
                <ChevronRight size={22} />
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
