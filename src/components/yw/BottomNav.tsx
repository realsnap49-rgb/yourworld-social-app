import React, { memo, useState, useCallback } from "react";
import { Link } from "@tanstack/react-router";
import { Home, Film, Plus, MessageSquare, User } from "lucide-react";
import { CreateSheet } from "@/components/yw/CreateSheet";

export const BottomNav = memo(function BottomNav() {
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const openCreate = useCallback(() => setIsCreateOpen(true), []);
  const closeCreate = useCallback(() => setIsCreateOpen(false), []);

  return (
    <>
      <div className="fixed bottom-4 left-1/2 -translate-x-1/2 z-50 w-[92%] max-w-md bg-[#1f1a2e]/90 border border-white/10 backdrop-blur-xl rounded-full p-2 px-4 shadow-2xl flex items-center justify-between">
        <Link to="/" preload="intent" className="flex flex-col items-center justify-center py-1 px-3 text-zinc-400 hover:text-white" activeProps={{ className: "flex flex-col items-center justify-center py-1 px-3 text-white" }} activeOptions={{ exact: true }}>
          <Home size={20} />
          <span className="text-[10px] font-semibold mt-0.5">Home</span>
        </Link>

        <Link to="/reels" preload="intent" className="flex flex-col items-center justify-center py-1 px-3 text-zinc-400 hover:text-white">
          <Film size={20} />
          <span className="text-[10px] font-semibold mt-0.5">Reels</span>
        </Link>

        <button
          type="button"
          onClick={openCreate}
          aria-label="Create"
          className="w-12 h-12 rounded-full bg-gradient-to-r from-teal-400 via-pink-500 to-purple-500 flex items-center justify-center text-white shadow-lg active:scale-90 transition-transform"
        >
          <Plus size={26} />
        </button>

        <Link to="/chat" preload="intent" className="flex flex-col items-center justify-center py-1 px-3 text-zinc-400 hover:text-white">
          <MessageSquare size={20} />
          <span className="text-[10px] font-semibold mt-0.5">Chat</span>
        </Link>

        <Link to="/profile" preload="intent" className="flex flex-col items-center justify-center py-1 px-3 text-zinc-400 hover:text-white">
          <User size={20} />
          <span className="text-[10px] font-semibold mt-0.5">Profile</span>
        </Link>
      </div>

      <CreateSheet isOpen={isCreateOpen} onClose={closeCreate} />
    </>
  );
});

export default BottomNav;
