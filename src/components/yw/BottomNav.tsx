import React from "react";
import { useNavigate, useLocation } from "@tanstack/react-router";
import { Home, Film, Plus, MessageSquare, User } from "lucide-react";

export function BottomNav() {
  const navigate = useNavigate();
  const location = useLocation();

  return (
    <div className="fixed bottom-0 left-0 right-0 z-40 bg-black/90 backdrop-blur-lg border-t border-zinc-800/80 py-2 px-6 flex justify-between items-center max-w-md mx-auto">
      {/* Home */}
      <button 
        onClick={() => navigate({ to: "/" })} 
        className={`flex flex-col items-center gap-1 transition ${location.pathname === "/" ? "text-white" : "text-zinc-500"}`}
      >
        <Home className="w-6 h-6" />
        <span className="text-[10px]">Home</span>
      </button>

      {/* Reels */}
      <button 
        onClick={() => navigate({ to: "/reels" })} 
        className={`flex flex-col items-center gap-1 transition ${location.pathname === "/reels" ? "text-white" : "text-zinc-500"}`}
      >
        <Film className="w-6 h-6" />
        <span className="text-[10px]">Reels</span>
      </button>

      {/* DIRECT FULL CAMERA ROUTING (No Sheet Popup) */}
      <button 
        onClick={() => navigate({ to: "/create" })} 
        className="w-12 h-12 bg-white text-black rounded-full flex items-center justify-center shadow-2xl hover:scale-105 active:scale-95 transition"
      >
        <Plus className="w-7 h-7 stroke-[2.5]" />
      </button>

      {/* Chat */}
      <button 
        onClick={() => navigate({ to: "/chat" })} 
        className={`flex flex-col items-center gap-1 transition ${location.pathname === "/chat" ? "text-white" : "text-zinc-500"}`}
      >
        <MessageSquare className="w-6 h-6" />
        <span className="text-[10px]">Chat</span>
      </button>

      {/* Profile */}
      <button 
        onClick={() => navigate({ to: "/profile" })} 
        className={`flex flex-col items-center gap-1 transition ${location.pathname === "/profile" ? "text-white" : "text-zinc-500"}`}
      >
        <User className="w-6 h-6" />
        <span className="text-[10px]">Profile</span>
      </button>
    </div>
  );
}
