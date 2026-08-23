import { memo, useEffect, useState } from "react";
import {
  Heart, MessageCircle, Send, Bookmark, MoreHorizontal, Download,
} from "lucide-react";
import { toast } from "sonner";
import { LazyImage } from "@/components/yw/LazyImage";
import { ShareSheet } from "@/components/yw/ShareSheet";
import { CommentsSheet } from "@/components/yw/CommentsSheet";
import { resolveMediaUrl, timeAgo, type SocialPost } from "@/lib/social-data";
import { formatCount } from "@/lib/yw-data";
import { useYw } from "@/lib/yw-store";
import { downloadWithWatermark } from "@/lib/yw-download";
import { cn } from "@/lib/utils";

function FeedPostCardBase({
  post,
  currentUserId,
  onToggleLike,
  onCommentPosted,
}: {
  post: SocialPost;
  currentUserId: string | null;
  onToggleLike: (id: string) => void;
  onCommentPosted?: (id: string) => void;
}) {
  const { saved, following, toggleSave, toggleFollow } = useYw();
  const [src, setSrc] = useState<string>(post.media_url);

  useEffect(() => {
    let alive = true;
    void resolveMediaUrl(post.media_url, "reels").then((u) => {
      if (alive) setSrc(u);
    });
    return () => {
      alive = false;
    };
  }, [post.media_url]);

  const isSaved = !!saved[post.id];
  const isMine = currentUserId === post.user_id;
  const isFollowing = !!following[post.user_id];
  const isVideo = post.media_type === "video";

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

  return (
    <article className="space-y-3 overflow-hidden rounded-3xl border border-zinc-800/80 bg-[#141418] p-1.5 shadow-2xl">
      <header className="flex items-center justify-between p-3">
        <div className="flex min-w-0 items-center gap-3">
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
        </div>
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
          <button aria-label="More options" className="p-1 text-zinc-400 hover:text-white">
            <MoreHorizontal size={18} />
          </button>
        </div>
      </header>

      {isVideo ? (
        <video
          src={src}
          controls
          playsInline
          preload="metadata"
          className="aspect-square w-full rounded-2xl bg-black object-cover"
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
            <CommentsSheet postId={post.id}>
              <button
                aria-label="Comments"
                onClick={() => onCommentPosted?.(post.id)}
                className="text-zinc-300 transition-transform active:scale-75"
              >
                <MessageCircle size={22} />
              </button>
            </CommentsSheet>
            <ShareSheet title={post.caption}>
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
            onClick={() => toggleSave(post.id)}
            aria-label="Save"
            className="text-zinc-300 transition-transform active:scale-75"
          >
            <Bookmark size={22} className={isSaved ? "fill-white text-white" : "text-zinc-300"} />
          </button>
        </div>

        <div className="text-xs font-bold text-white">{formatCount(post.likeCount)} likes</div>
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
          <CommentsSheet postId={post.id}>
            <button className="text-[11.5px] text-zinc-400 hover:text-white">
              View all {post.commentCount} comments
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
