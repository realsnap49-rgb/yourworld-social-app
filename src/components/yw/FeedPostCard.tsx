import { memo, useEffect, useRef, useState } from "react";
import {
  Heart, MessageCircle, Send, Bookmark, MoreHorizontal, Download,
  Link2, Trash2, EyeOff, Eye,
} from "lucide-react";
import { Link } from "@tanstack/react-router";
import { toast } from "sonner";
import { LazyImage } from "@/components/yw/LazyImage";
import { ShareSheet } from "@/components/yw/ShareSheet";
import { CommentsSheet } from "@/components/yw/CommentsSheet";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { resolveMediaUrl, timeAgo, type SocialPost } from "@/lib/social-data";
import { deletePost, registerPostView } from "@/lib/post-actions";
import { formatCount } from "@/lib/yw-data";
import { useYw } from "@/lib/yw-store";
import { downloadWithWatermark } from "@/lib/yw-download";
import { cn } from "@/lib/utils";
import { PremiumVideoPlayer } from "@/components/yw/PremiumVideoPlayer";

function FeedPostCardBase({
  post,
  currentUserId,
  onToggleLike,
  isSaved = false,
  onToggleSave,
  onDeleted,
}: {
  post: SocialPost;
  currentUserId: string | null;
  onToggleLike: (id: string) => void;
  isSaved?: boolean;
  onToggleSave?: (id: string) => void | Promise<unknown>;
  onDeleted?: (id: string) => void;
}) {
  const { following, toggleFollow } = useYw();
  const [src, setSrc] = useState<string>(post.media_url);
  const [hidden, setHidden] = useState(false);
  const [views, setViews] = useState(post.views ?? 0);
  const [commentCount, setCommentCount] = useState(post.commentCount);
  const cardRef = useRef<HTMLElement | null>(null);


  useEffect(() => {
    let alive = true;
    void resolveMediaUrl(post.media_url, "reels").then((u) => {
      if (alive) setSrc(u);
    });
    return () => {
      alive = false;
    };
  }, [post.media_url]);

  // Real view counting — once the card has actually been seen.
  useEffect(() => {
    const el = cardRef.current;
    if (!el || typeof IntersectionObserver === "undefined") return;
    const io = new IntersectionObserver(
      (entries) => {
        if (entries.some((e) => e.isIntersecting && e.intersectionRatio > 0.6)) {
          io.disconnect();
          void registerPostView(post.id)
            .then(() => setViews((v) => v + 1))
            .catch(() => {});
        }
      },
      { threshold: [0.6] },
    );
    io.observe(el);
    return () => io.disconnect();
  }, [post.id]);

  const isMine = currentUserId === post.user_id;
  const isFollowing = !!following[post.user_id];
  const isVideo = post.media_type === "video";
  const shareUrl =
    typeof window !== "undefined" ? `${window.location.origin}/?post=${post.id}` : undefined;

  const handleDownload = async () => {
    if (!post.allow_download) {
      toast("Downloads are off for this post");
      return;
    }
    try {
      if (isVideo) {
        const a = document.createElement("a");
        a.href = src;
        a.download = `yw-${post.id}.mp4`;
        a.click();
      } else {
        await downloadWithWatermark(src, post.author.username, `yw-${post.id}.jpg`);
      }
      toast.success("Saved to your device");
    } catch {
      toast.error("Couldn't save this post");
    }
  };

  const handleSave = async () => {
    if (!onToggleSave) return;
    try {
      await onToggleSave(post.id);
    } catch {
      toast.error("Couldn't update saved posts");
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
      await deletePost(post.id);
      setHidden(true);
      onDeleted?.(post.id);
      toast.success("Post deleted");
    } catch {
      toast.error("Couldn't delete this post");
    }
  };

  if (hidden) return null;

  return (
    <article
      ref={cardRef}
      className="space-y-3 overflow-hidden rounded-3xl border border-zinc-800/80 bg-[#141418] p-1.5 shadow-2xl"
    >
      <header className="flex items-center justify-between p-3">
        <Link
          to="/u/$userId"
          params={{ userId: post.user_id }}
          className="flex min-w-0 items-center gap-3 transition-opacity active:opacity-70"
        >
          <div
            className="grid h-9 w-9 shrink-0 place-items-center rounded-full border border-pink-500/80 text-base font-bold text-white"
            style={{ background: `hsl(${post.author.hue} 60% 40%)` }}
          >
            {(post.author.name || post.author.username).charAt(0).toUpperCase()}
          </div>
          <div className="flex min-w-0 flex-col">
            <span className="truncate text-sm font-bold leading-tight text-white">
              @{post.author.username}
            </span>
            {post.location && (
              <span className="truncate text-[10px] text-zinc-400">{post.location}</span>
            )}
          </div>
        </Link>
        <div className="flex items-center gap-1.5">
          {!isMine && (
            <button
              type="button"
              onClick={() => toggleFollow(post.user_id)}
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
                <Bookmark className="mr-2 h-4 w-4" /> {isSaved ? "Remove from saved" : "Save post"}
              </DropdownMenuItem>
              {post.allow_download && (
                <DropdownMenuItem onClick={handleDownload}>
                  <Download className="mr-2 h-4 w-4" /> Download
                </DropdownMenuItem>
              )}
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
                  <Trash2 className="mr-2 h-4 w-4" /> Delete post
                </DropdownMenuItem>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </header>

      {isVideo ? (
        <PremiumVideoPlayer
          src={src}
          title={post.caption || `@${post.author.username}`}
          portrait
          className="aspect-square"
        />
      ) : (
        <LazyImage
          src={src}
          alt={post.caption || "Post"}
          wrapperClassName="relative w-full aspect-square bg-zinc-900 rounded-2xl overflow-hidden"
          className="h-full w-full object-cover"
        />
      )}

      <div className="space-y-2 px-3 pb-3">
        <div className="flex items-center justify-between pt-1">
          <div className="flex items-center gap-4">
            <button
              onClick={() => onToggleLike(post.id)}
              aria-label="Like"
              className="transition-transform active:scale-75"
            >
              <Heart
                size={22}
                className={post.likedByMe ? "fill-pink-500 text-pink-500" : "text-zinc-300"}
              />
            </button>
            <CommentsSheet postId={post.id} onCountChange={setCommentCount}>
              <button aria-label="Comments" className="flex items-center gap-1 text-zinc-300 transition-transform active:scale-75">
                <MessageCircle size={22} />
                {commentCount > 0 && <span className="text-xs font-semibold">{formatCount(commentCount)}</span>}
              </button>
            </CommentsSheet>

            <ShareSheet title={post.caption} url={shareUrl} media={src} mediaKind={isVideo ? "video" : "photo"}>
              <button aria-label="Share" className="text-zinc-300 transition-transform active:scale-75">
                <Send size={20} />
              </button>
            </ShareSheet>
            {post.allow_download && (
              <button
                onClick={handleDownload}
                aria-label="Download"
                className="text-zinc-400 transition-transform active:scale-75 hover:text-white"
              >
                <Download size={20} />
              </button>
            )}
          </div>
          <button
            onClick={handleSave}
            aria-label="Save"
            className="text-zinc-300 transition-transform active:scale-75"
          >
            <Bookmark size={22} className={isSaved ? "fill-white text-white" : "text-zinc-300"} />
          </button>
        </div>

        <div className="flex items-center gap-3 text-xs font-bold text-white">
          <span>{formatCount(post.likeCount)} likes</span>
          <span className="flex items-center gap-1 font-medium text-zinc-400">
            <Eye size={13} /> {formatCount(views)}
          </span>
        </div>
        {post.caption && (
          <p className="text-xs leading-relaxed text-zinc-300">
            <span className="mr-1.5 font-bold text-white">@{post.author.username}</span>
            {post.caption}
          </p>
        )}
        {post.hashtags?.length > 0 && (
          <div className="flex flex-wrap gap-1.5">
            {post.hashtags.map((h) => (
              <span key={h} className="rounded-full bg-zinc-900 px-2.5 py-1 text-[11px] text-pink-400">
                #{h}
              </span>
            ))}
          </div>
        )}
        <div className="flex items-center gap-2 pt-0.5">
          <CommentsSheet postId={post.id} onCountChange={setCommentCount}>
            <button className="text-[11.5px] text-zinc-400 hover:text-white">
              {commentCount > 0 ? `View all ${commentCount} comments` : "Add a comment"}
            </button>
          </CommentsSheet>

          <span aria-hidden className="h-[3px] w-[3px] rounded-full bg-zinc-600" />
          <span className="text-[10px] uppercase tracking-widest text-zinc-500">
            {timeAgo(post.created_at)}
          </span>
        </div>
      </div>
    </article>
  );
}

export const FeedPostCard = memo(FeedPostCardBase);
