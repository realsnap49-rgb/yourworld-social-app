import React, { useState } from "react";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import {
  Search, Heart, MessageCircle, Send, Bookmark, MoreHorizontal,
  Plus, Home, Film, MessageSquare, User
} from "lucide-react";

export const Route = createFileRoute("/")({
  component: HomePage,
});

type Post = {
  id: number;
  user: { name: string; handle: string; location: string; avatarColor: string; letter: string };
  image: string;
  caption: string;
  likes: number;
  commentsCount: number;
  timeAgo: string;
  isLiked: boolean;
  isSaved: boolean;
};

export function HomePage() {
  const navigate = useNavigate();

  const [posts, setPosts] = useState<Post[]>([
    {
      id: 101,
      user: {
        name: "Riko Tan",
        handle: "@riko.night",
        location: "Tokyo, Japan",
        avatarColor: "bg-[#8b2fc9]",
        letter: "R"
      },
      image: "https://images.unsplash.com/photo-1503899036084-c55cdd92da26?w=800",
      caption: "Shinjuku after the rain. The signs do all the talking. 🌃✨",
      likes: 12800,
      commentsCount: 89,
      timeAgo: "2h ago",
      isLiked: false,
      isSaved: false
    }
  ]);

  const toggleLike = (postId: number) => {
    setPosts(prev => prev.map(p => {
      if (p.id === postId) {
        return { ...p, isLiked: !p.isLiked, likes: p.isLiked ? p.likes - 1 : p.likes + 1 };
      }
      return p;
    }));
  };

  const toggleSave = (postId: number) => {
    setPosts(prev => prev.map(p => (p.id === postId ? { ...p, isSaved: !p.isSaved } : p)));
  };

  return (
    <div className="min-h-screen bg-[#0d0d0f] text-white font-sans pb-28 select-none">
      
      {/* 1. TOP APP BAR */}
      <div className="sticky top-0 z-40 bg-[#0d0d0f]/90 border-b border-zinc-900/50 backdrop-blur-md px-4 py-3 flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-full bg-zinc-800 border border-zinc-700/60 flex items-center justify-center font-black text-xs text-white">
            YW
          </div>
          <h1 className="text-xl font-bold text-white tracking-tight">YourWorld</h1>
        </div>

        <div className="flex items-center gap-4">
          <button className="p-1 text-zinc-300 hover:text-white">
            <Search size={22} />
          </button>
          
          <button className="relative p-1 text-zinc-300 hover:text-white">
            <Heart size={24} />
            <span className="absolute -top-1 -right-2 bg-pink-500 text-white font-bold text-[10px] px-1.5 py-0.5 rounded-full border border-[#0d0d0f]">
              68
            </span>
          </button>
        </div>
      </div>

      {/* 2. STORY TRAY */}
      <div className="px-4 py-4 overflow-x-auto flex items-center gap-4 border-none [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
        
        {/* Your Moment */}
        <div 
          onClick={() => navigate({ to: "/moment/create" })} 
          className="flex flex-col items-center gap-2 shrink-0 cursor-pointer active:scale-95 transition-transform"
        >
          <div className="relative">
            <div className="w-16 h-16 rounded-full bg-[#a83279] border-2 border-[#d946ef] flex items-center justify-center font-bold text-2xl text-white shadow-md">
              Y
            </div>
            <div className="absolute bottom-0 right-0 w-5 h-5 rounded-full bg-[#ec4899] border-2 border-[#0d0d0f] flex items-center justify-center text-white">
              <Plus size={12} strokeWidth={3} />
            </div>
          </div>
          <span className="text-[11px] font-medium text-zinc-300">Your moment</span>
        </div>

        {/* Friends Stories */}
        {[
          { id: 1, name: "riko.night", letter: "R", bg: "bg-[#7e22ce]", ring: "border-[#ec4899]" },
          { id: 2, name: "sea.salt", letter: "M", bg: "bg-[#0d9488]", ring: "border-[#14b8a6]" },
          { id: 3, name: "spinsolo", letter: "A", bg: "bg-[#ea580c]", ring: "border-[#f97316]" },
          { id: 4, name: "slowbrunch", letter: "N", bg: "bg-[#dc2626]", ring: "border-[#ef4444]" },
          { id: 5, name: "wavelen", letter: "K", bg: "bg-[#0284c7]", ring: "border-[#38bdf8]" },
        ].map((s) => (
          <div key={s.id} className="flex flex-col items-center gap-2 shrink-0 cursor-pointer active:scale-95 transition-transform">
            <div className={`p-[2px] rounded-full border-2 ${s.ring}`}>
              <div className={`w-15 h-15 rounded-full ${s.bg} flex items-center justify-center font-bold text-2xl text-white border border-[#0d0d0f]`}>
                {s.letter}
              </div>
            </div>
            <span className="text-[11px] font-medium text-zinc-300 w-16 truncate text-center">{s.name}</span>
          </div>
        ))}

      </div>

      {/* 3. POST CARD FEED */}
      <div className="max-w-md mx-auto p-3 space-y-4">
        {posts.map((post) => (
          <div key={post.id} className="bg-[#141418] border border-zinc-800/80 rounded-3xl overflow-hidden shadow-2xl p-1.5 space-y-3">
            
            <div className="p-3 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className={`w-9 h-9 rounded-full ${post.user.avatarColor} border border-pink-500/80 flex items-center justify-center font-bold text-base text-white`}>
                  {post.user.letter}
                </div>
                <div className="flex flex-col">
                  <span className="font-bold text-sm text-white leading-tight">{post.user.handle}</span>
                  <span className="text-[10px] text-zinc-400">{post.user.location}</span>
                </div>
              </div>
              <button className="text-zinc-400 hover:text-white p-1">
                <MoreHorizontal size={18} />
              </button>
            </div>

            <div className="relative w-full aspect-square bg-zinc-900 rounded-2xl overflow-hidden">
              <img src={post.image} alt="Post" className="w-full h-full object-cover" />
            </div>

            <div className="px-3 pb-3 space-y-2">
              <div className="flex items-center justify-between pt-1">
                <div className="flex items-center gap-4">
                  <button onClick={() => toggleLike(post.id)} className="active:scale-75 transition-transform">
                    <Heart size={22} className={post.isLiked ? "fill-pink-500 text-pink-500" : "text-zinc-300"} />
                  </button>
                  <button className="text-zinc-300 active:scale-75 transition-transform">
                    <MessageCircle size={22} />
                  </button>
                  <button className="text-zinc-300 active:scale-75 transition-transform">
                    <Send size={20} />
                  </button>
                </div>

                <button onClick={() => toggleSave(post.id)} className="text-zinc-300 active:scale-75 transition-transform">
                  <Bookmark size={22} className={post.isSaved ? "fill-white text-white" : "text-zinc-300"} />
                </button>
              </div>

              <div className="text-xs font-bold text-white">12.8K likes</div>
              <p className="text-xs text-zinc-300 leading-relaxed">
                <span className="font-bold mr-1.5 text-white">{post.user.handle}</span>
                {post.caption}
              </p>
            </div>

          </div>
        ))}
      </div>

      {/* 4. FLOATING BOTTOM NAV (PROFILE WORKING FIX) */}
      <div className="fixed bottom-4 left-1/2 -translate-x-1/2 z-50 w-[92%] max-w-md bg-[#1f1a2e]/90 border border-white/10 backdrop-blur-xl rounded-full p-2 px-4 shadow-2xl flex items-center justify-between">
        
        <button onClick={() => navigate({ to: "/" })} className="flex flex-col items-center justify-center py-1 px-3 bg-zinc-800/80 rounded-2xl text-white">
          <Home size={20} />
          <span className="text-[10px] font-bold mt-0.5">Home</span>
        </button>

        <button onClick={() => navigate({ to: "/reels" })} className="flex flex-col items-center justify-center py-1 px-3 text-zinc-400 hover:text-white">
          <Film size={20} />
          <span className="text-[10px] font-semibold mt-0.5">Reels</span>
        </button>

        <button onClick={() => navigate({ to: "/moment/create" })} className="w-12 h-12 rounded-full bg-gradient-to-r from-teal-400 via-pink-500 to-purple-500 flex items-center justify-center text-white shadow-lg active:scale-90 transition-transform">
          <Plus size={26} />
        </button>

        <button onClick={() => navigate({ to: "/chat/$threadId", params: { threadId: "t1" } })} className="flex flex-col items-center justify-center py-1 px-3 text-zinc-400 hover:text-white">
          <MessageSquare size={20} />
          <span className="text-[10px] font-semibold mt-0.5">Chat</span>
        </button>

        <button onClick={() => navigate({ to: "/profile" })} className="flex flex-col items-center justify-center py-1 px-3 text-zinc-400 hover:text-white active:scale-90 transition-transform cursor-pointer">
          <User size={20} />
          <span className="text-[10px] font-semibold mt-0.5">Profile</span>
        </button>

      </div>

    </div>
  );
}

export default HomePage;
