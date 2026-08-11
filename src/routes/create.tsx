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
  Sticker
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

  // Editor Sub-Tool States (Crop, Zoom & Interactive Controls)
  const [activeTool, setActiveTool] = useState<string | null>(null);
  const [textOverlay, setTextOverlay] = useState("");
  const [selectedFilter, setSelectedFilter] = useState("None");
  const [selectedAudio, setSelectedAudio] = useState<string | null>(null);
  
  // Crop & Zoom States
  const [scale, setScale] = useState(1); // Video Zoom (1x to 3x)
  const [rotation, setRotation] = useState(0); // Video Rotate (0, 90, 180, 270)
  const [aspectRatio, setAspectRatio] = useState("9:16"); // Crop Ratio

  // Camera & File Refs
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  // Initialize Real Camera
  useEffect(() => {
    let stream: MediaStream | null = null;
    navigator.mediaDevices?.getUserMedia({ video: true, audio: true })
      .then((s) => {
        stream = s;
        if (videoRef.current) {
          videoRef.current.srcObject = s;
        }
      })
      .catch((err) => console.log("Camera access error:", err));

    return () => {
      if (stream) {
        stream.getTracks().forEach((track) => track.stop());
      }
    };
  }, []);

  // Handle Gallery Selection
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const url = URL.createObjectURL(file);
      setSelectedMedia(url);
      setShowEditor(true);
    }
  };

  // Recording Progress Bar
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
      
      {/* Hidden Gallery Input */}
      <input 
        type="file" 
        ref={fileInputRef} 
        onChange={handleFileChange} 
        accept="image/*,video/*" 
        className="hidden" 
      />

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
          className="p-2 rounded-full bg-black/40 backdrop-blur-xl border border-white/10 hover:bg-black/60 transition active:scale-90"
        >
          <X className="w-5 h-5 text-white" />
        </button>

        {/* Audio Picker */}
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

          <button className="p-2 rounded-full bg-black/40 backdrop-blur-xl border border-white/10 text-white active:scale-90 transition">
            <RefreshCw className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Compact Side Toolbar */}
      <div className="absolute left-3 top-20 z-20 flex flex-col gap-3 bg-black/40 backdrop-blur-md p-1.5 rounded-full border border-white/10 shadow-xl">
        <button 
          onClick={() => setIsBoomerang(!isBoomerang)} 
          className={`p-2 rounded-full transition active:scale-90 ${isBoomerang ? "bg-pink-500 text-white" : "text-white/80 hover:bg-white/10"}`}
          title="Boomerang"
        >
          <BoomerangIcon className="w-4 h-4" />
        </button>

        <button 
          onClick={() => setIsLayoutGrid(!isLayoutGrid)} 
          className={`p-2 rounded-full transition active:scale-90 ${isLayoutGrid ? "bg-cyan-500 text-white" : "text-white/80 hover:bg-white/10"}`}
          title="Layout"
        >
          <LayoutGrid className="w-4 h-4" />
        </button>

        <button 
          onClick={() => setSpeed(speed === "1x" ? "2x" : speed === "2x" ? "0.5x" : "1x")}
          className="p-2 rounded-full text-white/80 hover:bg-white/10 font-bold text-[10px] active:scale-90 transition"
          title="Speed"
        >
          {speed}
        </button>

        <button className="p-2 rounded-full text-white/80 hover:bg-white/10 active:scale-90 transition" title="Effects">
          <Sparkles className="w-4 h-4 text-amber-300" />
        </button>

        <button className="p-2 rounded-full text-white/80 hover:bg-white/10 active:scale-90 transition" title="AutoCut">
          <Wand2 className="w-4 h-4 text-purple-400" />
        </button>

        <button className="p-2 rounded-full text-white/80 hover:bg-white/10 active:scale-90 transition" title="Timer">
          <Clock className="w-4 h-4 text-emerald-400" />
        </button>
      </div>

      {/* Live Camera Feed */}
      <div className="absolute inset-0 bg-black z-0 flex items-center justify-center">
        <video 
          ref={videoRef} 
          autoPlay 
          playsInline 
          muted 
          className="w-full h-full object-cover"
        />
      </div>

      {/* Bottom Controls */}
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
              isRecording 
                ? "w-20 h-20 border-4 border-red-500 bg-red-500/20 animate-pulse" 
                : "w-20 h-20 border-4 border-white p-1"
            }`}>
              <div className={`transition-all duration-300 ${
                isRecording 
                  ? "w-8 h-8 rounded-md bg-red-500" 
                  : "w-full h-full rounded-full bg-white group-hover:scale-95"
              }`} />
            </div>
          </button>

          <button 
            onClick={() => setShowEditor(true)}
            className="w-11 h-11 rounded-2xl bg-white/10 backdrop-blur-xl border border-white/15 flex items-center justify-center text-white active:scale-95 transition"
          >
            <ChevronRight className="w-5 h-5" />
          </button>
        </div>

        {/* Mode Swiper */}
        <div className="flex items-center gap-7 bg-zinc-950/80 backdrop-blur-2xl px-5 py-2 rounded-full border border-white/10 shadow-2xl">
          {(["POST", "REEL", "LIVE"] as Mode[]).map((mode) => (
            <button
              key={mode}
              onClick={() => {
                setActiveMode(mode);
                setIsRecording(false);
              }}
              className={`relative text-[11px] font-black tracking-widest transition-all duration-200 ${
                activeMode === mode 
                  ? "text-white scale-110 drop-shadow-[0_0_12px_rgba(255,255,255,0.9)]" 
                  : "text-zinc-500 hover:text-zinc-300"
              }`}
            >
              {mode}
              {activeMode === mode && (
                <span className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-1 h-1 rounded-full bg-white" />
              )}
            </button>
          ))}
        </div>
      </div>

      {/* FULL STUDIO EDITOR WITH CROP & ZOOM TOOLS */}
      {showEditor && (
        <div className="fixed inset-0 z-50 bg-black text-white flex flex-col justify-between animate-in fade-in duration-200">
          
          {/* Top Bar */}
          <div className="flex items-center justify-between p-4 border-b border-zinc-800 bg-zinc-950">
            <button onClick={() => setShowEditor(false)} className="p-2 rounded-full hover:bg-zinc-900">
              <X className="w-5 h-5" />
            </button>
            <span className="text-xs font-bold tracking-wider uppercase">YW Studio Editor</span>
            <button 
              onClick={() => {
                alert("Post Shared Successfully!");
                setShowEditor(false);
                navigate({ to: "/" });
              }}
              className="px-4 py-1.5 bg-gradient-to-r from-pink-500 to-purple-600 rounded-full text-xs font-bold shadow-lg hover:opacity-90 active:scale-95 transition"
            >
              Share Post
            </button>
          </div>

          {/* Realtime Interactive Media Viewport (Supports Scale & Crop Ratio) */}
          <div className="flex-1 bg-zinc-900 flex items-center justify-center relative overflow-hidden p-4">
            <div 
              className="relative transition-all duration-300 flex items-center justify-center overflow-hidden border border-white/10 rounded-2xl shadow-2xl"
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
                  className={`w-full h-full object-cover transition-transform duration-200 ${
                    selectedFilter === "Vintage" ? "sepia" : selectedFilter === "B&W" ? "grayscale" : ""
                  }`} 
                  style={{
                    transform: `scale(${scale}) rotate(${rotation}deg)`
                  }}
                />
              ) : (
                <div className="text-center p-6">
                  <Video className="w-12 h-12 text-pink-500 mx-auto mb-2 animate-pulse" />
                  <p className="text-xs text-zinc-400">Captured Reel Preview</p>
                </div>
              )}

              {/* Text Overlay Render */}
              {textOverlay && (
                <div className="absolute text-2xl font-black text-white bg-black/50 px-4 py-2 rounded-xl backdrop-blur-md drop-shadow-2xl">
                  {textOverlay}
                </div>
              )}
            </div>
          </div>

          {/* Interactive Sub-Tool Panels */}
          {activeTool && (
            <div className="bg-zinc-900 border-t border-zinc-800 p-3 flex items-center justify-between">
              
              {/* ZOOM CONTROLLER */}
              {activeTool === "zoom" && (
                <div className="w-full flex items-center gap-3 text-xs px-2">
                  <span className="font-semibold text-zinc-400">Zoom:</span>
                  <input 
                    type="range" 
                    min="1" 
                    max="3" 
                    step="0.1"
                    value={scale}
                    onChange={(e) => setScale(parseFloat(e.target.value))}
                    className="w-full accent-pink-500 cursor-pointer" 
                  />
                  <span className="font-bold text-pink-400">{scale.toFixed(1)}x</span>
                </div>
              )}

              {/* CROP RATIO CONTROLLER */}
              {activeTool === "crop" && (
                <div className="w-full flex items-center justify-between text-xs px-2">
                  <div className="flex items-center gap-2">
                    <span className="font-semibold text-zinc-400">Ratio:</span>
                    {["9:16", "1:1", "4:5"].map((r) => (
                      <button 
                        key={r}
                        onClick={() => setAspectRatio(r)}
                        className={`px-3 py-1 rounded-full border ${aspectRatio === r ? "border-pink-500 bg-pink-500/20 text-white font-bold" : "border-zinc-700 text-zinc-400"}`}
                      >
                        {r}
                      </button>
                    ))}
                  </div>

                  <button 
                    onClick={() => setRotation((prev) => (prev + 90) % 360)}
                    className="p-1.5 rounded-lg bg-zinc-800 border border-zinc-700 text-zinc-300 hover:text-white flex items-center gap-1 text-[11px]"
                  >
                    <RotateCw className="w-3.5 h-3.5" /> Rotate
                  </button>
                </div>
              )}

              {activeTool === "trim" && (
                <div className="w-full flex items-center gap-3 text-xs px-2">
                  <span className="font-semibold text-zinc-400">Trim:</span>
                  <input type="range" className="w-full accent-pink-500" />
                </div>
              )}

              {activeTool === "text" && (
                <div className="w-full flex items-center gap-2">
                  <input 
                    type="text" 
                    placeholder="Type text overlay..." 
                    value={textOverlay}
                    onChange={(e) => setTextOverlay(e.target.value)}
                    className="w-full bg-zinc-800 border border-zinc-700 rounded-xl px-3 py-1.5 text-xs text-white outline-none"
                  />
                  <button onClick={() => setActiveTool(null)} className="text-xs text-pink-400 font-bold px-2">Done</button>
                </div>
              )}

              {activeTool === "filter" && (
                <div className="w-full flex items-center gap-3 overflow-x-auto text-xs py-1">
                  {["None", "Vintage", "B&W", "Vivid"].map((f) => (
                    <button 
                      key={f}
                      onClick={() => setSelectedFilter(f)}
                      className={`px-3 py-1 rounded-full border ${selectedFilter === f ? "border-pink-500 bg-pink-500/20 text-white" : "border-zinc-700 text-zinc-400"}`}
                    >
                      {f}
                    </button>
                  ))}
                </div>
              )}

            </div>
          )}

          {/* Bottom Tool Selection Suite */}
          <div className="bg-zinc-950 border-t border-zinc-800 p-3">
            <div className="flex items-center justify-around gap-2">
              <button onClick={() => setActiveTool("zoom")} className="flex flex-col items-center gap-1 text-[10px] text-zinc-300 hover:text-white">
                <div className="p-2.5 bg-zinc-900 rounded-xl border border-zinc-800"><ZoomIn className="w-4 h-4 text-pink-400" /></div>
                <span>Zoom</span>
              </button>

              <button onClick={() => setActiveTool("crop")} className="flex flex-col items-center gap-1 text-[10px] text-zinc-300 hover:text-white">
                <div className="p-2.5 bg-zinc-900 rounded-xl border border-zinc-800"><Crop className="w-4 h-4 text-cyan-400" /></div>
                <span>Crop / Ratio</span>
              </button>

              <button onClick={() => setActiveTool("trim")} className="flex flex-col items-center gap-1 text-[10px] text-zinc-300 hover:text-white">
                <div className="p-2.5 bg-zinc-900 rounded-xl border border-zinc-800"><Scissors className="w-4 h-4 text-amber-400" /></div>
                <span>Trim</span>
              </button>

              <button onClick={() => setActiveTool("text")} className="flex flex-col items-center gap-1 text-[10px] text-zinc-300 hover:text-white">
                <div className="p-2.5 bg-zinc-900 rounded-xl border border-zinc-800"><Type className="w-4 h-4 text-purple-400" /></div>
                <span>Text</span>
              </button>

              <button onClick={() => setActiveTool("filter")} className="flex flex-col items-center gap-1 text-[10px] text-zinc-300 hover:text-white">
                <div className="p-2.5 bg-zinc-900 rounded-xl border border-zinc-800"><Sparkle className="w-4 h-4 text-emerald-400" /></div>
                <span>Filter</span>
              </button>
            </div>
          </div>

        </div>
      )}

    </div>
  );
}
