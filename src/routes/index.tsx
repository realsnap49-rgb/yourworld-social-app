import React from "react";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { usePostSaves } from "@/lib/post-actions";
import { LongVideoCard } from "@/components/yw/LongVideoCard";
import { useLongVideos } from "@/lib/video-data";
import { setVideoQueue } from "@/lib/video-queue";
import { Search, Heart, Plus } from "lucide-react";
import { useMoments } from "@/lib/moment-store";
import { useAlertsCount } from "@/lib/alerts-count";
import ywLogo from "@/assets/yw-logo.png";

export const Route = createFileRoute("/")({
  component: HomePage,
  head: () => ({
    meta: [
      { title: "YourWorld – Moments, Reels & Chat" },
      { name: "description", content: "YourWorld (YW) is a premium social app for sharing moments, reels, stories and private chat." },
      { property: "og:title", content: "YourWorld – Moments, Reels & Chat" },
      { property: "og:description", content: "Share moments, watch reels and chat privately on YourWorld." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
});

function HomePage() {
  const navigate = useNavigate();
  const [hydrated, setHydrated] = React.useState(false);
  const { videos, loading, currentUserId, countView, toggleLike, reload } = useLongVideos();
  const { saved, toggleSave } = usePostSaves();
  const { moments } = useMoments();
  const { count: alertCount } = useAlertsCount();

  React.useEffect(() => setHydrated(true), []);

  // Keep the fullscreen swipe queue in sync with the feed.
  React.useEffect(() => {
    setVideoQueue(
      videos.map((v) => ({
        id: v.id,
        title: v.title,
        mediaUrl: v.mediaUrl,
        thumbnailUrl: v.thumbnailUrl,
        portrait: v.orientation === "portrait",
      })),
    );
  }, [videos]);

  const myLatest = React.useMemo(
    () => moments.find((m) => m.mine),
    [moments],
  );

  type StoryRing = {
    userId: string;
    username: string;
    avatarUrl?: string;
    hasUnseen: boolean;
    mine?: boolean;
    momentId?: string;
  };

  const stories = React.useMemo<StoryRing[]>(() => {
    const seen = new Set<string>();
    const list: StoryRing[] = [];
    for (const m of moments) {
      if (m.mine) continue;
      const uid = m.author?.id;
      if (!uid) continue;
      if (!seen.has(uid)) {
        seen.add(uid);
        list.push({
          userId: uid,
          username: m.author?.username ?? "user",
          avatarUrl: m.author?.avatar ?? undefined,
          hasUnseen: true,
          momentId: m.id,
        });
      }
    }
    return list;
  }, [moments]);

  return (
    <div className="min-h-screen bg-black text-white pb-24">
      {/* Header */}
      <header className="sticky top-0 z-30 flex items-center justify-between px-4 py-3 bg-black/95 backdrop-blur-md border-b border-neutral-900">
        <Link to="/" className="flex items-center gap-2">
          <img src={ywLogo} alt="YourWorld" className="h-8 w-auto object-contain" />
          <span className="font-bold text-xl tracking-tight bg-gradient-to-r from-pink-500 via-purple-500 to-indigo-500 bg-clip-text text-transparent">
            YourWorld
          </span>
        </Link>
        <div className="flex items-center gap-3">
          <Link to="/search" className="p-2 rounded-full hover:bg-neutral-900 text-neutral-200 transition-colors">
            <Search className="w-5 h-5" />
          </Link>
          <Link to="/notifications" className="relative p-2 rounded-full hover:bg-neutral-900 text-neutral-200 transition-colors">
            <Heart className="w-5 h-5" />
            {alertCount > 0 && (
              <span className="absolute top-1 right-1 w-4 h-4 bg-pink-600 text-[10px] font-bold rounded-full flex items-center justify-center text-white">
                {alertCount > 9 ? "9+" : alertCount}
              </span>
            )}
          </Link>
        </div>
      </header>

      {/* Stories / Moments Tray */}
      <div className="flex items-center gap-3 px-4 py-3 overflow-x-auto no-scrollbar border-b border-neutral-900/60 bg-black">
        <div className="flex flex-col items-center gap-1 shrink-0">
          <button
            onClick={() => {
              if (myLatest) {
                navigate({ to: "/moment/$momentId", params: { momentId: myLatest.id } });
              } else {
                navigate({ to: "/moment/create" });
              }
            }}
            className="relative w-16 h-16 rounded-full p-[2px] bg-gradient-to-tr from-pink-500 to-purple-600 flex items-center justify-center"
          >
            <div className="w-full h-full rounded-full bg-neutral-900 border-2 border-black overflow-hidden flex items-center justify-center">
              {myLatest?.media ? (
                <img src={myLatest.media} alt="My moment" className="w-full h-full object-cover" />
              ) : (
                <Plus className="w-6 h-6 text-pink-500" />
              )}
            </div>
          </button>
          <span className="text-xs text-neutral-300 font-medium truncate max-w-[68px]">
            Your moment
          </span>
        </div>

        {stories.map((s) => (
          <div key={s.userId} className="flex flex-col items-center gap-1 shrink-0">
            <button
              onClick={() => {
                if (s.momentId) {
                  navigate({ to: "/moment/$momentId", params: { momentId: s.momentId } });
                }
              }}
              className="w-16 h-16 rounded-full p-[2px] bg-gradient-to-tr from-pink-500 via-purple-500 to-yellow-500 flex items-center justify-center"
            >
              <div className="w-full h-full rounded-full bg-neutral-900 border-2 border-black overflow-hidden">
                {s.avatarUrl ? (
                  <img src={s.avatarUrl} alt={s.username} className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full bg-neutral-800 flex items-center justify-center text-sm font-bold text-neutral-300">
                    {s.username?.[0]?.toUpperCase() || "U"}
                  </div>
                )}
              </div>
            </button>
            <span className="text-xs text-neutral-400 truncate max-w-[68px]">
              {s.username}
            </span>
          </div>
        ))}
      </div>

      {/* Main Long Video Feed */}
      <main className="max-w-lg mx-auto px-2 sm:px-4 py-4 space-y-4">
        {!hydrated || loading ? (
          <div className="text-center py-12 text-neutral-500 text-sm">Loading feed...</div>
        ) : videos.length === 0 ? (
          <div className="text-center py-12 text-neutral-500 text-sm">No videos yet. Be the first to share!</div>
        ) : (
          videos.map((video) => (
            <LongVideoCard
              key={video.id}
              video={video}
              currentUserId={currentUserId}
              onView={countView}
              onLike={toggleLike}
              isSaved={!!saved[video.id]}
              onToggleSave={toggleSave}
              onDeleted={() => reload()}
            />
          ))
        )}

      </main>
    </div>
  );
}
