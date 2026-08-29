import React, { useEffect, useRef, useState } from "react";
import {
  Play, Eye, Heart, Clock, MessageCircle, Send, Bookmark,
  Download, MoreHorizontal, Link2, Trash2, EyeOff,
} from "lucide-react";
import { Link, useNavigate } from "@tanstack/react-router";
import { toast } from "sonner";
import { formatDuration, formatViews, timeAgo, type LongVideo } from "@/lib/video-data";
import { resolveMediaUrl } from "@/lib/social-data";
import { deletePost } from "@/lib/post-actions";
import { PremiumVideoPlayer } from "@/components/yw/PremiumVideoPlayer";
import { CommentsSheet } from "@/components/yw/CommentsSheet";
import { ShareSheet } from "@/components/yw/ShareSheet";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { formatCount } from "@/lib/yw-data";
import { useYw } from "@/lib/yw-store";
import { cn } from "@/lib/utils";
import { onStopRequested, releasePlayback, requestPlayback } from "@/lib/video-playback";
import { getAdjacentVideo, warmVideo, type QueueItem } from "@/lib/video-queue";

type Props = {
  video: LongVideo;
  onView: (id: string) => void;
  onLike: (id: string) => void;
  currentUserId?: string | null;
  isSaved?: boolean;
  onToggleSave?: (id: string) => void | Promise<unknown>;
  onDeleted?: (id: string) => void;
};

