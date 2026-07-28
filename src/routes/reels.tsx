import { createFileRoute } from "@tanstack/react-router";
import { useCallback, useEffect, useRef, useState } from "react";
import { Heart, MessageCircle, Send, Bookmark, Download, Music2, Lock } from "lucide-react";
import { YwAvatar } from "@/components/yw/Avatar";
import { ShareSheet } from "@/components/yw/ShareSheet";
import { CommentsSheet } from "@/components/yw/CommentsSheet";
import { byId, formatCount, posts, reels, type Reel } from "@/lib/yw-data";
import { useDoubleTapLike, useYw } from "@/lib/yw-store";
import { downloadWithWatermark } from "@/lib/yw-download";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

export const Route = createFileRoute("/reels")({
  head: () => ({
    meta: [
      { title: "Reels — YourWorld" },
      {
        name: "description",
        content:
          "Full-screen vertical reels you swipe through: like, comment, share, save and download when the creator allows it.",
      },
      { property: "og:title", content: "Reels — YourWorld" },
      {
        property: "og:description",
        content: "Swipe through full-screen vertical reels on YourWorld.",
      },
    ],
  }),
  component: ReelsPage,
});

function ReelsPage() {
  return (
    <main
      className="no-scrollbar h-[calc(100dvh-4.75rem)] snap-y snap-mandatory overflow-y-scroll bg-background"
      aria-label="Reels"
    >
      {reels.map((reel) => (
        <ReelItem key={reel.id} reel={reel} />
      ))}
    </main>
  );
}

function ReelItem({ reel }: { reel: Reel }) {
  const user = byId(reel.userId);
  const { liked, saved, following, toggleLike, toggleSave, toggleFollow } = useYw();
  const { burst, onDoubleTap } = useDoubleTapLike(reel.id);
  const [expanded, setExpanded] = useState(false);
  const lastTap = useRef(0);
  const isLiked = !!liked[reel.id];
  const isSaved = !!saved[reel.id];
  const commentSeed = posts[0].comments;

  const handleTap = () => {
    const now = Date.now();
    if (now - lastTap.current < 300) onDoubleTap();
    lastTap.current = now;
  };

  const handleDownload = async () => {
    try {
      await downloadWithWatermark(reel.poster, user.username, `yw-reel-${reel.id}.jpg`);
      toast.success("Downloaded in original quality with YW watermark");
    } catch {
      toast.error("Download failed");
    }
  };

  return (
    <section className="relative h-[calc(100dvh-4.75rem)] w-full snap-start snap-always overflow-hidden">
      <div className="absolute inset-0" onClick={handleTap} onDoubleClick={onDoubleTap}>
        <img
          src={reel.poster}
          alt={reel.caption}
          className="h-full w-full animate-kenburns object-cover"
        />
        <div className="pointer-events-none absolute inset-0 veil" />
      </div>

      {burst && (
        <Heart className="pointer-events-none absolute left-1/2 top-1/2 h-28 w-28 -translate-x-1/2 -translate-y-1/2 animate-burst fill-primary text-primary" />
      )}

      <div className="absolute inset-x-0 top-0 flex items-center justify-between px-4 pt-4">
        <h1 className="font-display text-lg font-bold drop-shadow">Reels</h1>
        <span className="rounded-full bg-background/40 px-3 py-1 text-xs backdrop-blur">
          Following
        </span>
      </div>

      <div className="absolute bottom-4 left-0 right-16 space-y-2 px-4">
        <div className="flex items-center gap-2.5">
          <YwAvatar user={user} size={36} className="ring-2 ring-foreground/30" />
          <span className="truncate text-sm font-semibold drop-shadow">@{user.username}</span>
          <button
            onClick={() => toggleFollow(user.id)}
            className={cn(
              "rounded-full border px-3 py-1 text-xs font-semibold transition-colors",
              following[user.id]
                ? "border-border bg-background/40 text-muted-foreground"
                : "border-foreground/50",
            )}
          >
            {following[user.id] ? "Following" : "Follow"}
          </button>
        </div>

        <button
          onClick={() => setExpanded((v) => !v)}
          className="block text-left text-sm drop-shadow"
        >
          <span className={cn(!expanded && "line-clamp-1")}>{reel.caption}</span>
          <span className="text-accent"> {reel.hashtags.map((h) => `#${h}`).join(" ")}</span>
        </button>

        <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
          <Music2 className="h-3.5 w-3.5" /> <span className="truncate">{reel.audio}</span>
        </p>
      </div>

      <div className="absolute bottom-6 right-2 flex flex-col items-center gap-5">
        <Action
          onClick={() => toggleLike(reel.id)}
          label={formatCount(reel.likes + (isLiked ? 1 : 0))}
          active={isLiked}
        >
          <Heart className={cn("h-7 w-7", isLiked && "fill-primary text-primary")} />
        </Action>

        <CommentsSheet comments={commentSeed}>
          <Action label={formatCount(reel.commentCount)}>
            <MessageCircle className="h-7 w-7" />
          </Action>
        </CommentsSheet>

        <ShareSheet title={reel.caption}>
          <Action label={formatCount(reel.shares)}>
            <Send className="h-7 w-7" />
          </Action>
        </ShareSheet>

        <Action onClick={() => toggleSave(reel.id)} label="Save" active={isSaved}>
          <Bookmark className={cn("h-7 w-7", isSaved && "fill-foreground")} />
        </Action>

        {reel.allowDownload ? (
          <Action onClick={handleDownload} label="Save to device">
            <Download className="h-7 w-7" />
          </Action>
        ) : (
          <Action
            onClick={() => toast("The creator turned downloads off for this reel")}
            label="Off"
          >
            <Lock className="h-6 w-6 text-muted-foreground" />
          </Action>
        )}
      </div>
    </section>
  );
}

function Action({
  children,
  label,
  onClick,
  active,
}: {
  children: React.ReactNode;
  label: string;
  onClick?: () => void;
  active?: boolean;
}) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "flex w-14 flex-col items-center gap-1 drop-shadow transition-transform active:scale-90",
        active && "animate-pop",
      )}
    >
      {children}
      <span className="w-full truncate text-[11px] font-semibold">{label}</span>
    </button>
  );
}