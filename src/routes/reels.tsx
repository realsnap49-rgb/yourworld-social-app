import { createFileRoute } from "@tanstack/react-router";
import { useCallback, useEffect, useRef, useState } from "react";
import {
  Heart,
  MessageCircle,
  Send,
  Bookmark,
  Download,
  Music2,
  Volume2,
  Lock,
  MoreVertical,
  EyeOff,
  UserX,
  Flag,
  VolumeX,
  Star,
} from "lucide-react";
import { YwAvatar } from "@/components/yw/Avatar";
import { ShareSheet } from "@/components/yw/ShareSheet";
import { CommentsSheet } from "@/components/yw/CommentsSheet";
import { byId, formatCount, posts, reels, type Reel, type User } from "@/lib/yw-data";
import { getLocalMedia, resolveMediaUrl, useSocialPosts } from "@/lib/social-data";
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
      id="yw-reels-scroller"
      className="no-scrollbar h-[calc(100dvh-4.75rem)] snap-y snap-mandatory overflow-y-scroll overscroll-y-contain bg-background [-webkit-overflow-scrolling:touch] [scroll-snap-stop:always] [scroll-behavior:smooth]"
      aria-label="Reels"
    >
      <ReelsList />
    </main>
  );
}

function ReelsList() {
  const [active, setActive] = useState(0);
  const nodes = useRef<(HTMLElement | null)[]>([]);
  const { posts: dbReels, toggleLike: toggleDbLike } = useSocialPosts("reel");

  const live = dbReels.map((p) => ({
    reel: {
      id: p.id,
      userId: p.user_id,
      poster: p.media_url,
      caption: p.caption,
      hashtags: p.hashtags ?? [],
      audio: p.audio ?? "original audio",
      likes: p.likeCount,
      commentCount: p.commentCount,
      shares: 0,
      allowDownload: p.allow_download,
    } satisfies Reel,
    author: p.author,
    likedByMe: p.likedByMe,
    mediaUrl: p.media_url,
    mediaType: p.media_type,
  }));

  const items = live.length
    ? live
    : reels.map((reel) => ({
        reel,
        author: undefined as User | undefined,
        likedByMe: undefined,
        mediaUrl: reel.poster,
        mediaType: "image",
      }));
  const usingLive = live.length > 0;

  useEffect(() => {
    const io = new IntersectionObserver(
      (entries) => {
        let best: { i: number; ratio: number } | null = null;
        for (const e of entries) {
          const i = Number((e.target as HTMLElement).dataset.index);
          if (!best || e.intersectionRatio > best.ratio) best = { i, ratio: e.intersectionRatio };
        }
        if (best && best.ratio > 0.5) setActive(best.i);
      },
      { threshold: [0, 0.5, 0.75, 1] },
    );
    nodes.current.forEach((n) => n && io.observe(n));
    return () => io.disconnect();
  }, [items.length]);

  return (
    <>
      {items.map(({ reel, author, likedByMe, mediaUrl, mediaType }, i) => (
        <section
          key={reel.id}
          data-index={i}
          ref={(el) => {
            nodes.current[i] = el;
          }}
          className="relative h-[calc(100dvh-4.75rem)] w-full snap-start snap-always overflow-hidden [contain:layout_paint_size] [content-visibility:auto]"
        >
          {/* window: only current, 1 previous and 1 next are mounted */}
          {Math.abs(i - active) <= 1 ? (
            <ReelItem
              reel={reel}
              active={i === active}
              author={author}
              likedByMe={likedByMe}
              mediaUrl={mediaUrl}
              mediaType={mediaType}
              onDbLike={usingLive ? () => void toggleDbLike(reel.id) : undefined}
            />
          ) : null}
        </section>
      ))}
    </>
  );
}

const REEL_DURATION = 15; // seconds per reel (image-backed demo media)

/**
 * Renders reel media with graceful recovery: if the stored URL fails to load
 * (expired signed URL, missing public URL) we retry with a freshly resolved
 * Supabase URL, then with a local blob URL from this session, then fall back
 * to an image.
 */
