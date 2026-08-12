import React, { useState, useEffect, useRef } from "react";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { 
  X, RefreshCw, Zap, ZapOff, Music, Download, 
  RotateCw, Crop, ZoomIn, Captions, Languages, 
  Mic, Radio
} from "lucide-react";
import { NO_COPYRIGHT_MUSIC, MusicTrack } from "../../components/yw/MusicVault";

export const Route = createFileRoute("/create")({
  component: CreateStudioPage,
});

type Mode = "POST" | "REEL" | "LIVE";
type LiveType = "FACE" | "ANONYMOUS";

export function CreateStudioPage() {
  const navigate = useNavigate();
  const [activeMode, setActiveMode] = useState<Mode>("REEL");
  const [liveType, setLiveType] = useState<LiveType>("FACE");
  const [facing, setFacing] = useState<"user" | "environment">("user");
  const [flash, setFlash] = useState(false);
  
  // Recording & Media States
  const [isRecording, setIsRecording] = useState(false);
  const [videoUrl, setVideoUrl] = useState<string | null>(null);
  const [showEditor, setShowEditor] = useState(false);
  const [exportQuality, setExportQuality] = useState<"1080p" | "4K">("4K");

  // Sound & Music Vault
  const [selectedMusic, setSelectedMusic] = useState<MusicTrack | null>(null);
  const [showMusicVault, setShowMusicVault] = useState(false);
  const audioPlayerRef = useRef<HTMLAudioElement | null>(null);

  // Editor States
  const [scale, setScale] = useState(1);
  const [rotation, setRotation] = useState(0);
  const [aspectRatio, setAspectRatio] = useState<"9:16" | "1:1" | "16:9">("9:16");
  const [activeFilter, setActiveFilter] = useState("none");

  // AI Subtitles & Translation
  const [autoCaptionsEnabled, setAutoCaptionsEnabled] = useState(false);
  const [captionLanguage, setCaptionLanguage] = useState<"HI" | "EN" | "ES">("HI");
  const [generatedCaption, setGeneratedCaption] = useState("");

  const videoRef = useRef<HTMLVideoElement | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  // Ultra High Bitrate Camera Stream
  useEffect(() => {
    let stream: MediaStream | null = null;
    const initCamera = async () => {
      try {
        if (activeMode === "LIVE" && liveType === "ANONYMOUS") {
          stream = await navigator.mediaDevices.getUserMedia({ audio: true, video: false });
        } else {
          stream = await navigator.mediaDevices.getUserMedia({
            video: { facingMode: facing, width: { ideal: 3840 }, height: { ideal: 2160 } },
            audio: true
          });
          if (videoRef.current) {
            videoRef.current.srcObject = stream;
            videoRef.current.play().catch(() => {});
          }
        }
      } catch (err) {
        console.error("Camera Init Error:", err);
      }
    };

    if (!showEditor) initCamera();

    return () => {
      if (stream) stream.getTracks().forEach((t) => t.stop());
    };
  }, [facing, activeMode, liveType, showEditor]);

  // Recording Handler
  const toggleRecording = () => {
    if (!isRecording) {
      const stream = videoRef.current?.srcObject as MediaStream;
      if (!stream) return;

      const options = { mimeType: "video/webm;codecs=vp9", videoBitsPerSecond: 25000000 };
      try {
        mediaRecorderRef.current = new MediaRecorder(stream, options);
      } catch {
        mediaRecorderRef.current = new MediaRecorder(stream);
      }

      chunksRef.current = [];
      mediaRecorderRef.current.ondataavailable = (e) => chunksRef.current.push(e.data);
      mediaRecorderRef.current.onstop = () => {
        const blob = new Blob(chunksRef.current, { type: "video/webm" });
        setVideoUrl(URL.createObjectURL(blob));
        setShowEditor(true);
      };

      mediaRecorderRef.current.start();
      setIsRecording(true);

      if (selectedMusic && audioPlayerRef.current) {
        audioPlayerRef.current.play();
      }
    } else {
      mediaRecorderRef.current?.stop();
      setIsRecording(false);
      if (audioPlayerRef.current) audioPlayerRef.current.pause();
    }
  };

  // AI Caption Simulation
  useEffect(() => {
    if (autoCaptionsEnabled && showEditor) {
      const sampleCaptions = {
        HI: "YourWorld Studio par aapka swagat hai! 🔥",
        EN: "Welcome to YourWorld Pro Studio! 🔥",
        ES: "¡Bienvenido a YourWorld Pro Studio! 🔥"
      };
      setGeneratedCaption(sampleCaptions[captionLanguage]);
    } else {
      setGeneratedCaption("");
    }
  }, [autoCaptionsEnabled, captionLanguage, showEditor]);

  // Save Video
  const saveVideo = () => {
    if (!videoUrl) return;
    const a = document.createElement("a");
    a.href = videoUrl;
    a.download = `YourWorld_${exportQuality}_Creation.webm`;
    a.click();
    navigate({ to: "/" });
  };

  return (
    <div className="fixed inset-0 z-[99999] bg-black text-white flex flex-col justify-between overflow-hidden select-none font-sans">
      
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
        accept="image/*,video/*,audio/*" 
        className="hidden" 
      />

      {selectedMusic && <audio ref={audioPlayerRef} src={selectedMusic.url} loop />}

      {!showEditor ? (
        /* CAMERA & LIVE VIEWPORT */
        <div className="relative w-full h-full">
          {activeMode === "LIVE" && liveType === "ANONYMOUS" ? (
            <div className="w-full h-full bg-gradient-to-b from-purple-950 via-zinc-950 to-black flex flex-col items-center justify-center p-6">
              <div className="w-32 h-32 rounded-full bg-pink-600/30 border-4 border-pink-500 flex items-center justify-center animate-pulse">
                <Mic className="w-16 h-16 text-pink-400" />
              </div>
              <h2 className="mt-6 text-xl font-black">Anonymous Audio Live</h2>
              <p className="text-xs text-zinc-400 mt-2">Voice stream active • Camera Hidden</p>
            </div>
          ) : (
            <video ref={videoRef} autoPlay playsInline muted className="w-full h-full object-cover" />
          )}

          {/* Top Bar Controls */}
          <div className="absolute top-0 left-0 right-0 p-4 pt-6 flex justify-between items-center z-20 bg-gradient-to-b from-black/80 to-transparent">
            <button onClick={() => navigate({ to: "/" })} className="p-3 bg-black/50 backdrop-blur-md rounded-full border border-white/20">
              <X className="w-5 h-5" />
            </button>

            <button 
              onClick={() => setShowMusicVault(true)}
              className="flex items-center gap-2 px-4 py-2 bg-black/50 backdrop-blur-md rounded-full border border-white/20 text-xs font-bold"
            >
              <Music className="w-4 h-4 text-pink-400 animate-pulse" />
              <span>{selectedMusic ? selectedMusic.title : "Add Music"}</span>
            </button>

            <div className="flex gap-2">
              <button onClick={() => setFlash(!flash)} className={`p-3 rounded-full border backdrop-blur-md ${flash ? "bg-amber-400 text-black" : "bg-black/50 text-white border-white/20"}`}>
                {flash ? <Zap className="w-5 h-5 fill-current" /> : <ZapOff className="w-5 h-5" />}
              </button>
              <button onClick={() => setFacing((f) => (f === "user" ? "environment" : "user"))} className="p-3 bg-black/50 backdrop-blur-md rounded-full border border-white/20">
                <RefreshCw className="w-5 h-5" />
              </button>
            </div>
          </div>

          {/* Live Type Toggle */}
          {activeMode === "LIVE" && (
            <div className="absolute top-20 left-1/2 -translate-x-1/2 z-20 flex gap-2 bg-black/60 p-1 rounded-full border border-white/20">
              <button onClick={() => setLiveType("FACE")} className={`px-4 py-1.5 rounded-full text-xs font-bold ${liveType === "FACE" ? "bg-pink-600" : "text-zinc-400"}`}>Face Live</button>
              <button onClick={() => setLiveType("ANONYMOUS")} className={`px-4 py-1.5 rounded-full text-xs font-bold ${liveType === "ANONYMOUS" ? "bg-pink-600" : "text-zinc-400"}`}>Anonymous Live</button>
            </div>
          )}

          {/* Shutter & Mode Switcher */}
          <div className="absolute bottom-6 left-0 right-0 flex flex-col items-center gap-4 z-20">
            <button 
              onClick={toggleRecording}
              className={`w-20 h-20 rounded-full border-4 flex items-center justify-center transition-all ${
                isRecording ? "border-red-500 bg-red-500/30 animate-pulse" : "border-white bg-white/20"
              }`}
            >
              <div className={`transition-all ${isRecording ? "w-8 h-8 bg-red-500 rounded-sm" : "w-16 h-16 bg-white rounded-full"}`} />
            </button>

            <div className="flex gap-6 bg-black/70 backdrop-blur-xl px-6 py-2 rounded-full border border-white/20 text-xs font-black">
              {(["POST", "REEL", "LIVE"] as Mode[]).map((mode) => (
                <button key={mode} onClick={() => setActiveMode(mode)} className={activeMode === mode ? "text-pink-400 scale-110" : "text-zinc-500"}>
                  {mode}
                </button>
              ))}
            </div>
          </div>
        </div>
      ) : (
        /* PRO EDITOR VIEW */
        <div className="w-full h-full flex flex-col bg-zinc-950">
          <div className="flex justify-between items-center p-4 border-b border-zinc-800">
            <button onClick={() => setShowEditor(false)} className="p-2"><X className="w-6 h-6" /></button>
            
            <div className="flex items-center gap-2">
              <button onClick={() => setExportQuality(exportQuality === "4K" ? "1080p" : "4K")} className="px-3 py-1 bg-zinc-800 rounded-full text-xs font-bold text-amber-400 border border-zinc-700">
                {exportQuality} ULTRA
              </button>
              <button onClick={saveVideo} className="flex items-center gap-2 bg-gradient-to-r from-pink-500 to-purple-600 px-5 py-2 rounded-full text-xs font-bold shadow-lg">
                <Download className="w-4 h-4" /> Save Video
              </button>
            </div>
          </div>

          <div className="flex-1 flex items-center justify-center p-4 relative overflow-hidden">
            <div 
              className="relative overflow-hidden border border-white/20 rounded-2xl transition-all"
              style={{
                aspectRatio: aspectRatio === "1:1" ? "1/1" : aspectRatio === "16:9" ? "16/9" : "9/16",
                maxHeight: "100%",
                maxWidth: "100%",
                filter: activeFilter === "vintage" ? "sepia(0.6)" : activeFilter === "bw" ? "grayscale(1)" : activeFilter === "vivid" ? "saturate(1.8)" : "none"
              }}
            >
              <video 
                src={videoUrl || ""} 
                autoPlay 
                loop 
                playsInline 
                muted
                className="w-full h-full object-cover" 
                style={{ transform: `scale(${scale}) rotate(${rotation}deg)` }}
              />

              {generatedCaption && (
                <div className="absolute bottom-10 left-4 right-4 text-center bg-black/70 backdrop-blur-md px-4 py-2 rounded-xl border border-white/20 text-sm font-bold text-amber-300">
                  {generatedCaption}
                </div>
              )}
            </div>
          </div>

          <div className="bg-black p-4 border-t border-zinc-800 grid grid-cols-5 gap-2 text-[10px] text-center font-bold">
            <button onClick={() => setScale((s) => (s >= 2 ? 1 : s + 0.3))} className="flex flex-col items-center gap-1 p-2 bg-zinc-900 rounded-xl"><ZoomIn className="w-5 h-5 text-pink-400" /> Free Zoom</button>
            <button onClick={() => setRotation((r) => r + 90)} className="flex flex-col items-center gap-1 p-2 bg-zinc-900 rounded-xl"><RotateCw className="w-5 h-5 text-purple-400" /> Rotate</button>
            <button onClick={() => setAspectRatio(aspectRatio === "9:16" ? "1:1" : aspectRatio === "1:1" ? "16:9" : "9:16")} className="flex flex-col items-center gap-1 p-2 bg-zinc-900 rounded-xl"><Crop className="w-5 h-5 text-amber-400" /> Aspect Ratio</button>
            <button onClick={() => setAutoCaptionsEnabled(!autoCaptionsEnabled)} className={`flex flex-col items-center gap-1 p-2 rounded-xl ${autoCaptionsEnabled ? "bg-pink-600" : "bg-zinc-900"}`}><Captions className="w-5 h-5 text-emerald-400" /> AI Caption</button>
            <button onClick={() => setCaptionLanguage(captionLanguage === "HI" ? "EN" : captionLanguage === "EN" ? "ES" : "HI")} className="flex flex-col items-center gap-1 p-2 bg-zinc-900 rounded-xl"><Languages className="w-5 h-5 text-cyan-400" /> {captionLanguage}</button>
          </div>
        </div>
      )}

      {/* Music Vault Modal */}
      {showMusicVault && (
        <div className="fixed inset-0 z-[100000] bg-black/90 backdrop-blur-2xl p-6 flex flex-col justify-between">
          <div>
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-lg font-black">YourWorld Music Vault</h2>
              <button onClick={() => setShowMusicVault(false)}><X className="w-6 h-6" /></button>
            </div>

            <button onClick={() => fileInputRef.current?.click()} className="w-full py-3 mb-4 bg-zinc-800 rounded-2xl font-bold text-xs border border-zinc-700">
              📁 Upload From Phone Storage
            </button>

            <div className="flex flex-col gap-3">
              {NO_COPYRIGHT_MUSIC.map((track) => (
                <div key={track.id} onClick={() => { setSelectedMusic(track); setShowMusicVault(false); }} className="flex justify-between items-center p-4 bg-zinc-900 rounded-2xl border border-zinc-800">
                  <div>
                    <p className="font-bold text-sm">{track.title}</p>
                    <p className="text-xs text-zinc-400">{track.artist} • {track.category}</p>
                  </div>
                  <span className="text-xs text-pink-400 font-bold">{track.duration}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
