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
    <article className="surface-card overflow-hidden rounded-[28px]">
      <header className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-3 px-4 pb-3 pt-3.5">
        <div className="flex min-w-0 items-center gap-3">
          <span className="ring-live grid h-[38px] w-[38px] shrink-0 place-items-center rounded-full p-[1.5px]">
            <span className="grid h-full w-full place-items-center rounded-full bg-background p-[1.5px]">
              <YwAvatar user={user} size={32} />
            </span>
          </span>
          <div className="min-w-0">
            <p className="truncate font-ui text-[13.5px] font-semibold leading-tight tracking-[-0.015em]">
              @{user.username}
            </p>
            {post.location && (
              <p className="mt-0.5 truncate font-ui text-[10.5px] tracking-[0.02em] text-muted-foreground/85">
                {post.location}
              </p>
            )}
          </div>
        </div>
        <button
          aria-label="More options"
          className="action-btn grid h-8 w-8 place-items-center rounded-full text-muted-foreground"
        >
          <MoreHorizontal className="h-[18px] w-[18px]" strokeWidth={1.7} />
        </button>
      </header>

      <div
        onDoubleClick={onDoubleTap}
        className="media-frame mx-2 rounded-[22px] select-none"
      >
        <img
          src={post.image}
          alt={post.caption}
          loading="lazy"
          className="aspect-square w-full object-cover transition-transform duration-[900ms] ease-out"
        />
        <span
          aria-hidden
          className="pointer-events-none absolute inset-x-0 bottom-0 h-24 bg-gradient-to-t from-background/45 to-transparent"
        />
        {burst && (
          <Heart className="pointer-events-none absolute left-1/2 top-1/2 h-24 w-24 -translate-x-1/2 -translate-y-1/2 animate-burst fill-primary text-primary" />
        )}
      </div>

      <div className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-3 px-3 pt-3">
        <div className="flex min-w-0 items-center gap-0.5">
          <button
            onClick={() => toggleLike(post.id)}
            aria-label="Like"
            className={cn(
              "action-btn grid h-10 w-10 place-items-center rounded-full",
              isLiked && "animate-pop",
            )}
          >
            <Heart
              className={cn(
                "h-[21px] w-[21px] transition-colors duration-300",
                isLiked ? "fill-primary text-primary" : "text-foreground",
              )}
              strokeWidth={1.7}
            />
          </button>
          <CommentsSheet comments={post.comments}>
            <button
              aria-label="Comment"
              className="action-btn grid h-10 w-10 place-items-center rounded-full"
            >
              <MessageCircle className="h-[21px] w-[21px]" strokeWidth={1.7} />
            </button>
          </CommentsSheet>
          <ShareSheet title={post.caption}>
            <button
              aria-label="Share"
              className="action-btn grid h-10 w-10 place-items-center rounded-full"
            >
              <Send className="h-[21px] w-[21px]" strokeWidth={1.7} />
            </button>
          </ShareSheet>
          {post.allowDownload && (
            <button
              onClick={handleDownload}
              aria-label="Download"
              className="action-btn grid h-10 w-10 place-items-center rounded-full text-muted-foreground hover:text-foreground"
            >
              <Download className="h-[21px] w-[21px]" strokeWidth={1.7} />
            </button>
          )}
        </div>
        <button
          onClick={() => toggleSave(post.id)}
          aria-label="Save"
          className={cn(
            "action-btn grid h-10 w-10 place-items-center rounded-full",
            isSaved && "animate-pop",
          )}
        >
          <Bookmark
            className={cn("h-[21px] w-[21px]", isSaved && "fill-foreground")}
            strokeWidth={1.7}
          />
        </button>
      </div>

      <div className="space-y-2 px-4 pb-4 pt-1.5">
        <p className="font-ui text-[12.5px] font-semibold tracking-[-0.01em]">
          {formatCount(post.likes + (isLiked ? 1 : 0))} likes
        </p>
        <p className="text-[13.5px] leading-[1.55] text-foreground/88">
          <span className="font-semibold">@{user.username}</span> {post.caption}
        </p>
        <div className="flex flex-wrap gap-1.5 pt-0.5">
          {post.hashtags.map((h) => (
            <span
              key={h}
              className="chip rounded-full px-2.5 py-1 font-ui text-[10.5px] font-medium tracking-[-0.01em]"
            >
              #{h}
            </span>
          ))}
        </div>
        <div className="flex items-center gap-2 pt-1">
          <CommentsSheet comments={post.comments}>
            <button className="font-ui text-[11.5px] text-muted-foreground transition-colors duration-200 hover:text-foreground">
              View all {post.comments.length} comments
            </button>
          </CommentsSheet>
          <span aria-hidden className="h-[3px] w-[3px] rounded-full bg-muted-foreground/45" />
          <p className="font-ui text-[10px] uppercase tracking-[0.16em] text-muted-foreground/65">
            {post.time} ago
          </p>
        </div>
      </div>
    </article>
  );
}