/** Feed card for long-form videos — supports 16:9 and 9:16 playback. */
export function LongVideoCard({
  video,
  onView,
  onLike,
  currentUserId = null,
  isSaved = false,
  onToggleSave,
  onDeleted,
}: Props) {
  const { following, toggleFollow } = useYw();
  const [playing, setPlaying] = useState(false);
  const [src, setSrc] = useState<string | null>(null);
  const [hidden, setHidden] = useState(false);
  const [commentCount, setCommentCount] = useState(video.commentCount);
  const [liking, setLiking] = useState(false);
  const [playerPortrait, setPlayerPortrait] = useState(video.orientation === "portrait");
  const [active, setActive] = useState<QueueItem>({
    id: video.id,
    title: video.title,
    mediaUrl: video.mediaUrl,
    thumbnailUrl: video.thumbnailUrl,
    portrait: video.orientation === "portrait",
  });
  const urlCache = useRef(new Map<string, string>());
  const counted = useRef(false);
  const cardRef = useRef<HTMLElement | null>(null);
  const playingRef = useRef(false);

  /** Resolve + warm a media URL once, so a click plays instantly. */
  const prefetch = React.useCallback(async (mediaUrl: string) => {
    const cached = urlCache.current.get(mediaUrl);
    if (cached) return cached;
    const url = await resolveMediaUrl(mediaUrl, "reels");
    urlCache.current.set(mediaUrl, url);
    warmVideo(url);
    return url;
  }, []);

  const start = async () => {
    requestPlayback(video.id); // stops any other playing video
    playingRef.current = true;
    const ready = urlCache.current.get(active.mediaUrl);
    if (ready) {
      setSrc(ready); // instant: no await on the click path
      setPlaying(true);
    }
    const url = ready ?? (await prefetch(active.mediaUrl));
    if (!playingRef.current) return; // stopped while resolving
    setSrc(url);
    setPlaying(true);
    if (!counted.current) {
      counted.current = true;
      onView(video.id);
    }
  };

  /** Fullscreen swipe → next/previous video with the SAME orientation. */
  const swipeQueue = async (dir: 1 | -1, portraitMode: boolean) => {
    const next = getAdjacentVideo(active.id, portraitMode, dir);
    if (!next) return;
    const url = await prefetch(next.mediaUrl);
    setActive(next);
    setPlayerPortrait(next.portrait);
    setSrc(url);
    setPlaying(true);
    const after = getAdjacentVideo(next.id, portraitMode, dir);
    if (after) void prefetch(after.mediaUrl);
  };
  const startRef = useRef(start);
  startRef.current = start;

  // Another card started playing → stop this one.
  useEffect(() => onStopRequested(video.id, () => {
    playingRef.current = false;
    setPlaying(false);
  }), [video.id]);

  // Pre-buffer this card's stream well before it reaches the viewport.
  useEffect(() => {
    const el = cardRef.current;
    if (!el) return;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          void prefetch(video.mediaUrl);
          observer.disconnect();
        }
      },
      { rootMargin: "800px 0px" },
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, [prefetch, video.mediaUrl]);

  // Scroll behavior: auto-start when centered (>=60% visible), stop when scrolled away.
  useEffect(() => {
    const el = cardRef.current;
    if (!el) return;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.intersectionRatio >= 0.6) {
          if (!playingRef.current) void startRef.current();
        } else if (entry.intersectionRatio < 0.35 && playingRef.current) {
          playingRef.current = false;
          setPlaying(false);
          releasePlayback(video.id);
        }
      },
      { threshold: [0, 0.35, 0.6, 1] },
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, [video.id]);

  const isMine = currentUserId === video.userId;
  const isFollowing = !!following[video.userId];
  const shareUrl =
    typeof window !== "undefined" ? `${window.location.origin}/?post=${video.id}` : undefined;

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
    } catch {
      toast.error("Couldn't save this video", { id: toastId });
    }
  };

  const handleSave = async () => {
    if (!onToggleSave) return;
    if (!currentUserId) {
      toast.error("Sign in to save videos");
      return;
    }
    try {
      const savedNow = await onToggleSave(video.id);
      toast.success(savedNow === false ? "Removed from saved" : "Video saved");
    } catch {
      toast.error("Couldn't update saved videos");
    }
  };

  const handleLike = async () => {
    if (!currentUserId) {
      toast.error("Sign in to like videos");
      return;
    }
    if (liking) return;
    setLiking(true);
    try {
      await onLike(video.id);
    } catch {
      toast.error("Couldn't update like");
    } finally {
      setLiking(false);
    }
  };

  const copyLink = async () => {
    try {
      await navigator.clipboard.writeText(shareUrl ?? "");
      toast.success("Link copied");
    } catch {
      toast.error("Could not copy link");
    }
  };

  const handleDelete = async () => {
    try {
      await deletePost(video.id);
      setHidden(true);
      onDeleted?.(video.id);
      toast.success("Video deleted");
    } catch {
      toast.error("Couldn't delete this video");
    }
  };

  const upcoming =
    !!video.scheduledAt && new Date(video.scheduledAt).getTime() > Date.now();

  if (hidden) return null;

  return (
    <article
      ref={cardRef}
      className="space-y-3 overflow-hidden border-y border-zinc-800/80 bg-[#141418] shadow-2xl"
    >
      <div
        className={`relative w-full overflow-hidden bg-black ${
          playerPortrait ? "aspect-[9/16]" : "aspect-video"
        }`}
      >
        {playing && src ? (
          <PremiumVideoPlayer
            key={active.id}
            src={src}
            title={active.title}
            poster={active.thumbnailUrl}
            portrait={active.portrait}
            onOrientationChange={setPlayerPortrait}
            onSwipeQueue={swipeQueue}
            autoPlay
            className="rounded-none"
          />
        ) : (
          <button
            onClick={start}
            aria-label={`Play ${video.title}`}
            className="group relative h-full w-full"
          >
            {video.thumbnailUrl ? (
              <img
                src={video.thumbnailUrl}
                alt={video.title}
                loading="lazy"
                className="h-full w-full object-cover"
              />
            ) : (
              <div className="h-full w-full bg-gradient-to-br from-zinc-800 to-zinc-900" />
            )}
            <span className="absolute inset-0 grid place-items-center bg-black/25">
              <span className="grid h-14 w-14 place-items-center rounded-full bg-white/90 text-black transition-transform group-active:scale-90">
                <Play size={22} className="ml-0.5 fill-black" />
              </span>
            </span>
            <span className="absolute bottom-2 right-2 rounded-md bg-black/80 px-1.5 py-0.5 text-[11px] font-semibold">
              {formatDuration(video.durationSeconds)}
            </span>
          </button>
        )}
      </div>

      <div className="space-y-2 px-3 pb-3">
        <div className="flex items-start justify-between gap-2">
          <h3 className="text-sm font-bold leading-snug text-white">{video.title}</h3>
          <div className="flex shrink-0 items-center gap-1.5">
            {!isMine && (
              <button
                type="button"
                onClick={() => toggleFollow(video.userId)}
                className={cn(
                  "rounded-full px-3 py-1 text-[11px] font-semibold transition-all active:scale-95",
                  isFollowing ? "bg-zinc-800 text-white" : "bg-pink-500 text-white",
                )}
              >
                {isFollowing ? "Following" : "Follow"}
              </button>
            )}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button aria-label="More options" className="p-1 text-zinc-400 hover:text-white">
                  <MoreHorizontal size={18} />
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-52">
                <DropdownMenuItem onClick={copyLink}>
                  <Link2 className="mr-2 h-4 w-4" /> Copy link
                </DropdownMenuItem>
                <DropdownMenuItem onClick={handleSave}>
                  <Bookmark className="mr-2 h-4 w-4" />{" "}
                  {isSaved ? "Remove from saved" : "Save video"}
                </DropdownMenuItem>
                <DropdownMenuItem onClick={handleDownload}>
                  <Download className="mr-2 h-4 w-4" /> Download
                </DropdownMenuItem>
                {!isMine && (
                  <DropdownMenuItem onClick={() => setHidden(true)}>
                    <EyeOff className="mr-2 h-4 w-4" /> Not interested
                  </DropdownMenuItem>
                )}
                {isMine && (
                  <DropdownMenuItem
                    onClick={handleDelete}
                    className="text-destructive focus:text-destructive"
                  >
                    <Trash2 className="mr-2 h-4 w-4" /> Delete video
                  </DropdownMenuItem>
                )}
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>

        <div className="flex items-center gap-2 text-[11px] text-zinc-400">
          <Link
            to="/u/$userId"
            params={{ userId: video.userId }}
            className="flex items-center gap-2 transition-opacity active:opacity-70"
          >
            <span className="grid h-6 w-6 place-items-center rounded-full bg-[#8b2fc9] text-[11px] font-bold text-white">
              {video.author.letter}
            </span>
            <span className="font-semibold text-zinc-200">@{video.author.username}</span>
          </Link>
          <span>·</span>
          <span className="inline-flex items-center gap-1">
            <Eye size={12} /> {formatViews(video.views)}
          </span>
          <span>·</span>
          <span>{timeAgo(video.createdAt)}</span>
        </div>

        {upcoming && (
          <p className="inline-flex items-center gap-1 rounded-full bg-amber-500/15 px-2 py-1 text-[11px] font-semibold text-amber-400">
            <Clock size={12} /> Scheduled for{" "}
            {new Date(video.scheduledAt as string).toLocaleString()}
          </p>
        )}

        {video.caption && (
          <p className="line-clamp-2 text-xs leading-relaxed text-zinc-300">{video.caption}</p>
        )}

        {video.hashtags.length > 0 && (
          <div className="flex flex-wrap gap-1.5">
            {video.hashtags.map((t) => (
              <span key={t} className="rounded-full bg-zinc-900 px-2 py-0.5 text-[10px] text-zinc-400">
                {t}
              </span>
            ))}
          </div>
        )}

        <div className="flex items-center justify-between pt-1">
          <div className="flex items-center gap-4">
            <button
                onClick={handleLike}
              aria-label="Like"
                disabled={liking}
                className="flex items-center gap-1 text-xs text-zinc-300 transition-transform active:scale-75 disabled:opacity-60"
            >
              <Heart
                size={20}
                className={video.likedByMe ? "fill-pink-500 text-pink-500" : "text-zinc-300"}
              />
              {video.likeCount > 0 && (
                <span className="font-semibold">{formatCount(video.likeCount)}</span>
              )}
            </button>

            <CommentsSheet postId={video.id} onCountChange={setCommentCount}>
              <button
                aria-label="Comments"
                className="flex items-center gap-1 text-xs text-zinc-300 transition-transform active:scale-75"
              >
                <MessageCircle size={20} />
                {commentCount > 0 && (
                  <span className="font-semibold">{formatCount(commentCount)}</span>
                )}
              </button>
            </CommentsSheet>

            <ShareSheet title={video.title} url={shareUrl} media={src ?? undefined} mediaKind="video">
              <button aria-label="Share" className="text-zinc-300 transition-transform active:scale-75">
                <Send size={18} />
              </button>
            </ShareSheet>

            <button
              onClick={handleDownload}
              aria-label="Download"
              className="text-zinc-400 transition-transform hover:text-white active:scale-75"
            >
              <Download size={18} />
            </button>
          </div>

          <button
            onClick={handleSave}
            aria-label="Save"
            className="text-zinc-300 transition-transform active:scale-75"
          >
            <Bookmark size={20} className={isSaved ? "fill-white text-white" : "text-zinc-300"} />
          </button>
        </div>
      </div>
    </article>
  );
}
