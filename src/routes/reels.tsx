import { createFileRoute } from "@tanstack/react-router";
import { Film } from "lucide-react";
import { useLongVideos } from "@/lib/video-data";
import { usePostSaves } from "@/lib/post-actions";
import { LongVideoCard } from "@/components/yw/LongVideoCard";

export const Route = createFileRoute("/reels")({
  head: () => ({
    meta: [
      { title: "Video — YourWorld" },
      {
        name: "description",
        content:
          "Watch long-form videos from creators on YourWorld — full player, likes, comments and downloads.",
      },
      { property: "og:title", content: "Video — YourWorld" },
      {
        property: "og:description",
        content: "Watch long-form videos from creators on YourWorld.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: VideoPage,
});

function VideoPage() {
  const { videos, loading, currentUserId, countView, toggleLike, reload } = useLongVideos();
  const { saved, toggleSave } = usePostSaves();

  return (
    <main className="min-h-screen bg-[#0d0d0f] text-white pb-28">
      <div className="sticky top-0 z-40 flex items-center gap-2 border-b border-zinc-900/50 bg-[#0d0d0f]/90 px-4 py-3 backdrop-blur-md">
        <Film className="h-5 w-5 text-pink-500" />
        <h1 className="text-xl font-extrabold tracking-wide">Video</h1>
      </div>

      <div className="mx-auto w-full max-w-2xl space-y-4 py-4">
        {videos.map((v) => (
          <LongVideoCard
            key={v.id}
            video={v}
            onView={countView}
            onLike={toggleLike}
            currentUserId={currentUserId}
            isSaved={!!saved[v.id]}
            onToggleSave={toggleSave}
            onDeleted={() => void reload()}
          />
        ))}

        {!loading && videos.length === 0 && (
          <div className="flex flex-col items-center gap-2 py-20 text-center">
            <Film className="h-10 w-10 text-zinc-700" />
            <p className="text-sm text-zinc-400">No videos yet</p>
            <p className="text-xs text-zinc-500">Long videos from creators will show up here.</p>
          </div>
        )}
      </div>
    </main>
  );
}
