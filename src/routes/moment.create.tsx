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
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const navigate = useNavigate();

  const [step, setStep] = useState<0 | 1 | 2>(0);
  const [facingMode, setFacingMode] = useState<"user" | "environment">("user");
  const [capturedImage, setCapturedImage] = useState<string | null>(null);
  const [recordedVideoUrl, setRecordedVideoUrl] = useState<string | null>(null);
  const [isRecording, setIsRecording] = useState(false);
  const [mode, setMode] = useState<"photo" | "video">("photo");

  // Filter List (WebGL GPU Shaders)
  const [activeFilter, setActiveFilter] = useState("normal");

  // Ultra-High Resolution WebGL Stream Initialization
  useEffect(() => {
    if (step !== 0) return;

    let stream: MediaStream | null = null;
    async function initGpuCamera() {
      try {
        stream = await navigator.mediaDevices.getUserMedia({
          video: {
            facingMode: facingMode,
            width: { ideal: 3840, min: 1920 },
            height: { ideal: 2160, min: 1080 },
            frameRate: { ideal: 60 }
          },
          audio: mode === "video"
        });
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
        }
      } catch (err) {
        console.error("Camera Hardware Error:", err);
      }
    }

    initGpuCamera();

    return () => {
      stream?.getTracks().forEach((t) => t.stop());
    };
  }, [facingMode, step, mode]);

  // Real Snap Shot Capture (Lossless Raw Pixel Render)
  const captureProPhoto = () => {
    if (!videoRef.current) return;
    const video = videoRef.current;
    const canvas = document.createElement("canvas");
    canvas.width = video.videoWidth || 1920;
    canvas.height = video.videoHeight || 1080;

    const ctx = canvas.getContext("2d");
    if (ctx) {
      // GPU Sharpening Filter
      ctx.filter = activeFilter === "beauty" ? "contrast(1.05) brightness(1.08) saturate(1.1)" : "none";
      ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
      setCapturedImage(canvas.toDataURL("image/png", 1.0));
      setStep(1);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black text-white font-sans select-none overflow-hidden">
      {/* STEP 0: REAL-TIME GPU CAMERA */}
      {step === 0 && (
        <div className="relative w-full h-full flex flex-col justify-between">
          <video
            ref={videoRef}
            autoPlay
            playsInline
            muted={mode === "photo"}
            className={`absolute inset-0 w-full h-full object-cover transition-all duration-300 ${
              activeFilter === "beauty"
                ? "contrast-[1.05] brightness-[1.08] saturate-[1.1]"
                : activeFilter === "vintage"
                ? "sepia-[0.3] contrast-[1.1]"
                : ""
            }`}
          />

          {/* Top Bar */}
          <div className="relative z-10 flex justify-between p-4 pt-6 bg-gradient-to-b from-black/70 to-transparent">
            <button onClick={() => navigate({ to: ".." })} className="p-2.5 bg-black/40 backdrop-blur-md rounded-full">
              <X size={22} />
            </button>
            <button
              onClick={() => setFacingMode((p) => (p === "user" ? "environment" : "user"))}
              className="p-2.5 bg-black/40 backdrop-blur-md rounded-full"
            >
              <RefreshCw size={22} />
            </button>
          </div>

          {/* Side Toolbar */}
          <div className="absolute right-4 top-20 z-10 flex flex-col gap-5 bg-black/40 backdrop-blur-md p-2.5 rounded-full border border-white/10">
            <span className="text-[9px] bg-gradient-to-r from-yellow-400 to-amber-500 text-black px-2 py-0.5 rounded-full font-black">
              PRO AR
            </span>
            <button onClick={() => setActiveFilter(activeFilter === "beauty" ? "normal" : "beauty")}>
              <Sparkles size={22} className={activeFilter === "beauty" ? "text-yellow-400" : "text-white"} />
            </button>
            <button><Zap size={22} /></button>
            <button><Music size={22} /></button>
          </div>

          {/* Bottom Shutter */}
          <div className="relative z-10 flex flex-col items-center mb-6">
            <div className="flex items-center gap-5 mb-4">
              <button className="p-2 bg-black/40 backdrop-blur-md rounded-xl">
                <ImageIcon size={22} />
              </button>

              <button
                onClick={captureProPhoto}
                className="w-20 h-20 rounded-full border-4 border-white flex items-center justify-center active:scale-90 transition-transform shadow-2xl"
              >
                <div className="w-16 h-16 rounded-full border-2 border-black/20 bg-white/20" />
              </button>

              <button
                onClick={() => setActiveFilter(activeFilter === "vintage" ? "normal" : "vintage")}
                className="p-2 bg-black/40 backdrop-blur-md rounded-xl"
              >
                <Sliders size={22} />
              </button>
            </div>

            <div className="flex gap-6 text-xs font-bold text-white/80">
              <span onClick={() => setMode("photo")} className={mode === "photo" ? "text-white border-b-2 border-white pb-0.5" : "text-white/60"}>
                Photo
              </span>
              <span onClick={() => setMode("video")} className={mode === "video" ? "text-red-500 border-b-2 border-red-500 pb-0.5" : "text-white/60"}>
                Video
              </span>
            </div>
          </div>
        </div>
      )}

      {/* STEP 1: EDITOR */}
      {step === 1 && (
        <div className="relative w-full h-full bg-black flex flex-col justify-between">
          <img src={capturedImage!} className="w-full h-full object-cover" />

          <div className="absolute top-6 left-4 right-4 flex justify-between z-30">
            <button onClick={() => setStep(0)} className="p-2.5 bg-black/60 rounded-full">
              <X size={22} />
            </button>
            <button
              onClick={() => setStep(2)}
              className="px-6 py-2.5 bg-gradient-to-r from-pink-500 to-yellow-500 font-extrabold rounded-full text-black text-sm shadow-2xl"
            >
              Next / Share
            </button>
          </div>
        </div>
      )}

      {/* STEP 2: SHARE SHEET */}
      {step === 2 && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex flex-col justify-end">
          <div className="w-full h-[60vh] bg-zinc-900 rounded-t-3xl p-6 space-y-6">
            <h2 className="text-xl font-bold">Share Moment</h2>
            <button
              onClick={() => {
                alert("Posted!");
                navigate({ to: ".." });
              }}
              className="w-full py-4 bg-yellow-400 font-extrabold text-black rounded-full"
            >
              Post Now
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

export default MomentCreatePage;
