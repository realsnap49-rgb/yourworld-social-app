import React, { memo } from "react";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useSocialPosts } from "@/lib/social-data";
import { usePostSaves } from "@/lib/post-actions";
import { FeedPostCard } from "@/components/yw/FeedPostCard";
import { useLongVideos } from "@/lib/video-data";
import { LongVideoCard } from "@/components/yw/LongVideoCard";
import { Search, Heart, Plus, ImagePlus } from "lucide-react";
import ywLogo from "@/assets/yw-logo.png";

export const Route = createFileRoute("/")({
  component: HomePage,
  head: () => ({
    meta: [
      { title: "YourWorld — Moments, Reels & Chat" },
      { name: "description", content: "YourWorld (YW) is a premium social app for sharing moments, reels, stories and private chats with the people who matter." },
      { property: "og:title", content: "YourWorld — Moments, Reels & Chat" },
      { property: "og:description", content: "Share moments, watch reels and chat privately on YourWorld." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
});

type Story = { id: number; name: string; letter: string; bg: string; ring: string };

const STORY_CIRCLES: Story[] = [
  { id: 1, name: "riko.night", letter: "R", bg: "bg-[#7e22ce]", ring: "border-[#ec4899]" },
  { id: 2, name: "sea.salt", letter: "M", bg: "bg-[#0d9488]", ring: "border-[#14b8a6]" },
  { id: 3, name: "spinsolo", letter: "A", bg: "bg-[#ea580c]", ring: "border-[#f97316]" },
  { id: 4, name: "slowbrunch", letter: "N", bg: "bg-[#dc2626]", ring: "border-[#ef4444]" },
  { id: 5, name: "wavelen", letter: "K", bg: "bg-[#0284c7]", ring: "border-[#38bdf8]" },
];

const StoryCircle = memo(function StoryCircle({ story }: { story: Story }) {
  return (
    <Link
      to="/moment"
      preload="intent"
      className="flex flex-col items-center gap-2 shrink-0 cursor-pointer active:scale-95 transition-transform"
    >
      <div className={`p-[2px] rounded-full border-2 ${story.ring}`}>
        <div
          className={`w-13 h-13 rounded-full ${story.bg} flex items-center justify-center font-bold text-2xl text-white border border-[#0d0d0f]`}
        >
          {story.letter}
        </div>
      </div>
      <span className="text-[11px] font-medium text-zinc-300 w-13 truncate text-center">
        {story.name}
      </span>
    </Link>
  );
});

export function HomePage() {
  const navigate = useNavigate();
  const {
    posts,
    loading,
    currentUserId,
    toggleLike,
    reload,
  } = useSocialPosts("post");
  const { saved, toggleSave } = usePostSaves();
  const {
    videos: longVideos,
    countView,
    toggleLike: likeVideo,
    reload: reloadVideos,
  } = useLongVideos();

  return (
    <div className="min-h-screen bg-[#0d0d0f] text-white font-sans pb-28 select-none">
      
      {/* 1. TOP APP BAR */}
      <div className="sticky top-0 z-40 bg-[#0d0d0f]/90 border-b border-zinc-900/50 backdrop-blur-md px-4 py-3 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <img
            src={ywLogo}
            alt="YourWorld logo"
            width={1024}
            height={1024}
            className="h-8 w-8 object-contain drop-shadow-[0_0_12px_rgba(168,85,247,0.45)]"
          />
          <h1 className="text-2xl font-extrabold tracking-wider bg-gradient-to-r from-pink-500 via-purple-500 to-indigo-500 bg-clip-text text-transparent">
            YourWorld
          </h1>
        </div>

        <div className="flex items-center gap-4">
          <Link
            to="/search"
            aria-label="Search"
            preload="intent"
            className="p-1 text-zinc-300 hover:text-white"
          >
            <Search size={22} />
          </Link>

          <Link
            to="/notifications"
            aria-label="Notifications"
            preload="intent"
            className="relative p-1 text-zinc-300 hover:text-white"
          >
            <Heart size={24} />
            <span className="absolute -top-1 -right-2 bg-pink-500 text-white font-bold text-[10px] px-1.5 py-0.5 rounded-full border border-[#0d0d0f]">
              68
            </span>
          </Link>
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
            <div className="w-13 h-13 rounded-full bg-[#a83279] border-2 border-[#d946ef] flex items-center justify-center font-bold text-2xl text-white shadow-md">
              Y
            </div>
            <div className="absolute bottom-0 right-0 w-5 h-5 rounded-full bg-[#ec4899] border-2 border-[#0d0d0f] flex items-center justify-center text-white">
              <Plus size={12} strokeWidth={3} />
            </div>
          </div>
          <span className="text-[11px] font-medium text-zinc-300">Your moment</span>
        </div>

        {/* Friends Stories */}
        {STORY_CIRCLES.map((s) => (
          <StoryCircle key={s.id} story={s} />
        ))}

      </div>

      {/* 3. LONG VIDEOS + POST CARD FEED */}
      <div className="mx-auto w-full max-w-2xl space-y-4">
        {longVideos.map((v) => (
          <LongVideoCard
            key={v.id}
            video={v}
            onView={countView}
            onLike={likeVideo}
            currentUserId={currentUserId}
            isSaved={!!saved[v.id]}
            onToggleSave={toggleSave}
            onDeleted={() => void reloadVideos()}
          />
        ))}
        {posts.map((post) => (
          <div key={post.id} className="px-3">
            <FeedPostCard
              post={post}
              currentUserId={currentUserId}
              onToggleLike={toggleLike}
              isSaved={!!saved[post.id]}
              onToggleSave={toggleSave}
              onDeleted={() => void reload()}
            />
          </div>
        ))}

        {!loading && posts.length === 0 && longVideos.length === 0 && (
          <button
            onClick={() => navigate({ to: "/post/create" })}
            className="mx-3 flex w-[calc(100%-1.5rem)] flex-col items-center gap-3 rounded-3xl border border-dashed border-zinc-800 bg-[#141418] px-6 py-14 text-center active:scale-[0.99]"
          >
            <div className="grid h-14 w-14 place-items-center rounded-2xl bg-gradient-to-br from-pink-500 to-purple-600">
              <ImagePlus size={24} />
            </div>
            <p className="font-semibold">No posts yet</p>
            <p className="text-xs text-zinc-400">Share your first moment with YourWorld</p>
          </button>
        )}
      </div>

    </div>
  );
}
