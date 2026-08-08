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
  const [flash, setFlash] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    async function enableCamera() {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: {
            width: { ideal: 3840, min: 1920 },
            height: { ideal: 2160, min: 1080 },
            facingMode: "user"
          },
          audio: false
        });
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
        }
      } catch (err) {
        console.error("Camera access error:", err);
      }
    }
    enableCamera();
  }, []);

  return (
    <div className="fixed inset-0 z-50 w-full h-full bg-black text-white flex flex-col justify-between overflow-hidden font-sans select-none">
      
      {/* 4K Real-Time HD Camera Feed */}
      <video
        ref={videoRef}
        autoPlay
        playsInline
        muted
        className="absolute inset-0 w-full h-full object-cover z-0"
      />

      {/* TOP BAR - ONLY CLOSE & FLIP CAMERA */}
      <div className="relative z-10 flex items-center justify-between p-4 pt-6 bg-gradient-to-b from-black/60 to-transparent">
        <button 
          onClick={() => navigate({ to: ".." })} 
          className="p-2.5 rounded-full bg-black/40 backdrop-blur-md text-white hover:bg-black/60"
        >
          <X size={22} />
        </button>

        <button className="p-2.5 rounded-full bg-black/40 backdrop-blur-md text-white hover:bg-black/60">
          <RefreshCw size={22} />
        </button>
      </div>

      {/* RIGHT SIDE SNAPCHAT EDITING & CAMERA TOOLBAR */}
      <div className="absolute right-4 top-20 z-10 flex flex-col gap-5 items-center bg-black/30 backdrop-blur-md p-2.5 rounded-full border border-white/10">
        <button onClick={() => setFlash(!flash)} className="text-white hover:text-yellow-400">
          <Zap size={22} className={flash ? "fill-yellow-400 text-yellow-400" : ""} />
        </button>
        <button className="text-white">
          <Music size={22} />
        </button>
        <span className="text-white font-black text-[10px] border-2 border-white rounded px-1 py-0.5">
          HD
        </span>
        <button className="text-white">
          <Moon size={22} />
        </button>
        <button className="text-white">
          <ChevronDown size={22} />
        </button>
      </div>

      {/* BOTTOM CAMERA CAPTURE & LENSES ONLY */}
      <div className="relative z-10 flex flex-col items-center mb-6">
        <div className="flex items-center justify-center gap-4 w-full px-6 mb-4">
          {/* AI Magic */}
          <button className="text-white">
            <Sparkles size={26} />
          </button>

          {/* Gallery Picker */}
          <button className="p-2 rounded-xl bg-black/40 backdrop-blur-md border border-white/20">
            <ImageIcon size={22} className="text-white" />
          </button>

          {/* Main Snapchat White Ring Shutter */}
          <div className="relative flex items-center justify-center">
            <button className="w-20 h-20 rounded-full border-4 border-white flex items-center justify-center bg-transparent active:scale-90 transition-transform">
              <div className="w-16 h-16 rounded-full border-2 border-black/20" />
            </button>
            <button className="absolute p-1 bg-black/60 rounded-full text-white">
              <Maximize2 size={12} />
            </button>
          </div>

          {/* Filter 1 */}
          <div className="w-11 h-11 rounded-full border-2 border-white overflow-hidden bg-zinc-800 flex items-center justify-center cursor-pointer">
            <span className="text-base">👨‍🦲</span>
          </div>

          {/* Filter 2 */}
          <div className="w-11 h-11 rounded-full border-2 border-white overflow-hidden bg-zinc-800 flex items-center justify-center cursor-pointer">
            <span className="text-base">👨‍⚕️</span>
          </div>
        </div>

        {/* Photo / Video / Text Mode Switcher */}
        <div className="flex gap-6 text-xs font-bold tracking-wide text-white/80">
          <span className="text-white border-b-2 border-white pb-0.5">Photo</span>
          <span className="text-white/60 cursor-pointer">Video</span>
          <span className="text-white/60 cursor-pointer">Text</span>
        </div>
      </div>

    </div>
  );
}

export default MomentCreatePage;
