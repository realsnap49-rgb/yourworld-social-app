import { Heart, MessageCircle, Send, Bookmark, MoreHorizontal, Download } from "lucide-react";
import { YwAvatar } from "@/components/yw/Avatar";
import { ShareSheet } from "@/components/yw/ShareSheet";
import { CommentsSheet } from "@/components/yw/CommentsSheet";
import { byId, formatCount, type Post } from "@/lib/yw-data";
import { useDoubleTapLike, useYw } from "@/lib/yw-store";
import { downloadWithWatermark } from "@/lib/yw-download";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

export function PostCard({ post }: { post: Post }) {
  const user = byId(post.userId);
  const { liked, saved, toggleLike, toggleSave } = useYw();
  const { burst, onDoubleTap } = useDoubleTapLike(post.id);
  const isLiked = !!liked[post.id];
  const isSaved = !!saved[post.id];

  const handleDownload = async () => {
    if (!post.allowDownload) {
      toast("Downloads are off for this post");
      return;
    }
    try {
      await downloadWithWatermark(post.image, user.username, `yw-${post.id}.jpg`);
      toast.success("Saved with YW watermark");
    } catch {
      toast.error("Couldn't save this post");
    }
  };

  return (
    <article className="pb-6">
      <header className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-3 px-4 py-2.5">
        <div className="flex min-w-0 items-center gap-3">
          <span className="grid h-11 w-11 shrink-0 place-items-center rounded-full p-[2px] ring-story">
            <span className="grid h-full w-full place-items-center rounded-full bg-background p-[1.5px]">
              <YwAvatar user={user} size={36} />
            </span>
          </span>
          <div className="min-w-0">
            <p className="truncate text-sm font-semibold">@{user.username}</p>
            {post.location && (
              <p className="truncate text-xs text-muted-foreground">{post.location}</p>
            )}
          </div>
        </div>
        <button aria-label="More options" className="p-1 text-muted-foreground">
          <MoreHorizontal className="h-5 w-5" />
        </button>
      </header>

      <div
        onDoubleClick={onDoubleTap}
        className="relative overflow-hidden bg-secondary select-none sm:rounded-2xl"
      >
        <img
          src={post.image}
          alt={post.caption}
          loading="lazy"
          className="aspect-square w-full object-cover"
        />
        {burst && (
          <Heart className="pointer-events-none absolute left-1/2 top-1/2 h-24 w-24 -translate-x-1/2 -translate-y-1/2 animate-burst fill-primary text-primary" />
        )}
      </div>

      <div className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-3 px-4 pt-3">
        <div className="flex min-w-0 items-center gap-4">
          <button
            onClick={() => toggleLike(post.id)}
            aria-label="Like"
            className={cn("transition-transform active:scale-90", isLiked && "animate-pop")}
          >
            <Heart
              className={cn("h-6 w-6", isLiked ? "fill-primary text-primary" : "text-foreground")}
            />
          </button>
          <CommentsSheet comments={post.comments}>
            <button aria-label="Comment" className="transition-transform active:scale-90">
              <MessageCircle className="h-6 w-6" />
            </button>
          </CommentsSheet>
          <ShareSheet title={post.caption}>
            <button aria-label="Share" className="transition-transform active:scale-90">
              <Send className="h-6 w-6" />
            </button>
          </ShareSheet>
          {post.allowDownload && (
            <button
              onClick={handleDownload}
              aria-label="Download"
              className="text-muted-foreground transition-transform active:scale-90"
            >
              <Download className="h-6 w-6" />
            </button>
          )}
        </div>
        <button
          onClick={() => toggleSave(post.id)}
          aria-label="Save"
          className={cn("transition-transform active:scale-90", isSaved && "animate-pop")}
        >
          <Bookmark className={cn("h-6 w-6", isSaved && "fill-foreground")} />
        </button>
      </div>

      <div className="space-y-1 px-4 pt-2">
        <p className="text-sm font-semibold">
          {formatCount(post.likes + (isLiked ? 1 : 0))} likes
        </p>
        <p className="text-sm">
          <span className="font-semibold">@{user.username}</span> {post.caption}
        </p>
        <p className="text-sm text-accent">{post.hashtags.map((h) => `#${h}`).join(" ")}</p>
        <CommentsSheet comments={post.comments}>
          <button className="text-xs text-muted-foreground">
            View all {post.comments.length} comments
          </button>
        </CommentsSheet>
        <p className="text-[11px] uppercase tracking-wide text-muted-foreground">{post.time} ago</p>
      </div>
    </article>
  );
}