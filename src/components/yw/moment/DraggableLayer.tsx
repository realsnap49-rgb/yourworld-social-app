import React, { useState, useEffect, useRef } from "react";
import {
  Search,
  Bell,
  UserPlus,
  RefreshCw,
  Zap,
  Music,
  Moon,
  ChevronDown,
  Sparkles,
  Image as ImageIcon,
  MapPin,
  MessageSquare,
  Smile,
  Users,
  Play,
  Maximize2
} from "lucide-react";

export function DraggableLayer() {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [flash, setFlash] = useState(false);
  const [activeTab, setActiveTab] = useState("camera");

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

      {/* TOP BAR OVERLAY */}
      <div className="relative z-10 flex items-center justify-between p-4 pt-6 bg-gradient-to-b from-black/70 to-transparent">
        <div className="relative">
          <div className="w-10 h-10 rounded-full bg-yellow-400 border-2 border-white flex items-center justify-center overflow-hidden">
            <span className="text-xl font-extrabold text-black">😎</span>
          </div>
          <span className="absolute top-0 right-0 w-3 h-3 bg-red-500 rounded-full border-2 border-black" />
        </div>

        <div className="flex items-center gap-3">
          <button className="p-2 rounded-full bg-black/40 backdrop-blur-md">
            <Search size={20} className="text-white" />
          </button>
          <button className="p-2 rounded-full bg-black/40 backdrop-blur-md">
            <Bell size={20} className="text-white" />
          </button>
          <button className="p-2 rounded-full bg-black/40 backdrop-blur-md">
            <UserPlus size={20} className="text-white" />
          </button>
          <button className="p-2 rounded-full bg-black/40 backdrop-blur-md">
            <RefreshCw size={20} className="text-white" />
          </button>
        </div>
      </div>

      {/* RIGHT SIDE VERTICAL SNAP TOOLBAR */}
      <div className="absolute right-4 top-24 z-10 flex flex-col gap-5 items-center bg-black/30 backdrop-blur-md p-2.5 rounded-full border border-white/10">
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
          <Users size={22} />
        </button>
        <button className="text-white">
          <Moon size={22} />
        </button>
        <button className="text-white">
          <ChevronDown size={22} />
        </button>
      </div>

      {/* BOTTOM SHUTTER & LENSES */}
      <div className="relative z-10 flex flex-col items-center mb-3">
        <div className="flex items-center justify-center gap-4 w-full px-6 mb-4">
          <button className="text-white">
            <Sparkles size={26} />
          </button>

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

          <div className="w-11 h-11 rounded-full border-2 border-white overflow-hidden bg-zinc-800 flex items-center justify-center">
            <span className="text-base">👨‍🦲</span>
          </div>

          <div className="w-11 h-11 rounded-full border-2 border-white overflow-hidden bg-zinc-800 flex items-center justify-center">
            <span className="text-base">👨‍⚕️</span>
          </div>
        </div>

        <div className="flex gap-6 text-xs font-bold tracking-wide text-white/80 mb-1">
          <span className="text-white border-b-2 border-white pb-0.5">Photo</span>
          <span className="text-white/60">Video</span>
          <span className="text-white/60">Text</span>
        </div>
      </div>

      {/* BOTTOM NAV BAR */}
      <div className="relative z-10 flex items-center justify-around py-3 bg-black border-t border-zinc-900 text-zinc-400">
        <button onClick={() => setActiveTab("map")} className={`p-2 ${activeTab === "map" ? "text-white" : ""}`}>
          <MapPin size={22} />
        </button>
        <button onClick={() => setActiveTab("chat")} className={`relative p-2 ${activeTab === "chat" ? "text-white" : ""}`}>
          <MessageSquare size={22} />
          <span className="absolute top-1 right-0 text-[10px] font-bold bg-red-500 text-white rounded-full px-1 py-0.2">
            31
          </span>
        </button>
        <button onClick={() => setActiveTab("camera")} className={`p-2 ${activeTab === "camera" ? "text-yellow-400" : ""}`}>
          <Smile size={24} />
        </button>
        <button onClick={() => setActiveTab("stories")} className={`relative p-2 ${activeTab === "stories" ? "text-white" : ""}`}>
          <Users size={22} />
        </button>
        <button onClick={() => setActiveTab("spotlight")} className={`relative p-2 ${activeTab === "spotlight" ? "text-white" : ""}`}>
          <Play size={22} />
        </button>
      </div>
    </div>
  );
}

export default DraggableLayer;
