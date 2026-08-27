import React, { memo } from "react";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useSocialPosts } from "@/lib/social-data";
import { usePostSaves } from "@/lib/post-actions";
import { FeedPostCard } from "@/components/yw/FeedPostCard";
import { Search, Heart, Plus, ImagePlus } from "lucide-react";
import { useMoments } from "@/lib/moment-store";
import { useAlertsCount } from "@/lib/alerts-count";
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

type StoryRing = {
  userId: string;
  momentId: string;
  name: string;
  avatar: string | null;
  letter: string;
  media: string;
  kind: string;
  textBg: string;
};

const StoryCircle = memo(function StoryCircle({ story }: { story: StoryRing }) {
  return (
    <Link
      to="/moment/$momentId"
      params={{ momentId: story.momentId }}
      preload="intent"
      className="flex flex-col items-center gap-2 shrink-0 cursor-pointer active:scale-95 transition-transform"
    >
      <div className="p-[2px] rounded-full bg-gradient-to-tr from-amber-400 via-pink-500 to-purple-600">
        <div className="rounded-full border-2 border-[#0d0d0f] overflow-hidden">
          {story.avatar ? (
            <img
              src={story.avatar}
              alt={story.name}
              className="w-13 h-13 rounded-full object-cover"
            />
          ) : story.kind !== "text" && story.media ? (
            <img src={story.media} alt="" className="w-13 h-13 rounded-full object-cover" />
          ) : (
            <div
              className="w-13 h-13 rounded-full flex items-center justify-center font-bold text-2xl text-white"
              style={{ background: story.textBg || "#7e22ce" }}
            >
              {story.letter}
            </div>
          )}
        </div>
      </div>
      <span className="text-[11px] font-medium text-zinc-300 w-13 truncate text-center">
        {story.name}
      </span>
    </Link>
  );
});


function HomePage() {
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
    posts: reelPosts,
    currentUserId: reelUserId,
    toggleLike: toggleReelLike,
    reload: reloadReels,
  } = useSocialPosts("reel");
  const { moments } = useMoments();
  const { count: alertCount } = useAlertsCount();

  const myLatest = React.useMemo(
    () => moments.find((m) => m.mine),
    [moments],
  );

  const stories = React.useMemo<StoryRing[]>(() => {
    const seen = new Set<string>();
    const list: StoryRing[] = [];
    for (const m of moments) {
      if (m.mine) continue;
      const uid = m.author?.id ?? "";
      if (!uid || seen.has(uid)) continue;
      seen.add(uid);
      const name = m.author?.username ?? "user";
      list.push({
        userId: uid,
        momentId: m.id,
        name,
        avatar: m.author?.avatar ?? null,
        letter: name.charAt(0).toUpperCase(),
        media: m.media,
        kind: m.kind,
        textBg: m.textBg,
      });
    }
    return list;
  }, [moments]);


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
            {alertCount > 0 && (
              <span className="absolute -top-1 -right-2 bg-pink-500 text-white font-bold text-[10px] px-1.5 py-0.5 rounded-full border border-[#0d0d0f]">
                {alertCount > 99 ? "99+" : alertCount}
              </span>
            )}

          </Link>
        </div>
      </div>

      {/* 2. STORY TRAY */}
      <div className="px-4 py-4 overflow-x-auto flex items-center gap-4 border-none [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
        
        {/* Your Moment */}
        <div
          onClick={() =>
            myLatest
              ? navigate({ to: "/moment/$momentId", params: { momentId: myLatest.id } })
              : navigate({ to: "/moment/create" })
          }
          className="flex flex-col items-center gap-2 shrink-0 cursor-pointer active:scale-95 transition-transform"
        >
          <div className="relative">
            {myLatest && myLatest.kind !== "text" && myLatest.media ? (
              <img
                src={myLatest.media}
                alt="Your moment"
                className="w-13 h-13 rounded-full object-cover border-2 border-[#d946ef]"
              />
            ) : (
              <div className="w-13 h-13 rounded-full bg-[#a83279] border-2 border-[#d946ef] flex items-center justify-center font-bold text-2xl text-white shadow-md">
                Y
              </div>
            )}
            <div className="absolute bottom-0 right-0 w-5 h-5 rounded-full bg-[#ec4899] border-2 border-[#0d0d0f] flex items-center justify-center text-white">
              <Plus size={12} strokeWidth={3} />
            </div>
          </div>
          <span className="text-[11px] font-medium text-zinc-300">Your moment</span>
        </div>

        {/* Friends Stories */}
        {stories.map((s) => (
          <StoryCircle key={s.userId} story={s} />
        ))}


      </div>

      {/* 3. REELS + POST CARD FEED */}
      <div className="mx-auto w-full max-w-2xl space-y-4">
        {reelPosts.map((reel) => (
          <div key={reel.id} className="px-3">
            <FeedPostCard
              post={reel}
              reel
              currentUserId={reelUserId}
              onToggleLike={toggleReelLike}
              isSaved={!!saved[reel.id]}
              onToggleSave={toggleSave}
              onDeleted={() => void reloadReels()}
            />
          </div>
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

        {!loading && posts.length === 0 && reelPosts.length === 0 && (
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