function ReelMedia({
  url,
  type,
  alt,
  active,
  mediaRef,
  muted,
  paused = false,
}: {
  url: string;
  type: string;
  alt: string;
  active: boolean;
  mediaRef: React.MutableRefObject<HTMLElement | null>;
  muted: boolean;
  paused?: boolean;
}) {
  const [src, setSrc] = useState(url);
  const [asImage, setAsImage] = useState(!type.startsWith("video"));
  const tried = useRef<Set<string>>(new Set());

  useEffect(() => {
    tried.current = new Set();
    setSrc(url);
    setAsImage(!type.startsWith("video"));
  }, [url, type]);

  const handleError = useCallback(() => {
    tried.current.add(src);
    void (async () => {
      const local = getLocalMedia(url);
      if (local && !tried.current.has(local)) {
        setSrc(local);
        return;
      }
      const resolved = await resolveMediaUrl(url);
      if (resolved && !tried.current.has(resolved)) {
        setSrc(resolved);
        return;
      }
      setAsImage(true);
    })();
  }, [src, url]);

  const videoRef = useRef<HTMLVideoElement | null>(null);
  useEffect(() => {
    const v = videoRef.current;
    if (!v || asImage) return;
    if (active && !paused) void v.play().catch(() => {});
    else v.pause();
  }, [active, asImage, src, paused]);

  const className = cn(
    "h-full w-full object-cover will-change-transform [backface-visibility:hidden]",
    active && asImage && "animate-kenburns",
    paused && "[animation-play-state:paused]",
  );

  if (asImage) {
    return (
      <img
        ref={(el) => {
          mediaRef.current = el;
        }}
        src={src}
        alt={alt}
        decoding="async"
        loading="eager"
        onError={handleError}
        className={className}
      />
    );
  }

  return (
    <video
      ref={(el) => {
        videoRef.current = el;
        mediaRef.current = el;
      }}
      src={src}
      playsInline
      muted={muted}
      loop
      preload="metadata"
      onError={handleError}
      className={className}
    />
  );
}

