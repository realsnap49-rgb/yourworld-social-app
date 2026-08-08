import React, { useState, useEffect, useRef } from "react";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import {
  X, RefreshCw, Zap, Music, Moon, ChevronDown, Sparkles, Image as ImageIcon,
  Maximize2, Type, Pencil, Download, Crop, Scissors, FastForward, ZoomIn,
  Send, StopCircle
} from "lucide-react";

export const Route = createFileRoute("/moment/create")({
  component: MomentCreatePage,
});

const FILTERS = ["none", "sepia", "grayscale", "invert", "hue-rotate"];

function MomentCreatePage() {
  const videoRef = useRef<HTMLVideoElement>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const navigate = useNavigate();

  // Step Flow: 0=Camera, 1=Premium Editor, 2=Share Sheet
  const [step, setStep] = useState<0 | 1 | 2>(0);
  
  // Media States
  const [facingMode, setFacingMode] = useState<"user" | "environment">("user");
  const [filterIdx, setFilterIdx] = useState(0);
  const [capturedImage, setCapturedImage] = useState<string | null>(null);
  const [recordedVideoUrl, setRecordedVideoUrl] = useState<string | null>(null);
  const [isRecording, setIsRecording] = useState(false);
  const [mode, setMode] = useState<"photo" | "video">("photo");

  // Editor States
  const [zoomLevel, setZoomLevel] = useState(1);
  const [textOverlay, setTextOverlay] = useState("");

  // Camera Initialization
  useEffect(() => {
    if (step !== 0 || capturedImage || recordedVideoUrl) return;

    let stream: MediaStream | null = null;
    const constraints = {
      video: { facingMode: facingMode, width: { ideal: 1920 }, height: { ideal: 1080 } },
      audio: mode === "video" // Only ask for audio if in video mode
    };

    navigator.mediaDevices.getUserMedia(constraints)
      .then(s => { 
        stream = s; 
        if(videoRef.current) videoRef.current.srcObject = s; 
      })
      .catch(err => {
        console.error("Camera access error:", err);
        alert("Could not access camera. Please allow permissions.");
      });

    return () => {
      stream?.getTracks().forEach(t => t.stop());
    };
  }, [facingMode, step, capturedImage, recordedVideoUrl, mode]);

  // Handle Flip Camera
  const toggleFacingMode = () => {
    setFacingMode(prev => (prev === "user" ? "environment" : "user"));
  };

  // --- Photo Capture ---
  const capturePhoto = () => {
    if (!videoRef.current || mode !== "photo") return;
    const canvas = document.createElement("canvas");
    canvas.width = videoRef.current.videoWidth || 1280;
    canvas.height = videoRef.current.videoHeight || 720;
    const ctx = canvas.getContext("2d");
    if (ctx) {
      ctx.drawImage(videoRef.current, 0, 0);
      setCapturedImage(canvas.toDataURL("image/png"));
      setRecordedVideoUrl(null);
      setStep(1); // Go to Editor
    }
  };

  // --- Video Recording ---
  const startRecording = () => {
    if (!videoRef.current || !videoRef.current.srcObject || mode !== "video") return;
    const stream = videoRef.current.srcObject as MediaStream;
    const recorder = new MediaRecorder(stream, { mimeType: 'video/webm;codecs=vp9' });
    mediaRecorderRef.current = recorder;
    
    const chunks: Blob[] = [];
    recorder.ondataavailable = (e) => {
      if (e.data.size > 0) chunks.push(e.data);
    };

    recorder.onstop = () => {
      const blob = new Blob(chunks, { type: 'video/webm' });
      const url = URL.createObjectURL(blob);
      setRecordedVideoUrl(url);
      setCapturedImage(null);
      setStep(1); // Go to Editor
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
      
      {/* STEP 0: SNAPCHAT CAMERA */}
      {step === 0 && (
        <div className="relative w-full h-full flex flex-col justify-between">
          <video 
            ref={videoRef} 
            autoPlay 
            playsInline 
            muted={mode === 'photo'} // Mute only in photo mode
            className={`absolute inset-0 w-full h-full object-cover filter ${FILTERS[filterIdx]}`} 
          />
          
          {/* Top Bar */}
          <div className="relative z-10 flex justify-between p-4 pt-6 bg-gradient-to-b from-black/60 to-transparent">
            <button onClick={() => navigate({ to: ".." })} className="p-2.5 bg-black/40 rounded-full"><X size={22} /></button>
            <button onClick={toggleFacingMode} className="p-2.5 bg-black/40 rounded-full"><RefreshCw size={22} /></button>
          </div>

          {/* Right Toolbar (alerts removed as requested) */}
          <div className="absolute right-4 top-20 z-10 flex flex-col gap-5 bg-black/30 backdrop-blur-md p-2.5 rounded-full border border-white/10">
            <button><Zap size={22} /></button>
            <button><Music size={22} /></button>
            <span className="text-[10px] border border-white rounded px-1 font-bold">HD</span>
            <button><Moon size={22} /></button>
          </div>

          {/* Bottom Shutter & Lenses */}
          <div className="relative z-10 flex flex-col items-center mb-6">
            <div className="flex items-center gap-4 mb-4">
              {/* Lenses Trigger */}
              <button onClick={() => setFilterIdx((filterIdx + 1) % FILTERS.length)} className="p-2 bg-black/40 rounded-xl"><Sparkles size={22} /></button>
              
              {/* SHUTTER BUTTON (Dual Function: Photo click, Video hold) */}
              <div className="relative flex items-center justify-center">
                {mode === 'video' && isRecording ? (
                  <button onClick={stopRecording} className="w-20 h-20 rounded-full border-4 border-red-500 flex items-center justify-center active:scale-95 transition-transform">
                    <StopCircle size={40} className="text-red-500" />
                  </button>
                ) : (
                  <button 
                    onClick={mode === 'photo' ? capturePhoto : startRecording}
                    className={`w-20 h-20 rounded-full border-4 flex items-center justify-center active:scale-90 transition-transform ${mode === 'video' ? 'border-red-500' : 'border-white'}`}
                  >
                    <div className={`w-16 h-16 rounded-full border-2 ${mode === 'video' ? 'bg-red-500 border-red-700' : 'border-black/20'}`} />
                  </button>
                )}
              </div>

              {/* Gallery Trigger */}
              <button className="p-2 bg-black/40 rounded-xl"><ImageIcon size={22} /></button>
            </div>

            {/* Mode Switcher */}
            <div className="flex gap-6 text-xs font-bold text-white/80">
              <span onClick={() => { if(!isRecording) setMode("photo"); }} className={`cursor-pointer ${mode === "photo" ? "text-white border-b-2 border-white pb-0.5" : "text-white/60"}`}>Photo</span>
              <span onClick={() => { if(!isRecording) setMode("video"); }} className={`cursor-pointer ${mode === "video" ? "text-red-500 border-b-2 border-red-500 pb-0.5" : "text-white/60"}`}>Video</span>
              <span className="text-white/60">Text</span>
            </div>
          </div>
        </div>
      )}

      {/* STEP 1: PREMIUM EDITOR (Text, Zoom, Share Sheet Trigger) */}
      {step === 1 && (
        <div className="relative w-full h-full bg-zinc-950 flex flex-col justify-between animate-in fade-in duration-300">
          <div className="relative w-full h-full overflow-hidden flex items-center justify-center">
            {capturedImage && (
              <img 
                src={capturedImage} 
                alt="Edit Preview" 
                style={{ transform: `scale(${zoomLevel})` }} 
                className={`w-full h-full object-cover transition-transform duration-200 filter ${FILTERS[filterIdx]}`} 
              />
            )}
            {recordedVideoUrl && (
              <video 
                src={recordedVideoUrl} 
                autoPlay 
                loop 
                controls
                style={{ transform: `scale(${zoomLevel})` }} 
                className={`w-full h-full object-cover transition-transform duration-200 filter ${FILTERS[filterIdx]}`} 
              />
            )}

            {/* Text Overlay */}
            {textOverlay && (
              <div className="absolute top-1/2 w-full text-center bg-black/60 py-3 text-2xl font-black text-white">
                {textOverlay}
              </div>
            )}
          </div>

          {/* Top Bar (Edit View) */}
          <div className="absolute top-6 left-4 right-4 flex justify-between z-10">
            <button onClick={() => { setCapturedImage(null); setRecordedVideoUrl(null); setStep(0); }} className="p-2.5 bg-black/60 rounded-full"><X size={22} /></button>
            <button onClick={() => alert("Preview & Share Sheet implemented separately")} className="px-5 py-2.5 bg-gradient-to-r from-teal-400 via-pink-500 to-rose-500 rounded-full font-bold flex items-center gap-2 text-sm shadow-lg">
              Next / Share <Send size={16} />
            </button>
          </div>

          {/* Premium Editing Tools */}
          <div className="absolute right-4 top-20 z-10 flex flex-col gap-4 bg-black/50 backdrop-blur-md p-3 rounded-2xl border border-white/10 animate-in slide-in-from-right duration-300">
            <button onClick={() => { const t = prompt("Add text:", textOverlay); if (t !== null) setTextOverlay(t); }} className="flex flex-col items-center gap-1 text-[10px]"><Type size={20} /> Text</button>
            <button onClick={() => setZoomLevel(z => z === 1 ? 1.5 : 1)} className="flex flex-col items-center gap-1 text-[10px]"><ZoomIn size={20} /> Zoom</button>
            <button className="flex flex-col items-center gap-1 text-[10px]"><Pencil size={20} /> Draw</button>
            {recordedVideoUrl && (
              <>
                <button className="flex flex-col items-center gap-1 text-[10px]"><Scissors size={20} /> Trim</button>
                <button className="flex flex-col items-center gap-1 text-[10px]"><FastForward size={20} /> Speed</button>
              </>
            )}
            <button className="flex flex-col items-center gap-1 text-[10px]"><Download size={20} /> Save</button>
          </div>
        </div>
      )}

    </div>
  );
}

export default MomentCreatePage;
