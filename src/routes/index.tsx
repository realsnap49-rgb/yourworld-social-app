import React, { useState } from "react";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { Search, Heart, MessageCircle, Send, Bookmark, MoreHorizontal } from "lucide-react";

export const Route = createFileRoute("/")({
  component: HomePage,
});

export function HomePage() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-black text-white pb-20 select-none">
      {/* Top Header */}
      <div className="flex justify-between items-center px-4 py-3 border-b border-zinc-800 sticky top-0 bg-black/90 backdrop-blur-md z-40">
        <h1 className="text-xl font-extrabold tracking-tight">YourWorld</h1>
        <div className="flex items-center gap-4">
          <Search size={20} className="text-zinc-300" />
          <Heart size={20} className="text-zinc-300" />
        </div>
      </div>

      {/* Main Feed */}
      <div className="p-4 text-center text-zinc-500 text-sm mt-10">
        <p>Welcome to YourWorld Feed!</p>
      </div>
    </div>
  );
}

export default HomePage;