function ReelItem({
  reel,
  active,
  author,
  likedByMe,
  mediaUrl,
  mediaType,
  onDbLike,
}: {
  reel: Reel;
  active: boolean;
  author?: User;
  likedByMe?: boolean;
  mediaUrl?: string;
  mediaType?: string;
  onDbLike?: () => void;
}) {
  const user = author ?? byId(reel.userId);
  const { liked, saved, following, toggleLike, toggleSave, toggleFollow } = useYw();
  const { burst, onDoubleTap } = useDoubleTapLike(reel.id);
  const [expanded, setExpanded] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [muted, setMuted] = useState(false);
  const lastTap = useRef(0);
  const isLiked = onDbLike ? !!likedByMe : !!liked[reel.id];
  const isSaved = !!saved[reel.id];
  const commentSeed = posts[0].comments;

  // ---- playback timeline -------------------------------------------------
  const [progress, setProgress] = useState(0); // 0..1
  const [scrubbing, setScrubbing] = useState(false);
  // Press-and-hold anywhere on the reel pauses playback (Instagram style).
  const [held, setHeld] = useState(false);
  const barRef = useRef<HTMLDivElement>(null);
  const rafRef = useRef<number>(0);
  const lastTs = useRef(0);

  useEffect(() => {
    if (!active || scrubbing || held) return;
    lastTs.current = performance.now();
    const tick = (ts: number) => {
      const dt = (ts - lastTs.current) / 1000;
      lastTs.current = ts;
      setProgress((p) => (p + dt / REEL_DURATION) % 1);
      rafRef.current = requestAnimationFrame(tick);
    };
    rafRef.current = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(rafRef.current);
  }, [active, scrubbing, held]);

  const seekFromEvent = useCallback((clientX: number) => {
    const el = barRef.current;
    if (!el) return;
    const r = el.getBoundingClientRect();
    setProgress(Math.min(1, Math.max(0, (clientX - r.left) / r.width)));
  }, []);

  const onBarPointerDown = (e: React.PointerEvent) => {
    e.stopPropagation();
    (e.target as HTMLElement).setPointerCapture?.(e.pointerId);
    setScrubbing(true);
    seekFromEvent(e.clientX);
  };
  const onBarPointerMove = (e: React.PointerEvent) => {
    if (!scrubbing) return;
    e.stopPropagation();
    seekFromEvent(e.clientX);
  };
  const endScrub = () => setScrubbing(false);

  // ---- pinch to zoom -----------------------------------------------------
  const mediaRef = useRef<HTMLElement | null>(null);
  const pointers = useRef(new Map<number, { x: number; y: number }>());
  const pinchStart = useRef({ dist: 0, scale: 1 });
  const transform = useRef({ scale: 1, x: 0, y: 0 });

  const applyTransform = () => {
    const el = mediaRef.current;
    if (!el) return;
    const { scale, x, y } = transform.current;
    el.style.transform = `translate3d(${x}px, ${y}px, 0) scale(${scale})`;
  };

  const onPointerDown = (e: React.PointerEvent) => {
    pointers.current.set(e.pointerId, { x: e.clientX, y: e.clientY });
    if (pointers.current.size === 2) {
      const [a, b] = [...pointers.current.values()];
      pinchStart.current = {
        dist: Math.hypot(a.x - b.x, a.y - b.y) || 1,
        scale: transform.current.scale,
      };
      const el = mediaRef.current;
      if (el) el.style.transition = "none";
    }
  };

  const onPointerMove = (e: React.PointerEvent) => {
    if (!pointers.current.has(e.pointerId)) return;
    pointers.current.set(e.pointerId, { x: e.clientX, y: e.clientY });
    if (pointers.current.size !== 2) return;
    e.preventDefault();
    const [a, b] = [...pointers.current.values()];
    const dist = Math.hypot(a.x - b.x, a.y - b.y);
    const scale = Math.min(4, Math.max(1, (dist / pinchStart.current.dist) * pinchStart.current.scale));
    transform.current.scale = scale;
    applyTransform();
  };

  const releasePointer = (e: React.PointerEvent) => {
    pointers.current.delete(e.pointerId);
    if (pointers.current.size < 2 && transform.current.scale !== 1) {
      transform.current = { scale: 1, x: 0, y: 0 };
      const el = mediaRef.current;
      if (el) el.style.transition = "transform 260ms cubic-bezier(.22,1,.36,1)";
      applyTransform();
    }
  };

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
    <>
      <div
        className="absolute inset-0 touch-pan-y overflow-hidden"
        onClick={handleTap}
        onDoubleClick={onDoubleTap}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={releasePointer}
        onPointerCancel={releasePointer}
      >
        <ReelMedia
          url={mediaUrl ?? reel.poster}
          type={mediaType ?? "image"}
          alt={reel.caption}
          active={active}
          mediaRef={mediaRef}
          muted={muted}
        />
        <div className="pointer-events-none absolute inset-0 veil" />
      </div>

      {burst && (
        <Heart className="pointer-events-none absolute left-1/2 top-1/2 h-28 w-28 -translate-x-1/2 -translate-y-1/2 animate-burst fill-primary text-primary" />
      )}

      <div className="absolute inset-x-0 top-0 flex items-center justify-between px-4 pt-4">
        <h1 className="font-display text-lg font-bold drop-shadow">Reels</h1>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setMuted((value) => !value)}
            className="grid h-8 w-8 place-items-center rounded-full bg-background/40 backdrop-blur"
            aria-label={muted ? "Turn sound on" : "Mute reel"}
          >
            {muted ? <VolumeX className="h-4 w-4" /> : <Volume2 className="h-4 w-4" />}
          </button>
          <span className="rounded-full bg-background/40 px-3 py-1 text-xs backdrop-blur">
            Following
          </span>
        </div>
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

      <div className="absolute bottom-14 right-2 flex flex-col items-center gap-3.5">
        <Action
          onClick={() => (onDbLike ? onDbLike() : toggleLike(reel.id))}
          label={formatCount(onDbLike ? reel.likes : reel.likes + (isLiked ? 1 : 0))}
          active={isLiked}
        >
          <Heart
            strokeWidth={1.8}
            className={cn("h-[21px] w-[21px]", isLiked && "fill-primary text-primary")}
          />
        </Action>

        <CommentsSheet comments={commentSeed}>
          <Action label={formatCount(reel.commentCount)}>
            <MessageCircle strokeWidth={1.8} className="h-[21px] w-[21px]" />
          </Action>
        </CommentsSheet>

        <Action onClick={() => toggleSave(reel.id)} label="Save" active={isSaved}>
          <Bookmark
            strokeWidth={1.8}
            className={cn("h-[21px] w-[21px]", isSaved && "fill-foreground")}
          />
        </Action>

        {reel.allowDownload ? (
          <Action onClick={handleDownload} label="Download">
            <Download strokeWidth={1.8} className="h-[21px] w-[21px]" />
          </Action>
        ) : (
          <Action
            onClick={() => toast("The creator turned downloads off for this reel")}
            label="Off"
          >
            <Lock strokeWidth={1.8} className="h-[20px] w-[20px] text-muted-foreground" />
          </Action>
        )}

        <ShareSheet
          title={reel.caption}
          media={mediaUrl ?? reel.poster}
          mediaKind={mediaType === "video" ? "video" : "photo"}
        >
          <Action label={formatCount(reel.shares)}>
            <Send strokeWidth={1.8} className="h-[21px] w-[21px]" />
          </Action>
        </ShareSheet>

        <div className="relative">
          <Action onClick={() => setMenuOpen((v) => !v)} label="More">
            <MoreVertical strokeWidth={1.8} className="h-[21px] w-[21px]" />
          </Action>
        </div>
      </div>


      {menuOpen && (
        <>
          <button
            aria-label="Close menu"
            onClick={() => setMenuOpen(false)}
            className="absolute inset-0 z-40 cursor-default bg-background/30 backdrop-blur-[2px]"
          />
          <div
            role="menu"
            className="absolute bottom-16 right-3 z-50 w-56 overflow-hidden rounded-2xl border border-border/60 bg-background/85 shadow-2xl backdrop-blur-xl animate-rise"
          >
            {[
              { icon: EyeOff, label: "Not Interested" },
              { icon: UserX, label: "Don't Recommend Creator" },
              { icon: Flag, label: "Report" },
              { icon: VolumeX, label: "Mute Creator" },
              { icon: Star, label: "Add to Favorites" },
            ].map(({ icon: Icon, label }) => (
              <button
                key={label}
                role="menuitem"
                onClick={() => {
                  setMenuOpen(false);
                  toast(label);
                }}
                className="flex w-full items-center gap-3 px-4 py-3 text-left text-[13px] font-medium transition-colors hover:bg-foreground/10"
              >
                <Icon strokeWidth={1.6} className="h-[17px] w-[17px] text-muted-foreground" />
                {label}
              </button>
            ))}
          </div>
        </>
      )}

      {/* timeline / scrubber */}
      <div
        ref={barRef}
        role="slider"
        aria-label="Seek"
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={Math.round(progress * 100)}
        tabIndex={0}
        onPointerDown={onBarPointerDown}
        onPointerMove={onBarPointerMove}
        onPointerUp={endScrub}
        onPointerCancel={endScrub}
        onClick={(e) => e.stopPropagation()}
        className="absolute inset-x-0 bottom-0 flex touch-none cursor-pointer items-end px-3 pb-3 pt-6"
      >
        <div className="relative w-full">
          <div
            className={cn(
              "w-full overflow-hidden rounded-full bg-foreground/20 transition-all duration-200",
              scrubbing ? "h-1.5" : "h-[3px]",
            )}
          >
            <div
              className="h-full rounded-full bg-foreground"
              style={{ width: `${progress * 100}%` }}
            />
          </div>
          <span
            className={cn(
              "pointer-events-none absolute top-1/2 -ml-[7px] h-3.5 w-3.5 -translate-y-1/2 rounded-full bg-foreground shadow-lg transition-transform duration-200",
              scrubbing ? "scale-100" : "scale-0",
            )}
            style={{ left: `${progress * 100}%` }}
          />
        </div>
      </div>
    </>
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
        "group flex w-12 flex-col items-center gap-1 text-foreground transition-transform duration-150 active:scale-90",
        active && "animate-pop",
      )}
    >
      <span
        className={cn(
          "grid h-11 w-11 place-items-center rounded-full border border-foreground/15 bg-background/25 shadow-[0_6px_20px_rgba(0,0,0,0.35)] backdrop-blur-md transition-colors group-hover:bg-background/40",
          active && "border-primary/40 bg-primary/15",
        )}
      >
        {children}
      </span>
      <span className="w-full truncate text-[9px] font-semibold tracking-wide text-foreground/85 drop-shadow-[0_2px_6px_rgba(0,0,0,0.6)]">
        {label}
      </span>
    </button>

  );
}