import React from "react";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { ArrowLeft, Camera, Image } from "lucide-react";

export const Route = createFileRoute("/channel/")({
  component: ChannelIndexPage,
});

export function ChannelIndexPage() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-[#09090b] text-white p-4 font-sans select-none pb-24">
      {/* Header */}
      <div className="flex items-center gap-3 mb-6">
        <button onClick={() => navigate({ to: "/settings" })} className="p-1 text-zinc-300 hover:text-white">
          <ArrowLeft size={22} />
        </button>
        <h1 className="text-xl font-bold">Create Channel</h1>
      </div>

      {/* Banner & Logo Upload */}
      <div className="bg-[#141418] border border-zinc-800 rounded-2xl p-4 space-y-4">
        <div className="relative w-full h-32 bg-zinc-900 border border-dashed border-zinc-700 rounded-xl flex items-center justify-center">
          <span className="text-xs text-zinc-400 flex items-center gap-2"><Image size={16} /> Channel banner</span>
          <button className="absolute top-2 right-2 bg-zinc-800 px-3 py-1 rounded-lg text-xs font-semibold">Banner</button>
        </div>

        <div className="flex items-center gap-3">
          <div className="w-14 h-14 rounded-full bg-zinc-800 border border-zinc-700 flex items-center justify-center text-zinc-400">
            <Camera size={20} />
          </div>
          <span className="text-xs text-zinc-400 max-w-[200px]">
            Add a square logo and a wide banner.
          </span>
        </div>
      </div>

      {/* Inputs */}
      <div className="space-y-4 mt-6">
        <div>
          <label className="text-xs text-zinc-400 font-semibold block mb-1">CHANNEL NAME</label>
          <input type="text" placeholder="Your channel name" className="w-full bg-[#141418] border border-zinc-800 rounded-xl p-3 text-sm text-white focus:outline-none focus:border-pink-500" />
        </div>

        <div>
          <label className="text-xs text-zinc-400 font-semibold block mb-1">@ USERNAME</label>
          <input type="text" placeholder="@channel.handle" className="w-full bg-[#141418] border border-zinc-800 rounded-xl p-3 text-sm text-white focus:outline-none focus:border-pink-500" />
        </div>
      </div>

      <button className="w-full mt-6 py-3 bg-gradient-to-r from-pink-500 to-purple-600 rounded-xl font-bold text-sm">
        Create Channel
      </button>
    </div>
  );
}

export default ChannelIndexPage;
