import React, { useState, useEffect, useRef } from "react";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import {
  X,
  RefreshCw,
  Zap,
  Music,
  Moon,
  ChevronDown,
  Sparkles,
  Image as ImageIcon,
  Maximize2
} from "lucide-react";

export const Route = createFileRoute("/moment/create")({
  component: MomentCreatePage,
});

function MomentCreatePage() {
  const videoRef = useRef<HTMLVideoElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const navigate = useNavigate();

  const [facingMode, setFacingMode] = useState<"user" | "environment">("user");
  const [flash, setFlash] = useState(false);
  const [capturedImage, setCapturedImage] = useState<string | null>(null);
  const [activeFilter, setActiveFilter] = useState<string>("none");
  const [mode, setMode] = useState<"photo" | "video" | "text">("photo");

  // Camera initialization with front/back support
  useEffect(() => {
    let currentStream: MediaStream | null = null;
    async function startCamera() {
      try {
        if (currentStream) {
          currentStream.getTracks().forEach((track) => track.stop());
        }
        const stream = await navigator.mediaDevices.getUserMedia({
          video: {
            facingMode: facingMode,
            width: { ideal: 1920 },
            height: { ideal: 1080 }
          },
          audio: false
        });
        currentStream = stream;
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
        }
      } catch (err) {
        console.error("Camera access error:", err);
      }
    }
    if (!capturedImage) {
      startCamera();
    }
    return () => {
      if (currentStream) {
        currentStream.getTracks().forEach((track) => track.stop());
      }
    };
  }, [facingMode, capturedImage]);

  // Flip Camera Function
  const toggleCamera = () => {
    setFacingMode((prev) => (prev === "user" ? "environment" : "user"));
  };

  // Real Photo Capture Logic
  const capturePhoto = () => {
    if (!videoRef.current) return;
    const canvas = document.createElement("canvas");
    canvas.width = videoRef.current.videoWidth || 1280;
    canvas.height = videoRef.current.videoHeight || 720;
    const ctx = canvas.getContext("2d");
    if (ctx) {
      ctx.drawImage(videoRef.current, 0, 0, canvas.width, canvas.height);
      const dataUrl = canvas.toDataURL("image/png");
      setCapturedImage(dataUrl);
    }
  };

  // Handle Local Gallery Pick
  const handleGalleryPick = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (event) => {
        if (event.target?.result) {
          setCapturedImage(event.target.result as string);
        }
      };
      reader.readAsDataURL(file);
    }
  };

  return (
    <div className="fixed inset-0 z-50 w-full h-full bg-black text-white flex flex-col justify-between overflow-hidden font-sans select-none">
      {/* Hidden File Input for Gallery */}
      <input
        type="file"
        ref={fileInputRef}
        accept="image/*"
        className="hidden"
        onChange={handleGalleryPick}
      />

      {/* Captured Image Preview OR Live Camera View */}
      {capturedImage ? (
        <div className="relative w-full h-full flex items-center justify-center bg-black">
          <img
            src={capturedImage}
            alt="Captured"
            className={`w-full h-full object-cover ${
              activeFilter === "sepia"
                ? "sepia"
                : activeFilter === "grayscale"
                ? "grayscale"
                : activeFilter === "contrast"
                ? "contrast-150"
                : ""
            }`}
          />
          {/* Retake / Back to Camera */}
          <button
            onClick={() => setCapturedImage(null)}
            className="absolute top-6 left-4 p-3 bg-black/60 rounded-full text-white backdrop-blur-md"
          >
            <X size={22} />
          </button>
          
          <div className="absolute bottom-10 px-8 w-full">
            <button
              onClick={() => alert("Moment Shared Successfully!")}
              className="w-full py-4 bg-gradient-to-r from-yellow-400 to-amber-500 text-black font-extrabold text-base rounded-full shadow-2xl active:scale-95 transition-transform"
            >
              Send / Share Moment 🚀
            </button>
          </div>
        </div>
      ) : (
        <>
          {/* Real Live Camera Feed */}
          <video
            ref={videoRef}
            autoPlay
            playsInline
            muted
            className={`absolute inset-0 w-full h-full object-cover z-0 ${
              activeFilter === "sepia"
                ? "sepia"
                : activeFilter === "grayscale"
                ? "grayscale"
                : activeFilter === "contrast"
                ? "contrast-150"
                : ""
            }`}
          />

          {/* TOP BAR - CLOSE & FLIP CAMERA */}
          <div className="relative z-10 flex items-center justify-between p-4 pt-6 bg-gradient-to-b from-black/60 to-transparent">
            <button
              onClick={() => navigate({ to: ".." })}
              className="p-2.5 rounded-full bg-black/40 backdrop-blur-md text-white active:scale-90 transition-transform"
            >
              <X size={22} />
            </button>

            <button
              onClick={toggleCamera}
              className="p-2.5 rounded-full bg-black/40 backdrop-blur-md text-white active:scale-90 transition-transform"
            >
              <RefreshCw size={22} />
            </button>
          </div>

          {/* RIGHT SIDE TOOLBAR */}
          <div className="absolute right-4 top-20 z-10 flex flex-col gap-5 items-center bg-black/30 backdrop-blur-md p-2.5 rounded-full border border-white/10">
            <button onClick={() => setFlash(!flash)} className="text-white active:scale-90">
              <Zap size={22} className={flash ? "fill-yellow-400 text-yellow-400" : ""} />
            </button>
            <button onClick={() => alert("Music Library coming soon!")} className="text-white active:scale-90">
              <Music size={22} />
            </button>
            <span className="text-white font-black text-[10px] border-2 border-white rounded px-1 py-0.5">
              HD
            </span>
            <button onClick={() => setActiveFilter(activeFilter === "none" ? "contrast" : "none")} className="text-white active:scale-90">
              <Moon size={22} />
            </button>
            <button onClick={() => alert("More options")} className="text-white active:scale-90">
              <ChevronDown size={22} />
            </button>
          </div>

          {/* BOTTOM CONTROLS */}
          <div className="relative z-10 flex flex-col items-center mb-6">
            <div className="flex items-center justify-center gap-4 w-full px-6 mb-4">
              {/* AI Magic */}
              <button onClick={() => setActiveFilter("sepia")} className="text-white active:scale-90">
                <Sparkles size={26} />
              </button>

              {/* Gallery Picker */}
              <button
                onClick={() => fileInputRef.current?.click()}
                className="p-2 rounded-xl bg-black/40 backdrop-blur-md border border-white/20 active:scale-90"
              >
                <ImageIcon size={22} className="text-white" />
              </button>

              {/* Main White Shutter Button - Real Capture */}
              <div className="relative flex items-center justify-center">
                <button
                  onClick={capturePhoto}
                  className="w-20 h-20 rounded-full border-4 border-white flex items-center justify-center bg-transparent active:scale-90 transition-transform cursor-pointer"
                >
                  <div className="w-16 h-16 rounded-full border-2 border-black/20" />
                </button>
                <button className="absolute p-1 bg-black/60 rounded-full text-white pointer-events-none">
                  <Maximize2 size={12} />
                </button>
              </div>

              {/* Filter 1 */}
              <div
                onClick={() => setActiveFilter("grayscale")}
                className={`w-11 h-11 rounded-full border-2 overflow-hidden bg-zinc-800 flex items-center justify-center cursor-pointer active:scale-90 ${
                  activeFilter === "grayscale" ? "border-yellow-400" : "border-white"
                }`}
              >
                <span className="text-base">👨‍🦲</span>
              </div>

              {/* Filter 2 */}
              <div
                onClick={() => setActiveFilter("none")}
                className={`w-11 h-11 rounded-full border-2 overflow-hidden bg-zinc-800 flex items-center justify-center cursor-pointer active:scale-90 ${
                  activeFilter === "none" ? "border-yellow-400" : "border-white"
                }`}
              >
                <span className="text-base">👨‍⚕️</span>
              </div>
            </div>

            {/* Mode Selector */}
            <div className="flex gap-6 text-xs font-bold tracking-wide text-white/80">
              <span
                onClick={() => setMode("photo")}
                className={`cursor-pointer ${mode === "photo" ? "text-white border-b-2 border-white pb-0.5" : "text-white/60"}`}
              >
                Photo
              </span>
              <span
                onClick={() => setMode("video")}
                className={`cursor-pointer ${mode === "video" ? "text-white border-b-2 border-white pb-0.5" : "text-white/60"}`}
              >
                Video
              </span>
              <span
                onClick={() => setMode("text")}
                className={`cursor-pointer ${mode === "text" ? "text-white border-b-2 border-white pb-0.5" : "text-white/60"}`}
              >
                Text
              </span>
            </div>
          </div>
        </>
      )}
    </div>
  );
}

export default MomentCreatePage;
