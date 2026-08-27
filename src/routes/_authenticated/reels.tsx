import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { 
  Heart, 
  MessageCircle, 
  Share2, 
  Bookmark, 
  Download, 
  MoreVertical, 
  Music, 
  Plus, 
  Volume2, 
  VolumeX, 
  Sparkles 
} from "lucide-react";

export const Route = createFileRoute("/_authenticated/reels")({
  component: WorldClassReelsPage,
});

function WorldClassReelsPage() {
  const [isLiked, setIsLiked] = useState(false);
  const [likeCount, setLikeCount] = useState(15200);
  const [isBookmarked, setIsBookmarked] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [isFollowing, setIsFollowing] = useState(false);

  return (
    <div className="relative h-screen w-full bg-black text-white overflow-hidden flex justify-center items-center font-sans select-none">
      <div className="relative h-full w-full max-w-md bg-black overflow-hidden flex flex-col justify-between shadow-2xl">
        
        {/* Top Header Overlay */}
        <div className="absolute top-4 left-4 right-4 z-30 flex justify-between items-center text-white font-bold drop-shadow-md">
          <div className="flex items-center gap-2">
            <span className="text-2xl font-black tracking-wider bg-gradient-to-r from-pink-500 to-purple-400 bg-clip-text text-transparent">
              YourWorld
            </span>
            <Sparkles className="w-4 h-4 text-pink-400 animate-pulse" />
          </div>
          <button 
            onClick={() => setIsMuted(!isMuted)} 
            className="p-2.5 bg-black/40 backdrop-blur-md rounded-full border border-white/10"
          >
            {isMuted ? <VolumeX className="w-5 h-5 text-white/80" /> : <Volume2 className="w-5 h-5 text-white" />}
          </button>
        </div>

        {/* Video Player */}
        <div className="absolute inset-0 z-0 bg-neutral-900 flex items-center justify-center">
          <video 
            className="h-full w-full object-cover" 
            src="https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerBlazes.mp4" 
            autoPlay 
            loop 
            muted={isMuted} 
            playsInline
          />
        </div>

        {/* Right Floating Sidebar */}
        <div className="absolute right-3 bottom-24 z-30 flex flex-col items-center gap-5 text-white">
          <button onClick={() => { setIsLiked(!isLiked); setLikeCount(prev => isLiked ? prev - 1 : prev + 1); }} className="flex flex-col items-center gap-1">
            <div className={`p-3 rounded-full backdrop-blur-md border border-white/10 ${isLiked ? "bg-pink-600/30 border-pink-500/50" : "bg-black/40"}`}>
              <Heart className={`w-7 h-7 ${isLiked ? "fill-pink-500 text-pink-500" : "text-white"}`} />
            </div>
            <span className="text-xs font-bold">{(likeCount / 1000).toFixed(1)}k</span>
          </button>

          <button className="flex flex-col items-center gap-1">
            <div className="p-3 bg-black/40 backdrop-blur-md rounded-full border border-white/10">
              <MessageCircle className="w-7 h-7 text-white" />
            </div>
            <span className="text-xs font-bold">842</span>
          </button>

          <button className="flex flex-col items-center gap-1">
            <div className="p-3 bg-black/40 backdrop-blur-md rounded-full border border-white/10">
              <Share2 className="w-7 h-7 text-white" />
            </div>
            <span className="text-xs font-bold">Share</span>
          </button>

          <button onClick={() => setIsBookmarked(!isBookmarked)} className="flex flex-col items-center gap-1">
            <div className={`p-3 rounded-full backdrop-blur-md border border-white/10 ${isBookmarked ? "bg-yellow-500/30" : "bg-black/40"}`}>
              <Bookmark className={`w-7 h-7 ${isBookmarked ? "fill-yellow-400 text-yellow-400" : "text-white"}`} />
            </div>
            <span className="text-xs font-bold">Save</span>
          </button>

          <button className="flex flex-col items-center gap-1">
            <div className="p-3 bg-black/40 backdrop-blur-md rounded-full border border-white/10">
              <Download className="w-7 h-7 text-white" />
            </div>
            <span className="text-xs font-bold">Save HD</span>
          </button>

          <button className="flex flex-col items-center gap-1">
            <div className="p-3 bg-black/40 backdrop-blur-md rounded-full border border-white/10">
              <MoreVertical className="w-7 h-7 text-white" />
            </div>
          </button>

          <div className="w-10 h-10 rounded-full border-2 border-white/80 overflow-hidden animate-spin mt-1">
            <div className="w-full h-full bg-gradient-to-tr from-pink-500 to-blue-500 flex items-center justify-center">
              <Music className="w-4 h-4 text-white" />
            </div>
          </div>
        </div>

        {/* Bottom Creator Info */}
        <div className="absolute bottom-6 left-4 right-20 z-30 flex flex-col gap-3 text-white">
          <div className="flex items-center gap-3">
            <div className="relative">
              <img src="https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=120&auto=format&fit=crop&q=80" alt="profile" className="w-11 h-11 rounded-full border-2 border-pink-500 object-cover" />
              {!isFollowing && (
                <button onClick={() => setIsFollowing(true)} className="absolute -bottom-1 -right-1 bg-pink-600 rounded-full p-1">
                  <Plus className="w-3 h-3 text-white" />
                </button>
              )}
            </div>
            <div className="flex items-center gap-2">
              <span className="font-bold text-sm">@priya_official</span>
              <button onClick={() => setIsFollowing(!isFollowing)} className={`text-xs font-bold px-3 py-1 rounded-full border ${isFollowing ? "bg-white/20" : "bg-pink-600 border-pink-500"}`}>
                {isFollowing ? "Following" : "Follow"}
              </button>
            </div>
          </div>
          <p className="text-sm line-clamp-2 text-gray-100">
            World class vibes only 🔥 ✨ <span className="font-bold text-pink-400">#YourWorld</span> #Reels
          </p>
          <div className="flex items-center gap-2 text-xs text-gray-200 bg-black/30 backdrop-blur-md px-3 py-1.5 rounded-full w-fit border border-white/10">
            <Music className="w-3.5 h-3.5 text-pink-400 animate-pulse" />
            <span className="truncate max-w-[180px]">Original Audio - Priya</span>
          </div>
        </div>

      </div>
    </div>
  );
}
