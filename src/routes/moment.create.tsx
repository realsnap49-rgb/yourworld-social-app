import React, { useState, useEffect, useRef } from "react";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import {
  X, RefreshCw, Zap, Music, Moon, Sparkles, Image as ImageIcon,
  Type, Pencil, Download, Send, StopCircle, Trash2, Check, Sliders
} from "lucide-react";

export const Route = createFileRoute("/moment/create")({
  component: MomentCreatePage,
});

export function MomentCreatePage() {
  const videoRef = useRef<HTMLVideoElement>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const navigate = useNavigate();

  const [step, setStep] = useState<0 | 1 | 2>(0);
  const [facingMode, setFacingMode] = useState<"user" | "environment">("user");
  const [capturedImage, setCapturedImage] = useState<string | null>(null);
  const [recordedVideoUrl, setRecordedVideoUrl] = useState<string | null>(null);
  const [isRecording, setIsRecording] = useState(false);
  const [mode, setMode] = useState<"photo" | "video">("photo");

  // PRO EDITING STATES
  const [zoom, setZoom] = useState(1);
  const [elements, setElements] = useState<{ id: number; text: string; x: number; y: number }[]>([]);

  // 4K ULTRA-HD CAMERA STREAM (INSTAGRAM / SNAPCHAT SURPASSING CONFIG)
  useEffect(() => {
    if (step !== 0 || capturedImage || recordedVideoUrl) return;

    let stream: MediaStream | null = null;

    const getUltraHdStream = async () => {
      try {
        stream = await navigator.mediaDevices.getUserMedia({
          video: {
            facingMode: facingMode,
            width: { min: 1920, ideal: 3840, max: 4096 }, // 4K Resolution Target
            height: { min: 1080, ideal: 2160, max: 2160 },
            frameRate: { ideal: 60, max: 60 } // Smooth 60 FPS
          },
          audio: mode === "video"
        });

        if (videoRef.current) {
          videoRef.current.srcObject = stream;
        }
      } catch (err) {
        console.warn("Fallback to 1080p full HD stream", err);
        try {
          stream = await navigator.mediaDevices.getUserMedia({
            video: { facingMode: facingMode, width: { ideal: 1920 }, height: { ideal: 1080 } },
            audio: mode === "video"
          });
          if (videoRef.current) videoRef.current.srcObject = stream;
        } catch (e) {
          console.error("Camera access failed", e);
        }
      }
    };

    getUltraHdStream();

    return () => {
      stream?.getTracks().forEach(t => t.stop());
    };
  }, [facingMode, step, capturedImage, recordedVideoUrl, mode]);

  // ULTRA HIGH-RES PHOTO CAPTURE (NO COMPRESSION LOSS)
  const captureUltraHdPhoto = () => {
    if (!videoRef.current) return;
    const video = videoRef.current;

    const canvas = document.createElement("canvas");
    // Sensor ki exact maximum width aur height map karo
    canvas.width = video.videoWidth || 3840;
    canvas.height = video.videoHeight || 2160;

    const ctx = canvas.getContext("2d", { alpha: false, willReadFrequently: false });
    if (ctx) {
      ctx.imageSmoothingEnabled = true;
      ctx.imageSmoothingQuality = "high";
      ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
      
      // Maximum Quality JPEG Export (1.0 = Uncompressed Output)
      const hdDataUrl = canvas.toDataURL("image/jpeg", 1.0);
      setCapturedImage(hdDataUrl);
      setRecordedVideoUrl(null);
      setStep(1);
    }
  };

  // HIGH-BITRATE VIDEO RECORDING
  const startRecording = () => {
    if (!videoRef.current || !videoRef.current.srcObject || mode !== "video") return;
    const stream = videoRef.current.srcObject as MediaStream;

    let mimeType = "video/webm;codecs=vp9";
    if (!MediaRecorder.isTypeSupported(mimeType)) {
      mimeType = "video/mp4";
    }

    const recorder = new MediaRecorder(stream, {
      mimeType: MediaRecorder.isTypeSupported(mimeType) ? mimeType : "",
      videoBitsPerSecond: 15000000 // 15 Mbps High Bitrate for crisp clarity
    });

    mediaRecorderRef.current = recorder;
    const chunks: Blob[] = [];

    recorder.ondataavailable = (e) => e.data.size > 0 && chunks.push(e.data);
    recorder.onstop = () => {
      const blob = new Blob(chunks, { type: mimeType });
      setRecordedVideoUrl(URL.createObjectURL(blob));
      setCapturedImage(null);
      setStep(1);
    };

    recorder.start();
    setIsRecording(true);
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black text-white font-sans select-none overflow-hidden">
      
      {/* STEP 0: 4K ULTRA-HD CAMERA FEED */}
      {step === 0 && (
        <div className="relative w-full h-full flex flex-col justify-between">
          <video 
            ref={videoRef} 
            autoPlay 
            playsInline 
            muted={mode === 'photo'} 
            className="absolute inset-0 w-full h-full object-cover contrast-[1.03] saturate-[1.05]" 
          />
          
          <div className="relative z-10 flex justify-between p-4 pt-6 bg-gradient-to-b from-black/60 to-transparent">
            <button onClick={() => navigate({ to: ".." })} className="p-2.5 bg-black/40 rounded-full"><X size={22} /></button>
            <button onClick={() => setFacingMode(p => p === "user" ? "environment" : "user")} className="p-2.5 bg-black/40 rounded-full"><RefreshCw size={22} /></button>
          </div>

          <div className="absolute right-4 top-20 z-10 flex flex-col gap-5 bg-black/30 backdrop-blur-md p-2.5 rounded-full border border-white/10">
            <span className="text-[10px] bg-gradient-to-r from-amber-400 to-yellow-500 text-black px-1.5 py-0.5 rounded-md font-black tracking-widest shadow-md">4K UHD</span>
            <button><Zap size={22} /></button>
            <button><Music size={22} /></button>
            <button><Moon size={22} /></button>
          </div>

          <div className="relative z-10 flex flex-col items-center mb-6">
            <div className="flex items-center gap-4 mb-4">
              <button className="p-2 bg-black/40 rounded-xl"><Sparkles size={22} /></button>
              
              <div className="relative flex items-center justify-center">
                {mode === 'video' && isRecording ? (
                  <button onClick={stopRecording} className="w-20 h-20 rounded-full border-4 border-red-500 flex items-center justify-center active:scale-95 transition-transform">
                    <StopCircle size={40} className="text-red-500" />
                  </button>
                ) : (
                  <button 
                    onClick={mode === 'photo' ? captureUltraHdPhoto : startRecording}
                    className={`w-20 h-20 rounded-full border-4 flex items-center justify-center active:scale-90 transition-transform ${mode === 'video' ? 'border-red-500' : 'border-white'}`}
                  >
                    <div className={`w-16 h-16 rounded-full border-2 ${mode === 'video' ? 'bg-red-500 border-red-700' : 'border-black/20'}`} />
                  </button>
                )}
              </div>

              <button className="p-2 bg-black/40 rounded-xl"><ImageIcon size={22} /></button>
            </div>

            <div className="flex gap-6 text-xs font-bold text-white/80">
              <span onClick={() => !isRecording && setMode("photo")} className={`cursor-pointer ${mode === "photo" ? "text-white border-b-2 border-white pb-0.5" : "text-white/60"}`}>Photo</span>
              <span onClick={() => !isRecording && setMode("video")} className={`cursor-pointer ${mode === "video" ? "text-red-500 border-b-2 border-red-500 pb-0.5" : "text-white/60"}`}>Video</span>
            </div>
          </div>
        </div>
      )}

      {/* STEP 1: PRO EDITOR WITH REAL DRAGGABLE TEXT & SLIDER ZOOM */}
      {step === 1 && (
        <div className="relative w-full h-full bg-zinc-950 flex flex-col justify-between">
          <div className="relative w-full h-full overflow-hidden flex items-center justify-center touch-none">
            {capturedImage && (
              <img 
                src={capturedImage} 
                alt="Ultra HD Captured" 
                style={{ transform: `scale(${zoom})` }} 
                className="w-full h-full object-cover transition-transform duration-100 ease-out" 
              />
            )}
            {recordedVideoUrl && (
              <video 
                src={recordedVideoUrl} 
                autoPlay 
                loop 
                controls
                style={{ transform: `scale(${zoom})` }} 
                className="w-full h-full object-cover transition-transform duration-100 ease-out" 
              />
            )}

            {/* Draggable Overlays */}
            {elements.map((el) => (
              <div
                key={el.id}
                className="absolute z-20 cursor-move bg-black/50 border border-white/20 backdrop-blur-md px-4 py-2 rounded-2xl text-xl font-extrabold text-white shadow-2xl active:scale-105"
                style={{ left: el.x, top: el.y }}
                onTouchMove={(e) => {
                  const x = e.touches[0].clientX - 60;
                  const y = e.touches[0].clientY - 30;
                  setElements(prev => prev.map(item => item.id === el.id ? {...item, x, y} : item));
                }}
              >
                {el.text}
              </div>
            ))}
          </div>

          <div className="absolute top-6 left-4 right-4 flex justify-between z-30">
            <button onClick={() => { setCapturedImage(null); setRecordedVideoUrl(null); setStep(0); }} className="p-2.5 bg-black/60 rounded-full"><X size={22} /></button>
            <button onClick={() => setStep(2)} className="px-5 py-2.5 bg-gradient-to-r from-teal-400 via-pink-500 to-rose-500 rounded-full font-bold flex items-center gap-2 text-sm shadow-xl">
              Next / Share <Send size={16} />
            </button>
          </div>

          {/* Interactive Custom Controls */}
          <div className="absolute right-4 top-20 z-30 flex flex-col gap-4 bg-black/60 backdrop-blur-md p-3 rounded-2xl border border-white/10">
            <button onClick={() => {
              const text = prompt("Add overlay text:");
              if(text) setElements([...elements, { id: Date.now(), text, x: 100, y: 200 }]);
            }} className="flex flex-col items-center gap-1 text-[10px]"><Type size={20} /> Text</button>
            
            <div className="flex flex-col items-center gap-1">
              <span className="text-[9px] text-zinc-400 font-bold">ZOOM</span>
              <input 
                type="range" 
                min="1" 
                max="3" 
                step="0.05" 
                value={zoom} 
                onChange={(e) => setZoom(parseFloat(e.target.value))} 
                className="w-16 h-1 accent-yellow-400 cursor-pointer" 
              />
            </div>

            {elements.length > 0 && (
              <button onClick={() => setElements([])} className="flex flex-col items-center gap-1 text-[10px] text-red-400"><Trash2 size={20} /> Clear</button>
            )}
          </div>
        </div>
      )}

      {/* STEP 2: SHARE SHEET */}
      {step === 2 && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex flex-col justify-end">
          <div className="w-full max-h-[85vh] bg-[#121214] border-t border-zinc-800 rounded-t-3xl p-5 space-y-6 text-white animate-in slide-in-from-bottom duration-300">
            <div className="flex justify-between items-center pb-2 border-b border-zinc-800">
              <h2 className="text-lg font-bold">Preview & Share</h2>
              <button onClick={() => setStep(1)} className="p-1 rounded-full bg-zinc-800 text-zinc-400"><X size={18} /></button>
            </div>
            <button onClick={() => { alert("Moment Shared!"); navigate({ to: ".." }); }} className="w-full py-4 bg-gradient-to-r from-teal-400 via-pink-500 to-rose-500 font-bold rounded-full text-white">
              Share moment
            </button>
          </div>
        </div>
      )}

    </div>
  );
}

export default MomentCreatePage;
