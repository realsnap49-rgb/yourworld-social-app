import React, { useEffect, useRef, useState } from "react";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import {
  ArrowLeft, Eye, Heart, MessageCircle, Send, Bookmark, Download, Clock,
} from "lucide-react";
import { toast } from "sonner";
import {
  formatDuration, formatViews, timeAgo, useLongVideos, type LongVideo,
} from "@/lib/video-data";
import { resolveMediaUrl } from "@/lib/social-data";
import { usePostSaves } from "@/lib/post-actions";
import { useYw } from "@/lib/yw-store";
import { formatCount } from "@/lib/yw-data";
import { cn } from "@/lib/utils";
import { PremiumVideoPlayer } from "@/components/yw/PremiumVideoPlayer";
import { CommentsSheet } from "@/components/yw/CommentsSheet";
import { ShareSheet } from "@/components/yw/ShareSheet";

export const Route = createFileRoute("/video/$videoId")({
  head: () => ({
    meta: [
      { title: "YourWorld — Watch" },
      { name: "description", content: "Watch long-form videos on YourWorld with a sticky premium player, comments and recommendations." },
      { property: "og:title", content: "YourWorld — Watch" },
      { property: "og:description", content: "Watch long-form videos on YourWorld." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: WatchPage,
});

function WatchPage() {
  const { videoId } = Route.useParams();
  const navigate = useNavigate();
  const { videos, loading, currentUserId, countView, toggleLike } = useLongVideos();
  const { saved, toggleSave } = usePostSaves();
  const { following, toggleFollow } = useYw();

  const video = videos.find((v) => v.id === videoId) ?? null;
  const recommended = videos.filter((v) => v.id !== videoId);

  const [src, setSrc] = useState<string | null>(null);
  const [commentCount, setCommentCount] = useState(video?.commentCount ?? 0);
  const [liking, setLiking] = useState(false);
  const counted = useRef(false);

  // Resolve a playable signed URL for the video.
  useEffect(() => {
    if (!video) return;
    let alive = true;
    void resolveMediaUrl(video.mediaUrl, "reels").then((u) => alive && setSrc(u));
    return () => { alive = false; };
  }, [video]);

  // Count one view on first load.
  useEffect(() => {
    if (video && !counted.current) {
      counted.current = true;
      void countView(video.id);
    }
  }, [video, countView]);

  // Keep comment count in sync when the resolved video changes.
  useEffect(() => {
    if (video) setCommentCount(video.commentCount);
  }, [video]);

  if (loading && !video) {
    return (
      <div className="min-h-screen bg-black text-white">
        <BackBar onBack={() => navigate({ to: "/" })} />
        <div className="py-20 text-center text-sm text-neutral-500">Loading video…</div>
      </div>
    );
  }

  if (!video) {
    return (
      <div className="min-h-screen bg-black text-white">
        <BackBar onBack={() => navigate({ to: "/" })} />
        <div className="py-20 text-center text-sm text-neutral-500">
          Video not found.{" "}
          <Link to="/" className="text-pink-400 underline">Back to feed</Link>
        </div>
      </div>
    );
  }

  const isMine = currentUserId === video.userId;
  const isFollowing = !!following[video.userId];
  const isSaved = !!saved[video.id];
  const portrait = video.orientation === "portrait";
  const shareUrl =
    typeof window !== "undefined" ? `${window.location.origin}/video/${video.id}` : undefined;

  const handleLike = async () => {
    if (!currentUserId) { toast.error("Sign in to like videos"); return; }
    if (liking) return;
    setLiking(true);
    try { await toggleLike(video.id); } catch { toast.error("Couldn't update like"); }
    finally { setLiking(false); }
  };

  const handleSave = async () => {
    if (!currentUserId) { toast.error("Sign in to save videos"); return; }
    try {
      const savedNow = await toggleSave(video.id);
      toast.success(savedNow === false ? "Removed from saved" : "Video saved");
    } catch { toast.error("Couldn't update saved videos"); }
  };

  const handleDownload = async () => {
    const toastId = toast.loading("Preparing download…");
    try {
      const url = src ?? (await resolveMediaUrl(video.mediaUrl, "reels"));
      const response = await fetch(url);
      if (!response.ok) throw new Error("Download failed");
      const blobUrl = URL.createObjectURL(await response.blob());
      const a = document.createElement("a");
      a.href = blobUrl;
      a.download = `yw-${video.id}.mp4`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.setTimeout(() => URL.revokeObjectURL(blobUrl), 1_000);
      toast.success("Saved to your device", { id: toastId });
    } catch { toast.error("Couldn't save this video", { id: toastId }); }
  };

  const upcoming = !!video.scheduledAt && new Date(video.scheduledAt).getTime() > Date.now();

  return (
    <div className="min-h-screen bg-black text-white">
      <div className="mx-auto max-w-lg">
        {/* === STICKY TOP VIDEO PLAYER === */}
        <div className="sticky top-0 z-50 w-full bg-black shadow-lg">
          <BackBar onBack={() => navigate({ to: "/" })} transparent />
          <div className={cn("w-full bg-black", portrait && "flex justify-center")}>
            <div className={cn("w-full overflow-hidden bg-black", portrait && "max-w-[33vh]")}>
              {src ? (
                <PremiumVideoPlayer
                  key={video.id}
                  src={src}
                  title={video.title}
                  poster={video.thumbnailUrl}
                  portrait={portrait}
                  autoPlay
                  className="rounded-none"
                />
              ) : (
                <div className={cn("w-full bg-black", portrait ? "aspect-[9/16]" : "aspect-video")}>
                  {video.thumbnailUrl ? (
                    <img src={video.thumbnailUrl} alt={video.title} className="h-full w-full object-cover" />
                  ) : (
                    <div className="h-full w-full animate-pulse bg-zinc-900" />
                  )}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* === INDEPENDENT SCROLLABLE BELOW SECTION === */}
        <div className="overflow-y-auto px-3 pb-24 pt-3">
          {/* Title + duration */}
          <h1 className="text-base font-bold leading-snug text-white">{video.title}</h1>
          <div className="mt-1 flex items-center gap-2 text-[12px] text-zinc-400">
            <span className="inline-flex items-center gap-1"><Eye size={13} /> {formatViews(video.views)}</span>
            <span>·</span>
            <span>{timeAgo(video.createdAt)}</span>
            {video.durationSeconds ? (
              <>
                <span>·</span>
                <span className="inline-flex items-center gap-1"><Clock size={12} /> {formatDuration(video.durationSeconds)}</span>
              </>
            ) : null}
          </div>

          {/* Action bar */}
          <div className="mt-3 flex items-center justify-between rounded-xl bg-zinc-900/70 px-3 py-2">
            <div className="flex items-center gap-4">
              <button
                onClick={handleLike}
                disabled={liking}
                aria-label="Like"
                className="flex items-center gap-1 text-xs text-zinc-200 transition-transform active:scale-90 disabled:opacity-60"
              >
                <Heart size={20} className={video.likedByMe ? "fill-pink-500 text-pink-500" : "text-zinc-200"} />
                {video.likeCount > 0 && <span className="font-semibold">{formatCount(video.likeCount)}</span>}
              </button>

              <CommentsSheet postId={video.id} onCountChange={setCommentCount}>
                <button aria-label="Comments" className="flex items-center gap-1 text-xs text-zinc-200 transition-transform active:scale-90">
                  <MessageCircle size={20} />
                  {commentCount > 0 && <span className="font-semibold">{formatCount(commentCount)}</span>}
                </button>
              </CommentsSheet>

              <ShareSheet title={video.title} url={shareUrl} media={src ?? undefined} mediaKind="video">
                <button aria-label="Share" className="text-zinc-200 transition-transform active:scale-90">
                  <Send size={18} />
                </button>
              </ShareSheet>

              <button onClick={handleDownload} aria-label="Download" className="text-zinc-300 transition-transform hover:text-white active:scale-90">
                <Download size={18} />
              </button>
            </div>

            <button onClick={handleSave} aria-label="Save" className="text-zinc-200 transition-transform active:scale-90">
              <Bookmark size={20} className={isSaved ? "fill-white text-white" : "text-zinc-200"} />
            </button>
          </div>

          {/* Channel / author row */}
          <Link
            to="/u/$userId"
            params={{ userId: video.userId }}
            className="mt-3 flex items-center gap-2 rounded-xl bg-zinc-900/70 px-3 py-2 transition-colors active:bg-zinc-800"
          >
            <span className="grid h-9 w-9 place-items-center rounded-full bg-[#8b2fc9] text-sm font-bold text-white">
              {video.author.letter}
            </span>
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-semibold text-white">@{video.author.username}</p>
              <p className="truncate text-[11px] text-zinc-400">{video.author.name}</p>
            </div>
            {!isMine && (
              <button
                type="button"
                onClick={(e) => { e.preventDefault(); toggleFollow(video.userId); }}
                className={cn(
                  "rounded-full px-3 py-1 text-[11px] font-semibold transition-all active:scale-95",
                  isFollowing ? "bg-zinc-800 text-white" : "bg-pink-500 text-white",
                )}
              >
                {isFollowing ? "Following" : "Follow"}
              </button>
            )}
          </Link>

          {upcoming && (
            <p className="mt-3 inline-flex items-center gap-1 rounded-full bg-amber-500/15 px-2 py-1 text-[11px] font-semibold text-amber-400">
              <Clock size={12} /> Scheduled for {new Date(video.scheduledAt as string).toLocaleString()}
            </p>
          )}

          {/* Caption + tags */}
          {video.caption && (
            <p className="mt-3 whitespace-pre-line text-xs leading-relaxed text-zinc-300">{video.caption}</p>
          )}
          {video.hashtags.length > 0 && (
            <div className="mt-2 flex flex-wrap gap-1.5">
              {video.hashtags.map((t) => (
                <span key={t} className="rounded-full bg-zinc-900 px-2 py-0.5 text-[10px] text-zinc-400">{t}</span>
              ))}
            </div>
          )}

          {/* Comments header */}
          <div className="mt-5">
            <CommentsSheet postId={video.id} onCountChange={setCommentCount}>
              <button className="flex w-full items-center justify-between border-b border-zinc-800 pb-2 text-sm font-semibold text-white">
                <span>{commentCount} {commentCount === 1 ? "Comment" : "Comments"}</span>
                <span className="text-[11px] font-normal text-pink-400">View all</span>
              </button>
            </CommentsSheet>
            <p className="py-3 text-center text-xs text-neutral-600">Tap above to open comments</p>
          </div>

          {/* Recommended videos */}
          <div className="mt-5 px-4">
            <h2 className="mb-3 text-sm font-semibold text-zinc-300">Recommended</h2>
            <div className="space-y-4">
              {recommended.map((r) => (
                <RecommendedRow key={r.id} video={r} />
              ))}
              {recommended.length === 0 && (
                <p className="py-6 text-center text-xs text-neutral-600">No more videos yet.</p>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function RecommendedRow({ video }: { video: LongVideo }) {
  return (
    <Link
      to="/video/$videoId"
      params={{ videoId: video.id }}
      className="block overflow-hidden rounded-xl bg-zinc-900/60 transition-colors active:bg-zinc-800"
    >
      {/* Full-width 16:9 thumbnail */}
      <div className="relative aspect-video w-full overflow-hidden bg-zinc-900">
        <VideoPoster thumbnailUrl={video.thumbnailUrl} mediaUrl={video.mediaUrl} alt={video.title} />
        {video.durationSeconds ? (
          <span className="absolute bottom-1.5 right-1.5 rounded bg-black/80 px-1.5 py-0.5 text-[10px] font-semibold text-white">
            {formatDuration(video.durationSeconds)}
          </span>
        ) : null}
      </div>
      {/* Metadata below thumbnail */}
      <div className="px-3 py-2.5">
        <p className="line-clamp-2 text-sm font-semibold leading-snug text-white">{video.title}</p>
        <p className="mt-1 text-[11px] text-zinc-400">@{video.author.username}</p>
        <p className="text-[11px] text-zinc-500">{formatViews(video.views)} · {timeAgo(video.createdAt)}</p>
      </div>
    </Link>
  );
}

function BackBar({ onBack, transparent }: { onBack: () => void; transparent?: boolean }) {
  return (
    <div className={cn("flex items-center px-2 py-2", transparent ? "absolute left-0 right-0 top-0 z-[60]" : "border-b border-zinc-900 bg-black")}>
      <button
        onClick={onBack}
        aria-label="Back"
        className={cn(
          "grid h-9 w-9 place-items-center rounded-full transition-colors",
          transparent ? "bg-black/50 text-white backdrop-blur hover:bg-black/70" : "text-white hover:bg-zinc-900",
        )}
      >
        <ArrowLeft size={20} />
      </button>
    </div>
  );
}
