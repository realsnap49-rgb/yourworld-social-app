import React from "react";
import { Link, useLocation } from "@tanstack/react-router";
import { Home, Film, MessageSquare, User, Plus } from "lucide-react";

interface BottomNavProps {
  onOpenCreate?: () => void;
}

export function BottomNav({ onOpenCreate }: BottomNavProps) {
  const location = useLocation();

  // Hide bottom nav completely when on /create route
  if (location.pathname === "/create") {
    return null;
  }

  return (
    <div className="fixed bottom-0 left-0 right-0 z-40 bg-zinc-950/90 backdrop-blur-xl border-t border-zinc-800/60 px-4 py-2">
      <div className="max-w-md mx-auto flex items-center justify-around">
        <Link to="/" className="flex flex-col items-center gap-1 text-[10px] text-zinc-400 hover:text-white">
          <Home className="w-5 h-5" />
          <span>Home</span>
        </Link>

        <Link to="/reels" className="flex flex-col items-center gap-1 text-[10px] text-zinc-400 hover:text-white">
          <Film className="w-5 h-5" />
          <span>Reels</span>
        </Link>

        <button 
          onClick={onOpenCreate}
          className="w-12 h-12 -mt-5 bg-gradient-to-tr from-pink-500 via-purple-500 to-amber-400 text-white rounded-full flex items-center justify-center shadow-lg active:scale-95 transition"
        >
          <Plus className="w-6 h-6 stroke-[3]" />
        </button>

        <Link to="/chat" className="flex flex-col items-center gap-1 text-[10px] text-zinc-400 hover:text-white">
          <MessageSquare className="w-5 h-5" />
          <span>Chat</span>
        </Link>

        <Link to="/profile" className="flex flex-col items-center gap-1 text-[10px] text-zinc-400 hover:text-white">
          <User className="w-5 h-5" />
          <span>Profile</span>
        </Link>
      </div>
    </div>
  );
}
