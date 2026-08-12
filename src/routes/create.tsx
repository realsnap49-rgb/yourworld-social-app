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
  Video,
  Radio,
  Grid,
  Infinity as BoomerangIcon,
  LayoutGrid,
  Scissors,
  Type,
  Crop,
  ZoomIn,
  RotateCw,
  Wand2,
  Sparkle,
  Move
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
  const [selectedMedia, setSelectedMedia] = useState<string | null>(null);

  // Editor States: Crop, Scale & Manual Drag Positions
  const [activeTool, setActiveTool] = useState<string | null>(null);
  const [textOverlay, setTextOverlay] = useState("");
  const [selectedFilter, setSelectedFilter] = useState("None");
  const [selectedAudio, setSelectedAudio] = useState<string | null>(null);
  
  const [scale, setScale] = useState(1);
  const [rotation, setRotation] = useState(0);
  const [aspectRatio, setAspectRatio] = useState("9:16");
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const dragStartRef = useRef({ x: 0, y: 0 });

  // Real Camera Ref & Initializer
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const [facingMode, setFacingMode] = useState<"user" | "environment">("user");
  const [camError, setCamError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    const attach = (s: MediaStream) => {
      streamRef.current = s;
      const el = videoRef.current;
      if (!el) return;
      el.srcObject = s;
      el.muted = true;
      el.setAttribute("playsinline", "true");
      el.play().catch(() => {
        // iOS can reject autoplay until a gesture; retry on first tap
        const retry = () => {
          el.play().catch(() => {});
          document.removeEventListener("touchend", retry);
          document.removeEventListener("click", retry);
        };
        document.addEventListener("touchend", retry, { once: true });
        document.addEventListener("click", retry, { once: true });
      });
    };

    const start = async () => {
      if (typeof navigator === "undefined" || !navigator.mediaDevices?.getUserMedia) {
        setCamError("Camera not supported on this browser.");
        return;
      }
      const attempts: MediaStreamConstraints[] = [
        { video: { facingMode: { ideal: facingMode }, width: { ideal: 1280 }, height: { ideal: 720 } }, audio: true },
        { video: { facingMode: { ideal: facingMode } }, audio: false },
        { video: true, audio: false },
      ];
      for (const constraints of attempts) {
        try {
          const s = await navigator.mediaDevices.getUserMedia(constraints);
          if (cancelled) {
            s.getTracks().forEach((t) => t.stop());
            return;
          }
          setCamError(null);
          attach(s);
          return;
        } catch (err: any) {
          if (err?.name === "NotAllowedError" || err?.name === "SecurityError") {
            if (!cancelled) setCamError("Camera permission denied. Enable it in your browser settings.");
            return;
          }
        }
      }
      if (!cancelled) setCamError("No camera available on this device.");
    };

    start();

    return () => {
      cancelled = true;
      streamRef.current?.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
      if (videoRef.current) videoRef.current.srcObject = null;
    };
  }, [facingMode]);

  // Gallery File Selection
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const url = URL.createObjectURL(file);
      setSelectedMedia(url);
      setShowEditor(true);
    }
  };

  // Dragging logic for manual cropping position
  const handleMouseDown = (e: React.MouseEvent | React.TouchEvent) => {
    setIsDragging(true);
    const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
    const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY;
    dragStartRef.current = { x: clientX - position.x, y: clientY - position.y };
  };

  const handleMouseMove = (e: React.MouseEvent | React.TouchEvent) => {
    if (!isDragging) return;
    const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
    const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY;
    setPosition({
      x: clientX - dragStartRef.current.x,
      y: clientY - dragStartRef.current.y
    });
  };

  const handleMouseUp = () => setIsDragging(false);

  // Recording Progress
  useEffect(() => {
    let interval: any;
    if (isRecording) {
      interval = setInterval(() => {
        setRecordProgress((prev) => {
          if (prev >= 100) {
            setIsRecording(false);
            setShowEditor(true);
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
      
      <input 
        type="file" 
        ref={fileInputRef} 
        onChange={handleFileChange} 
        accept="image/*,video/*" 
        className="hidden" 
      />

      {/* Reel Progress Bar */}
      {activeMode === "REEL" && (
        <div className="absolute top-0 left-0 right-0 z-30 h-1.5 bg-white/20">
          <div 
            className="h-full bg-gradient-to-r from-pink-500 via-purple-600 to-amber-500 transition-all duration-150"
            style={{ width: `${recordProgress}%` }}
          />
        </div>
      )}

      {/* Header */}
      <div className="flex items-center justify-between p-4 z-20 bg-gradient-to-b from-black/80 via-black/40 to-transparent pt-6">
        <button 
          onClick={() => navigate({ to: "/" })} 
          className="p-2 rounded-full bg-black/40 backdrop-blur-xl border border-white/10 hover:bg-black/60 transition active:scale-90"
        >
          <X className="w-5 h-5 text-white" />
        </button>

        {activeMode === "REEL" && (
          <button 
            onClick={() => setSelectedAudio(selectedAudio ? null : "Trending Sound - Original Audio")}
            className="flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-black/50 backdrop-blur-xl border border-white/15 text-xs font-semibold hover:border-pink-500/50 transition active:scale-95"
          >
            <Music className="w-3.5 h-3.5 text-pink-400 animate-pulse" />
            <span className="max-w-[120px] truncate">{selectedAudio || "Add Sound"}</span>
          </button>
        )}

        <div className="flex items-center gap-2">
          <button 
            onClick={() => setFlash(!flash)} 
            className={`p-2 rounded-full backdrop-blur-xl border transition active:scale-90 ${
              flash ? "bg-amber-400 text-black border-amber-300" : "bg-black/40 text-white border-white/10"
            }`}
          >
            {flash ? <Zap className="w-4 h-4 fill-current" /> : <ZapOff className="w-4 h-4" />}
          </button>

          <button
            onClick={() => setFacingMode((m) => (m === "user" ? "environment" : "user"))}
            className="p-2 rounded-full bg-black/40 backdrop-blur-xl border border-white/10 text-white active:scale-90 transition"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Side Toolbar */}
      <div className="absolute left-3 top-20 z-20 flex flex-col gap-3 bg-black/40 backdrop-blur-md p-1.5 rounded-full border border-white/10 shadow-xl">
        <button onClick={() => setIsBoomerang(!isBoomerang)} className={`p-2 rounded-full transition ${isBoomerang ? "bg-pink-500 text-white" : "text-white/80"}`}>
          <BoomerangIcon className="w-4 h-4" />
        </button>
        <button onClick={() => setIsLayoutGrid(!isLayoutGrid)} className={`p-2 rounded-full transition ${isLayoutGrid ? "bg-cyan-500 text-white" : "text-white/80"}`}>
          <LayoutGrid className="w-4 h-4" />
        </button>
        <button onClick={() => setSpeed(speed === "1x" ? "2x" : "1x")} className="p-2 rounded-full text-white/80 font-bold text-[10px]">
          {speed}
        </button>
        <button className="p-2 rounded-full text-white/80"><Sparkles className="w-4 h-4 text-amber-300" /></button>
        <button className="p-2 rounded-full text-white/80"><Wand2 className="w-4 h-4 text-purple-400" /></button>
        <button className="p-2 rounded-full text-white/80"><Clock className="w-4 h-4 text-emerald-400" /></button>
      </div>

      {/* Camera Live Stream Element */}
      <div className="absolute inset-0 bg-black z-0 flex items-center justify-center overflow-hidden">
        <video 
          ref={videoRef} 
          autoPlay 
          playsInline 
          muted 
          className={`w-full h-full object-cover ${facingMode === "user" ? "scale-x-[-1]" : ""}`}
        />
        {camError && (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 p-8 text-center">
            <p className="text-sm text-zinc-300 max-w-xs">{camError}</p>
            <button
              onClick={() => { setCamError(null); setFacingMode((m) => m); location.reload(); }}
              className="px-4 py-2 rounded-full bg-white/10 border border-white/20 text-xs font-semibold"
            >
              Retry
            </button>
          </div>
        )}
      </div>

      {/* Shutter Controls */}
      <div className="flex flex-col items-center gap-5 pb-8 z-20 bg-gradient-to-t from-black via-black/80 to-transparent pt-14">
        <div className="flex items-center justify-around w-full px-8">
          <button 
            onClick={() => fileInputRef.current?.click()}
            className="w-11 h-11 rounded-2xl border-2 border-white/40 bg-zinc-900 overflow-hidden flex items-center justify-center active:scale-95 transition shadow-2xl"
          >
            <ImageIcon className="w-5 h-5 text-zinc-300" />
          </button>

          <button 
            onClick={() => setIsRecording(!isRecording)}
            className="relative flex items-center justify-center group"
          >
            <div className={`rounded-full transition-all duration-300 flex items-center justify-center ${
              isRecording ? "w-20 h-20 border-4 border-red-500 bg-red-500/20 animate-pulse" : "w-20 h-20 border-4 border-white p-1"
            }`}>
              <div className={`transition-all duration-300 ${isRecording ? "w-8 h-8 rounded-md bg-red-500" : "w-full h-full rounded-full bg-white"}`} />
            </div>
          </button>

          <button onClick={() => setShowEditor(true)} className="w-11 h-11 rounded-2xl bg-white/10 backdrop-blur-xl border border-white/15 flex items-center justify-center text-white active:scale-95 transition">
            <ChevronRight className="w-5 h-5" />
          </button>
        </div>

        {/* Mode Swiper */}
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

      {/* EDITOR MODAL WITH MANUAL DRAG & CROP ADJUSTMENTS */}
      {showEditor && (
        <div className="fixed inset-0 z-50 bg-black text-white flex flex-col justify-between animate-in fade-in duration-200">
          
          <div className="flex items-center justify-between p-4 border-b border-zinc-800 bg-zinc-950">
            <button onClick={() => setShowEditor(false)} className="p-2 rounded-full hover:bg-zinc-900">
              <X className="w-5 h-5" />
            </button>
            <span className="text-xs font-bold uppercase tracking-wider">Studio Editor</span>
            <button onClick={() => { alert("Post Shared!"); setShowEditor(false); navigate({ to: "/" }); }} className="px-4 py-1.5 bg-gradient-to-r from-pink-500 to-purple-600 rounded-full text-xs font-bold">
              Share
            </button>
          </div>

          {/* Interactive Canvas Viewport (Supports Drag & Manual Position) */}
          <div className="flex-1 bg-zinc-950 flex items-center justify-center relative overflow-hidden p-4 select-none">
            <div 
              onMouseDown={handleMouseDown}
              onMouseMove={handleMouseMove}
              onMouseUp={handleMouseUp}
              onTouchStart={handleMouseDown}
              onTouchMove={handleMouseMove}
              onTouchEnd={handleMouseUp}
              className="relative overflow-hidden border border-white/20 rounded-2xl shadow-2xl cursor-grab active:cursor-grabbing flex items-center justify-center"
              style={{
                aspectRatio: aspectRatio === "1:1" ? "1/1" : aspectRatio === "4:5" ? "4/5" : "9/16",
                maxHeight: "100%",
                maxWidth: "100%"
              }}
            >
              {selectedMedia ? (
                <img 
                  src={selectedMedia} 
                  alt="Preview" 
                  draggable={false}
                  className={`w-full h-full object-cover pointer-events-none transition-transform duration-75 ${
                    selectedFilter === "Vintage" ? "sepia" : selectedFilter === "B&W" ? "grayscale" : ""
                  }`} 
                  style={{
                    transform: `translate(${position.x}px, ${position.y}px) scale(${scale}) rotate(${rotation}deg)`
                  }}
                />
              ) : (
                <div className="text-center p-6">
                  <Video className="w-10 h-10 text-pink-500 mx-auto mb-2 animate-pulse" />
                  <p className="text-xs text-zinc-400">Captured Media Preview</p>
                </div>
              )}

              {/* Position Guide Icon */}
              <div className="absolute top-2 right-2 p-1.5 rounded-full bg-black/60 backdrop-blur-md text-white/80 pointer-events-none">
                <Move className="w-3.5 h-3.5" />
              </div>

              {textOverlay && (
                <div className="absolute text-2xl font-black text-white bg-black/50 px-4 py-2 rounded-xl backdrop-blur-md">
                  {textOverlay}
                </div>
              )}
            </div>
          </div>

          {/* Active Tool Control Strip */}
          {activeTool && (
            <div className="bg-zinc-900 border-t border-zinc-800 p-3">
              {activeTool === "zoom" && (
                <div className="flex items-center gap-3 text-xs px-2">
                  <span className="text-zinc-400 font-semibold">Zoom & Pan:</span>
                  <input 
                    type="range" min="1" max="3.5" step="0.1" value={scale} 
                    onChange={(e) => setScale(parseFloat(e.target.value))} 
                    className="w-full accent-pink-500" 
                  />
                  <span className="font-bold text-pink-400">{scale.toFixed(1)}x</span>
                  <button onClick={() => setPosition({ x: 0, y: 0 })} className="text-[10px] bg-zinc-800 px-2 py-1 rounded">Reset Pos</button>
                </div>
              )}

              {activeTool === "crop" && (
                <div className="flex items-center justify-between text-xs px-2">
                  <div className="flex items-center gap-2">
                    <span className="text-zinc-400 font-semibold">Ratio:</span>
                    {["9:16", "1:1", "4:5"].map((r) => (
                      <button 
                        key={r} onClick={() => setAspectRatio(r)}
                        className={`px-3 py-1 rounded-full border ${aspectRatio === r ? "border-pink-500 bg-pink-500/20 text-white font-bold" : "border-zinc-700 text-zinc-400"}`}
                      >
                        {r}
                      </button>
                    ))}
                  </div>
                  <button onClick={() => setRotation((prev) => (prev + 90) % 360)} className="px-2.5 py-1 rounded-lg bg-zinc-800 text-zinc-300 flex items-center gap-1 text-[11px]">
                    <RotateCw className="w-3 h-3" /> Rotate
                  </button>
                </div>
              )}

              {activeTool === "text" && (
                <div className="flex items-center gap-2">
                  <input 
                    type="text" placeholder="Add caption overlay..." value={textOverlay}
                    onChange={(e) => setTextOverlay(e.target.value)}
                    className="w-full bg-zinc-800 border border-zinc-700 rounded-xl px-3 py-1.5 text-xs text-white outline-none"
                  />
                  <button onClick={() => setActiveTool(null)} className="text-xs text-pink-400 font-bold px-2">Done</button>
                </div>
              )}
            </div>
          )}

          {/* Bottom Toolbar */}
          <div className="bg-zinc-950 border-t border-zinc-800 p-3">
            <div className="flex items-center justify-around gap-2">
              <button onClick={() => setActiveTool("zoom")} className="flex flex-col items-center gap-1 text-[10px] text-zinc-300">
                <div className="p-2.5 bg-zinc-900 rounded-xl border border-zinc-800"><ZoomIn className="w-4 h-4 text-pink-400" /></div>
                <span>Zoom & Position</span>
              </button>

              <button onClick={() => setActiveTool("crop")} className="flex flex-col items-center gap-1 text-[10px] text-zinc-300">
                <div className="p-2.5 bg-zinc-900 rounded-xl border border-zinc-800"><Crop className="w-4 h-4 text-cyan-400" /></div>
                <span>Crop / Aspect</span>
              </button>

              <button onClick={() => setActiveTool("text")} className="flex flex-col items-center gap-1 text-[10px] text-zinc-300">
                <div className="p-2.5 bg-zinc-900 rounded-xl border border-zinc-800"><Type className="w-4 h-4 text-purple-400" /></div>
                <span>Text</span>
              </button>

              <button onClick={() => alert("Music Overlay Opened")} className="flex flex-col items-center gap-1 text-[10px] text-zinc-300">
                <div className="p-2.5 bg-zinc-900 rounded-xl border border-zinc-800"><Music className="w-4 h-4 text-amber-400" /></div>
                <span>Music</span>
              </button>
            </div>
          </div>

        </div>
      )}

    </div>
  );
}
