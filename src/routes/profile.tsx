import React, { useState } from "react";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { Settings, Grid, Bookmark, Play, MapPin, Link as LinkIcon, CheckCircle2, X } from "lucide-react";

export const Route = createFileRoute("/profile")({
  component: ProfilePage,
});

export function ProfilePage() {
  const navigate = useNavigate();
  return (
    <div className="min-h-screen bg-[#09090b] text-white font-sans pb-28">
      <div className="sticky top-0 z-40 bg-[#09090b]/90 border-b border-zinc-900/50 backdrop-blur-md px-4 py-3 flex items-center justify-between">
        <span className="font-bold text-lg">@you</span>
        <button onClick={() => navigate({ to: "/settings" })} className="p-2"><Settings size={22} /></button>
      </div>
      <div className="p-6 text-center">
         <div className="w-24 h-24 mx-auto rounded-full bg-gradient-to-tr from-pink-500 to-purple-600 flex items-center justify-center font-bold text-4xl mb-4">Y</div>
         <h1 className="text-xl font-bold">Your World</h1>
         <p className="text-sm text-zinc-400 mt-2">Night photographer • Reel maker</p>
         <div className="flex gap-4 justify-center mt-6">
           <button onClick={() => navigate({ to: "/channel/posts" })} className="bg-zinc-800 px-6 py-2 rounded-lg text-sm">Channel</button>
           <button onClick={() => navigate({ to: "/orbit" })} className="bg-zinc-800 px-6 py-2 rounded-lg text-sm">Orbit</button>
         </div>
      </div>
    </div>
  );
}
