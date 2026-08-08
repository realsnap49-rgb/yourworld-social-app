import React, { useState } from "react";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import {
  Settings, Grid, Bookmark, Play, MapPin, Link as LinkIcon, CheckCircle2
} from "lucide-react";

export const Route = createFileRoute("/profile")({
  component: ProfilePage,
});

export function ProfilePage() {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<"posts" | "reels" | "saved">("posts");

  return (
    <div className="min-h-screen bg-[#09090b] text-white font-sans pb-28 select-none">
      
      {/* TOP HEADER */}
      <div className="sticky top-0 z-40 bg-[#09090b]/90 border-b border-zinc-900/50 backdrop-blur-md px-4 py-3 flex items-center justify-between">
        <div className="flex items-center gap-1.5">
          <span className="font-bold text-lg text-white">@you</span>
          <CheckCircle2 size={16} className="text-sky-400 fill-sky-400/20" />
        </div>
        <button 
          onClick={() => navigate({ to: "/settings" })} 
          className="p-2 text-zinc-300 hover:text-white active:scale-90 transition-transform"
        >
          <Settings size={22} />
        </button>
      </div>

      {/* USER STATS & AVATAR */}
      <div className="p-4 space-y-4">
        <div className="flex items-center justify-between">
          <div className="relative">
            <div className="w-20 h-20 rounded-full bg-gradient-to-tr from-pink-500 via-purple-500 to-rose-500 p-[2.5px] shadow-xl">
              <div className="w-full h-full rounded-full bg-[#18181b] flex items-center justify-center font-bold text-3xl text-white">
                Y
              </div>
            </div>
          </div>

          <div className="flex gap-6 text-center">
            <div>
              <div className="font-bold text-base text-white">148</div>
              <div className="text-xs text-zinc-400">Posts</div>
            </div>
            <div>
              <div className="font-bold text-base text-white">24.8K</div>
              <div className="text-xs text-zinc-400">Followers</div>
            </div>
            <div>
              <div className="font-bold text-base text-white">612</div>
              <div className="text-xs text-zinc-400">Following</div>
            </div>
          </div>
        </div>

        {/* BIO SECTION */}
        <div className="space-y-1">
          <h2 className="font-bold text-sm text-white">Your World</h2>
          <span className="text-xs text-zinc-400 font-medium">Creator</span>
          <p className="text-xs text-zinc-200 leading-relaxed pt-1">
            Night photographer 🌌 reel maker • collecting small moments <br />
            Neon streets, slow mornings and long exposures ✨ <br />
            Shot on 35mm • edits in the dark
          </p>
          <div className="flex items-center gap-3 pt-2 text-xs text-zinc-400">
            <span className="flex items-center gap-1"><MapPin size={12} /> Tokyo, Japan</span>
            <span className="flex items-center gap-1 text-pink-400 font-medium"><LinkIcon size={12} /> yourworld.app/you</span>
          </div>
        </div>

        {/* PROFILE ACTION BUTTONS */}
        <div className="flex gap-2 pt-2">
          <button className="flex-1 py-2.5 bg-zinc-800/80 hover:bg-zinc-800 border border-zinc-700/50 rounded-xl text-xs font-bold text-white active:scale-95 transition-transform">
            Edit profile
          </button>
          <button className="flex-1 py-2.5 bg-zinc-800/80 hover:bg-zinc-800 border border-zinc-700/50 rounded-xl text-xs font-bold text-white active:scale-95 transition-transform">
            Share profile
          </button>
        </div>
      </div>

      {/* TABS (Grid, Reels, Saved) */}
      <div className="flex justify-around border-t border-zinc-800/80 mt-2 bg-[#09090b]">
        <button 
          onClick={() => setActiveTab("posts")} 
          className={`py-3.5 flex-1 flex justify-center ${activeTab === "posts" ? "border-b-2 border-white text-white" : "text-zinc-500"}`}
        >
          <Grid size={22} />
        </button>
        <button 
          onClick={() => setActiveTab("reels")} 
          className={`py-3.5 flex-1 flex justify-center ${activeTab === "reels" ? "border-b-2 border-white text-white" : "text-zinc-500"}`}
        >
          <Play size={22} />
        </button>
        <button 
          onClick={() => setActiveTab("saved")} 
          className={`py-3.5 flex-1 flex justify-center ${activeTab === "saved" ? "border-b-2 border-white text-white" : "text-zinc-500"}`}
        >
          <Bookmark size={22} />
        </button>
      </div>

      {/* GRID POSTS */}
      <div className="grid grid-cols-3 gap-0.5 mt-0.5">
        {[
          "https://images.unsplash.com/photo-1503899036084-c55cdd92da26?w=400",
          "https://images.unsplash.com/photo-1517841905240-472988babdf9?w=400",
          "https://images.unsplash.com/photo-1682687220063-4742bd7fd538?w=400"
        ].map((imgUrl, idx) => (
          <div key={idx} className="aspect-square bg-zinc-900 overflow-hidden relative">
            <img src={imgUrl} alt="Post" className="w-full h-full object-cover" />
          </div>
        ))}
      </div>

    </div>
  );
}

export default ProfilePage;
