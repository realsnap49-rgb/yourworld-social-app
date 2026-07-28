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
    <article className="surface-card overflow-hidden rounded-[26px]">
      <header className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-3 px-3.5 py-3">
        <div className="flex min-w-0 items-center gap-3">
          <span className="ring-live grid h-10 w-10 shrink-0 place-items-center rounded-full p-[1.5px]">
            <span className="grid h-full w-full place-items-center rounded-full bg-background p-[1.5px]">
              <YwAvatar user={user} size={34} />
            </span>
          </span>
          <div className="min-w-0">
            <p className="truncate font-ui text-[13.5px] font-semibold tracking-[-0.01em]">
              @{user.username}
            </p>
            {post.location && (
              <p className="truncate text-[11px] tracking-[0.01em] text-muted-foreground">
                {post.location}
              </p>
            )}
          </div>
        </div>
        <button
          aria-label="More options"
          className="grid h-8 w-8 place-items-center rounded-full text-muted-foreground transition-colors duration-200 hover:bg-foreground/8 hover:text-foreground active:scale-90"
        >
          <MoreHorizontal className="h-[18px] w-[18px]" strokeWidth={1.8} />
        </button>
      </header>

      <div
        onDoubleClick={onDoubleTap}
        className="relative mx-2.5 overflow-hidden rounded-[20px] bg-secondary select-none"
      >
        <img
          src={post.image}
          alt={post.caption}
          loading="lazy"
          className="aspect-square w-full object-cover transition-transform duration-700 ease-out"
        />
        <span
          aria-hidden
          className="pointer-events-none absolute inset-0 rounded-[20px] ring-1 ring-inset ring-foreground/8"
        />
        {burst && (
          <Heart className="pointer-events-none absolute left-1/2 top-1/2 h-24 w-24 -translate-x-1/2 -translate-y-1/2 animate-burst fill-primary text-primary" />
        )}
      </div>

      <div className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-3 px-3.5 pt-3.5">
        <div className="flex min-w-0 items-center gap-1">
          <button
            onClick={() => toggleLike(post.id)}
            aria-label="Like"
            className={cn(
              "grid h-9 w-9 place-items-center rounded-full transition-all duration-200 hover:bg-foreground/8 active:scale-90",
              isLiked && "animate-pop",
            )}
          >
            <Heart
              className={cn(
                "h-[22px] w-[22px]",
                isLiked ? "fill-primary text-primary" : "text-foreground",
              )}
              strokeWidth={1.8}
            />
          </button>
          <CommentsSheet comments={post.comments}>
            <button
              aria-label="Comment"
              className="grid h-9 w-9 place-items-center rounded-full transition-all duration-200 hover:bg-foreground/8 active:scale-90"
            >
              <MessageCircle className="h-[22px] w-[22px]" strokeWidth={1.8} />
            </button>
          </CommentsSheet>
          <ShareSheet title={post.caption}>
            <button
              aria-label="Share"
              className="grid h-9 w-9 place-items-center rounded-full transition-all duration-200 hover:bg-foreground/8 active:scale-90"
            >
              <Send className="h-[22px] w-[22px]" strokeWidth={1.8} />
            </button>
          </ShareSheet>
          {post.allowDownload && (
            <button
              onClick={handleDownload}
              aria-label="Download"
              className="grid h-9 w-9 place-items-center rounded-full text-muted-foreground transition-all duration-200 hover:bg-foreground/8 hover:text-foreground active:scale-90"
            >
              <Download className="h-[22px] w-[22px]" strokeWidth={1.8} />
            </button>
          )}
        </div>
        <button
          onClick={() => toggleSave(post.id)}
          aria-label="Save"
          className={cn(
            "grid h-9 w-9 place-items-center rounded-full transition-all duration-200 hover:bg-foreground/8 active:scale-90",
            isSaved && "animate-pop",
          )}
        >
          <Bookmark
            className={cn("h-[22px] w-[22px]", isSaved && "fill-foreground")}
            strokeWidth={1.8}
          />
        </button>
      </div>

      <div className="space-y-1.5 px-3.5 pb-4 pt-2">
        <p className="font-ui text-[13px] font-semibold tracking-[-0.01em]">
          {formatCount(post.likes + (isLiked ? 1 : 0))} likes
        </p>
        <p className="text-[13.5px] leading-relaxed text-foreground/90">
          <span className="font-semibold">@{user.username}</span> {post.caption}
        </p>
        <p className="text-[13px] text-accent/90">{post.hashtags.map((h) => `#${h}`).join(" ")}</p>
        <CommentsSheet comments={post.comments}>
          <button className="text-xs text-muted-foreground transition-colors hover:text-foreground">
            View all {post.comments.length} comments
          </button>
        </CommentsSheet>
        <p className="text-[10px] uppercase tracking-[0.14em] text-muted-foreground/70">
          {post.time} ago
        </p>
      </div>
    </article>
  );
}