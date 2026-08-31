import { useState, useRef, useEffect, useCallback, useMemo } from "react";
import { createFileRoute, useParams, useNavigate } from "@tanstack/react-router";
import { aiFilterCss, useMoments, type MyMoment } from "@/lib/moment-store";
import { useProfiles } from "@/lib/profiles-map";
import { cn } from "@/lib/utils";
import {
  X,
  Heart,
  Send,
  Download,
  Volume2,
  VolumeX,
  Pause,
  Eye,
  Trash2,
  Archive,
  MapPin,
  ChevronUp,
  Plus,
} from "lucide-react";
import { downloadMomentMedia } from "@/lib/yw-download";
import { toast } from "sonner";

/** photo / text segment length (ms) */
const PHOTO_DURATION = 5000;
const TICK = 60;
/** long videos are split into chunks of this many seconds */
const SEGMENT_DURATION = 40;

export const Route = createFileRoute("/moment/$momentId")({
  head: () => ({
    meta: [
      { title: "Moment — YourWorld" },
      { name: "description", content: "Watch this moment on YourWorld with Snapchat-style segmented playback." },
      { property: "og:title", content: "Moment — YourWorld" },
      { property: "og:description", content: "Watch this moment on YourWorld." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: MomentViewRoute,
});

function MomentViewRoute() {
  const { momentId } = useParams({ strict: false });
  const navigate = useNavigate();
  const {
    moments,
    registerView,
    addReply,
    deleteMoment,
    archiveMoment,
    votePoll,
    registerScreenshot,
  } = useMoments();

  const selected = useMemo(
    () => moments.find((m) => String(m.id) === String(momentId)),
    [moments, momentId],
  );

  /** every author group, oldest moment first inside each group */
  const groups = useMemo(() => {
    const byAuthor = new Map<string, MyMoment[]>();
    for (const m of moments) {
      const key = m.author?.id ?? (m.mine ? "me" : m.id);
      const list = byAuthor.get(key);
      if (list) list.push(m);
      else byAuthor.set(key, [m]);
    }
    return [...byAuthor.values()]
      .map((list) => [...list].sort((a, b) => a.createdAt - b.createdAt))
      .sort((a, b) => (b[0]?.createdAt ?? 0) - (a[0]?.createdAt ?? 0));
  }, [moments]);

  const groupIndex = useMemo(() => {
    if (!selected) return -1;
    return groups.findIndex((g) => g.some((m) => m.id === selected.id));
  }, [groups, selected]);

  /** all moments of the current author, oldest first */
  const items = useMemo<MyMoment[]>(() => {
    if (groupIndex >= 0) return groups[groupIndex]!;
    return selected ? [selected] : [];
  }, [groups, groupIndex, selected]);

  const [index, setIndex] = useState(0);
  const [progress, setProgress] = useState(0);
  const [videoChunks, setVideoChunks] = useState(1);
  const [chunk, setChunk] = useState(0);
  const [paused, setPaused] = useState(false);
  const [muted, setMuted] = useState(false);
  const [liked, setLiked] = useState(false);
  const [reply, setReply] = useState("");
  const [replying, setReplying] = useState(false);
  const [showViewers, setShowViewers] = useState(false);

  const videoRef = useRef<HTMLVideoElement | null>(null);
  const musicRef = useRef<HTMLAudioElement | null>(null);
  const holdTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const heldRef = useRef(false);
  const touchStart = useRef<{ x: number; y: number } | null>(null);

  const current = items[index] ?? selected ?? null;

  // sync index to the moment in the URL
  useEffect(() => {
    if (!selected) return;
    const i = items.findIndex((m) => m.id === selected.id);
    setIndex(i >= 0 ? i : 0);
    setChunk(0);
    setProgress(0);
  }, [selected, items]);

  const close = useCallback(() => navigate({ to: "/" }), [navigate]);

  const openGroup = useCallback(
    (dir: 1 | -1) => {
      if (groupIndex < 0) {
        close();
        return;
      }
      const next = groups[groupIndex + dir];
      if (!next?.length) {
        close();
        return;
      }
      const target = dir === 1 ? next[0]! : next[0]!;
      navigate({ to: "/moment/$momentId", params: { momentId: target.id }, replace: true });
    },
    [groupIndex, groups, navigate, close],
  );

  const goNext = useCallback(() => {
    setProgress(0);
    if (chunk < videoChunks - 1) {
      const next = chunk + 1;
      setChunk(next);
      if (videoRef.current) videoRef.current.currentTime = next * SEGMENT_DURATION;
      return;
    }
    setChunk(0);
    if (index < items.length - 1) {
      setIndex(index + 1);
      return;
    }
    openGroup(1);
  }, [chunk, videoChunks, index, items.length, openGroup]);

  const goPrev = useCallback(() => {
    setProgress(0);
    if (chunk > 0) {
      const prev = chunk - 1;
      setChunk(prev);
      if (videoRef.current) videoRef.current.currentTime = prev * SEGMENT_DURATION;
      return;
    }
    const v = videoRef.current;
    if (v && v.currentTime > 2) {
      v.currentTime = 0;
      return;
    }
    setChunk(0);
    if (index > 0) {
      setIndex(index - 1);
      return;
    }
    openGroup(-1);
  }, [chunk, index, openGroup]);

  // reset per-moment state + mark viewed
  useEffect(() => {
    if (!current) return;
    setLiked(false);
    setProgress(0);
    setChunk(0);
    setVideoChunks(1);
    setShowViewers(false);
    registerView(current.id);
  }, [current?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  // preload next media
  useEffect(() => {
    const next = items[index + 1];
    if (!next?.media) return;
    if (next.kind === "photo") {
      const img = new Image();
      img.src = next.media;
    } else if (next.kind === "video") {
      const v = document.createElement("video");
      v.preload = "metadata";
      v.src = next.media;
    }
  }, [index, items]);

  // photo / text timer
  useEffect(() => {
    if (!current || current.kind === "video" || paused || showViewers) return;
    const span =
      current.trim?.end && current.trim.end > 0
        ? current.trim.end * 1000
        : PHOTO_DURATION;
    const id = setInterval(() => {
      setProgress((p) => {
        const nextP = p + (TICK / span) * 100;
        if (nextP >= 100) {
          goNext();
          return 0;
        }
        return nextP;
      });
    }, TICK);
    return () => clearInterval(id);
  }, [current, paused, showViewers, goNext]);


  // pause / resume media
  useEffect(() => {
    const v = videoRef.current;
    const a = musicRef.current;
    if (paused || showViewers) {
      v?.pause();
      a?.pause();
    } else {
      void v?.play().catch(() => {});
      void a?.play().catch(() => {});
    }
  }, [paused, showViewers, index, chunk]);

  // background music
  useEffect(() => {
    const a = musicRef.current;
    if (!a || !current?.musicUrl) return;
    a.volume = Math.min(1, Math.max(0, current.musicVolume ?? (current.kind === "video" ? 0.35 : 0.8)));
    a.currentTime = current.musicStart ?? 0;
    if (!paused) void a.play().catch(() => {});
    return () => a.pause();
  }, [current?.id, current?.musicUrl]); // eslint-disable-line react-hooks/exhaustive-deps

  // keyboard controls
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement | null;
      if (target && (target.tagName === "INPUT" || target.tagName === "TEXTAREA")) return;
      if (e.key === "ArrowRight") goNext();
      else if (e.key === "ArrowLeft") goPrev();
      else if (e.key === "Escape") close();
      else if (e.key === " ") {
        e.preventDefault();
        setPaused((p) => !p);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [goNext, goPrev, close]);

  // screenshot detection (best effort) for protected moments
  useEffect(() => {
    if (!current?.screenshotAlert || current.mine) return;
    const onKeyUp = (e: KeyboardEvent) => {
      if (e.key === "PrintScreen" || ((e.metaKey || e.ctrlKey) && e.shiftKey && /[34s]/i.test(e.key))) {
        registerScreenshot(current.id);
        toast.message("Screenshot detected — the author was notified");
      }
    };
    window.addEventListener("keyup", onKeyUp);
    return () => window.removeEventListener("keyup", onKeyUp);
  }, [current?.id, current?.screenshotAlert, current?.mine, registerScreenshot]);

  const viewerIds = useMemo(
    () => (current?.mine ? current.viewers.map((v) => v.userId) : []),
    [current],
  );
  const viewerProfiles = useProfiles(viewerIds);

  const startHold = () => {
    heldRef.current = false;
    holdTimer.current = setTimeout(() => {
      heldRef.current = true;
      setPaused(true);
    }, 250);
  };

  const endHold = () => {
    if (holdTimer.current) clearTimeout(holdTimer.current);
    holdTimer.current = null;
    if (heldRef.current) setPaused(false);
  };

  const tap = (dir: "prev" | "next") => {
    if (heldRef.current) {
      heldRef.current = false;
      return;
    }
    if (dir === "next") goNext();
    else goPrev();
  };

  if (!current) return null;

  const filter = aiFilterCss(current.ai, current.effect);
  const segments = current.kind === "video" ? videoChunks : 1;
  const likeCount = current.viewers.filter((v) => v.liked).length;

  return (
    <div
      className="fixed inset-0 z-[99999] flex items-center justify-center bg-black select-none"
      onTouchStart={(e) => {
        const t = e.touches[0];
        if (t) touchStart.current = { x: t.clientX, y: t.clientY };
      }}
      onTouchEnd={(e) => {
        const start = touchStart.current;
        const t = e.changedTouches[0];
        touchStart.current = null;
        if (!start || !t) return;
        const dx = t.clientX - start.x;
        const dy = t.clientY - start.y;
        if (Math.abs(dy) > 70 && Math.abs(dy) > Math.abs(dx)) {
          if (dy > 0) close();
          else if (current.mine) setShowViewers(true);
        } else if (Math.abs(dx) > 80) {
          openGroup(dx < 0 ? 1 : -1);
        }
      }}
    >
      <div className="relative flex h-full w-full max-w-md items-center justify-center overflow-hidden bg-black">
        {/* MEDIA */}
        <div className="pointer-events-none flex h-full w-full items-center justify-center">
          {current.kind === "video" && current.media ? (
            <video
              ref={videoRef}
              key={current.id}
              src={current.media}
              autoPlay
              playsInline
              muted={muted}
              preload="auto"
              style={{ filter }}
              className="h-full w-full object-cover"
              onLoadedMetadata={(e) => {
                const d = e.currentTarget.duration;
                setVideoChunks(Number.isFinite(d) && d > 0 ? Math.max(1, Math.ceil(d / SEGMENT_DURATION)) : 1);
              }}
              onTimeUpdate={(e) => {
                const v = e.currentTarget;
                if (!v.duration || Number.isNaN(v.duration)) return;
                const start = chunk * SEGMENT_DURATION;
                const end = Math.min(start + SEGMENT_DURATION, v.duration);
                setProgress(Math.min(100, Math.max(0, ((v.currentTime - start) / (end - start)) * 100)));
                if (v.currentTime >= end - 0.05) goNext();
              }}
              onEnded={goNext}
            />
          ) : current.kind === "photo" && current.media ? (
            <img key={current.id} src={current.media} alt="" style={{ filter }} className="h-full w-full object-cover" />
          ) : (
            <div className="grid h-full w-full place-items-center p-8" style={{ background: current.textBg || "#111" }}>
              <p className="text-center text-2xl font-bold text-white">{current.text}</p>
            </div>
          )}
        </div>

        {/* CREATOR OVERLAYS: drawing, stickers, caption, location */}
        <div className="pointer-events-none absolute inset-0 z-[10001]">
          {current.drawing ? (
            <img src={current.drawing} alt="" className="absolute inset-0 h-full w-full object-cover" />
          ) : null}
          {current.stickers?.map((s) => (
            <div
              key={s.id}
              className="absolute -translate-x-1/2 -translate-y-1/2 whitespace-pre text-4xl drop-shadow-lg"
              style={{
                left: `${s.x * 100}%`,
                top: `${s.y * 100}%`,
                transform: `translate(-50%,-50%) scale(${s.scale}) rotate(${s.rotation ?? 0}deg)`,
                color: s.color,
                fontSize: s.type === "text" ? 22 : undefined,
                fontWeight: s.type === "text" ? 700 : undefined,
              }}
            >
              {s.content}
            </div>
          ))}
          {current.kind !== "text" && current.text ? (
            <p className="absolute inset-x-6 bottom-24 text-center text-base font-semibold text-white drop-shadow-lg">
              {current.text}
            </p>
          ) : null}
          {current.location ? (
            <div className="absolute inset-x-4 bottom-16 flex flex-wrap items-center justify-center gap-2">
              <span className="flex items-center gap-1 rounded-full bg-black/50 px-2.5 py-1 text-[11px] font-semibold text-white backdrop-blur-md">
                <MapPin className="h-3 w-3" /> {current.location}
              </span>
            </div>
          ) : null}
        </div>

        {/* POLL */}
        {current.poll ? (
          <div
            className={cn(
              "absolute inset-x-8 top-1/2 z-[10003] -translate-y-1/2 rounded-2xl bg-black/60 p-4 backdrop-blur-md transition-opacity",
              paused ? "pointer-events-none opacity-0" : "opacity-100",
            )}
          >
            <p className="mb-3 text-center text-sm font-bold text-white">{current.poll.question}</p>
            <div className="flex gap-2">
              {current.poll.options.map((opt, i) => {
                const votes = current.poll!.votes;
                const total = votes[0] + votes[1] || 1;
                const pct = Math.round(((votes[i as 0 | 1] ?? 0) / total) * 100);
                const mine = current.poll!.myVote === i;
                return (
                  <button
                    key={opt + i}
                    type="button"
                    onClick={() => {
                      if (current.poll!.myVote === null) votePoll(current.id, i as 0 | 1);
                    }}
                    className={cn(
                      "relative flex-1 overflow-hidden rounded-xl border border-white/25 px-3 py-2 text-xs font-semibold text-white",
                      mine && "border-white",
                    )}
                  >
                    <span
                      className="absolute inset-y-0 left-0 bg-white/25"
                      style={{ width: current.poll!.myVote === null ? 0 : `${pct}%` }}
                    />
                    <span className="relative">
                      {opt}
                      {current.poll!.myVote === null ? "" : ` · ${pct}%`}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
        ) : null}

        {current.musicUrl ? <audio ref={musicRef} src={current.musicUrl} loop /> : null}

        {/* TAP ZONES */}
        <div className="absolute inset-0 z-[10000] flex">
          <button
            type="button"
            aria-label="Previous"
            className="h-full w-[30%] bg-transparent"
            onPointerDown={startHold}
            onPointerUp={endHold}
            onPointerLeave={endHold}
            onPointerCancel={endHold}
            onClick={() => tap("prev")}
          />
          <button
            type="button"
            aria-label="Next"
            className="h-full w-[70%] bg-transparent"
            onPointerDown={startHold}
            onPointerUp={endHold}
            onPointerLeave={endHold}
            onPointerCancel={endHold}
            onClick={() => tap("next")}
          />
        </div>

        {/* PROGRESS */}
        <div
          className={cn(
            "pointer-events-none absolute left-3 right-3 top-3 z-[10002] flex gap-1.5 transition-opacity duration-300",
            paused ? "opacity-0" : "opacity-100",
          )}
        >
          {Array.from({ length: segments }).map((_, idx) => (
            <div key={idx} className="h-1 flex-1 overflow-hidden rounded-full bg-white/30">
              <div
                className="h-full rounded-full bg-white"
                style={{
                  width: idx < chunk ? "100%" : idx === chunk ? `${progress}%` : "0%",
                  transition: idx === chunk ? "width 80ms linear" : undefined,
                }}
              />
            </div>
          ))}
        </div>

        {/* HEADER */}
        <div
          className={cn(
            "absolute left-3 right-3 top-7 z-[10002] flex items-center justify-between transition-opacity duration-300",
            paused ? "pointer-events-none opacity-0" : "opacity-100",
          )}
        >
          <div className="flex items-center gap-2.5">
            <div className="h-9 w-9 overflow-hidden rounded-full border-2 border-white/50 bg-neutral-800">
              {current.author?.avatar ? (
                <img src={current.author.avatar} className="h-full w-full object-cover" alt="" />
              ) : null}
            </div>
            <div className="flex items-center gap-2">
              <span className="text-sm font-bold text-white drop-shadow-md">
                {current.author?.name || current.author?.username || "You"}
              </span>
              <span className="text-[11px] font-medium text-white/70">{timeAgo(current.createdAt)}</span>
              {items.length > 1 ? (
                <span className="rounded-full bg-white/20 px-1.5 py-0.5 text-[10px] font-semibold text-white">
                  {index + 1}/{items.length}
                </span>
              ) : null}
            </div>
          </div>

          <div className="pointer-events-auto flex items-center gap-2">
            <button
              type="button"
              aria-label={muted ? "Unmute" : "Mute"}
              onClick={() => setMuted((m) => !m)}
              className="rounded-full border border-white/20 bg-black/60 p-2.5 text-white active:scale-90"
            >
              {muted ? <VolumeX className="h-4 w-4" /> : <Volume2 className="h-4 w-4" />}
            </button>
            <button
              type="button"
              aria-label="Close"
              onClick={close}
              className="rounded-full border border-white/20 bg-black/60 p-2.5 text-white active:scale-90"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>

        {/* PAUSED BADGE */}
        {paused ? (
          <div className="pointer-events-none absolute left-1/2 top-1/2 z-[10002] -translate-x-1/2 -translate-y-1/2 rounded-full bg-black/50 px-3 py-1.5 text-[11px] font-semibold text-white backdrop-blur-md">
            <Pause className="mr-1 inline h-3 w-3" /> Paused
          </div>
        ) : null}

        {/* FOOTER ACTIONS */}
        {!current.mine ? (
          <div
            className={cn(
              "absolute inset-x-3 bottom-4 z-[10002] flex items-center gap-2 transition-opacity duration-300",
              paused ? "pointer-events-none opacity-0" : "opacity-100",
            )}
          >
            <div className="flex flex-1 items-center gap-2 rounded-full border border-white/20 bg-black/50 px-3 py-1.5 backdrop-blur-md">
              <input
                value={reply}
                onChange={(e) => setReply(e.target.value)}
                onFocus={() => setPaused(true)}
                onBlur={() => setPaused(false)}
                placeholder="Send a reply"
                className="flex-1 bg-transparent text-sm text-white placeholder:text-white/50 focus:outline-none"
              />
              <button
                type="button"
                aria-label="Send reply"
                disabled={!reply.trim() || replying}
                onClick={() => {
                  const text = reply.trim();
                  if (!text) return;
                  setReplying(true);
                  addReply(current.id, text);
                  setReply("");
                  setReplying(false);
                  toast.success("Reply sent");
                }}
                className="text-white disabled:opacity-40"
              >
                <Send className="h-4 w-4" />
              </button>
            </div>
            <button
              type="button"
              aria-label="Like"
              onClick={() => {
                const next = !liked;
                setLiked(next);
                registerView(current.id, next);
              }}
              className="rounded-full border border-white/20 bg-black/50 p-2.5 text-white backdrop-blur-md active:scale-90"
            >
              <Heart className={cn("h-5 w-5", liked && "fill-red-500 text-red-500")} />
            </button>
            {current.allowDownload && current.media ? (
              <button
                type="button"
                aria-label="Download"
                onClick={() =>
                  void downloadMomentMedia(
                    current.media,
                    current.kind,
                    current.author?.username || "yourworld",
                    current.id,
                  )
                }
                className="rounded-full border border-white/20 bg-black/50 p-2.5 text-white backdrop-blur-md active:scale-90"
              >
                <Download className="h-5 w-5" />
              </button>
            ) : null}
          </div>
        ) : (
          /* OWNER ACTIONS */
          <div
            className={cn(
              "absolute inset-x-3 bottom-4 z-[10002] flex items-center justify-between transition-opacity duration-300",
              paused ? "pointer-events-none opacity-0" : "opacity-100",
            )}
          >
            <button
              type="button"
              onClick={() => setShowViewers(true)}
              className="flex items-center gap-2 rounded-full border border-white/20 bg-black/50 px-3 py-2 text-xs font-semibold text-white backdrop-blur-md active:scale-95"
            >
              <ChevronUp className="h-4 w-4" />
              <Eye className="h-4 w-4" /> {current.viewers.length}
              <Heart className="h-4 w-4" /> {likeCount}
            </button>
            <div className="flex items-center gap-2">
              <button
                type="button"
                aria-label="Add another moment"
                onClick={() => navigate({ to: "/moment/create" })}
                className="rounded-full border border-white/20 bg-pink-500/80 p-2.5 text-white backdrop-blur-md active:scale-90"
              >
                <Plus className="h-5 w-5" />
              </button>
              <button
                type="button"
                aria-label="Archive moment"
                onClick={() => {
                  archiveMoment(current.id);
                  toast.success("Moment archived");
                  close();
                }}
                className="rounded-full border border-white/20 bg-black/50 p-2.5 text-white backdrop-blur-md active:scale-90"
              >
                <Archive className="h-5 w-5" />
              </button>
              <button
                type="button"
                aria-label="Delete moment"
                onClick={() => {
                  deleteMoment(current.id);
                  navigate({ to: "/", replace: true });
                }}
                className="rounded-full border border-white/20 bg-black/50 p-2.5 text-white backdrop-blur-md active:scale-90"
              >
                <Trash2 className="h-5 w-5" />
              </button>
            </div>
          </div>
        )}

        {/* VIEWERS SHEET */}
        {showViewers && current.mine ? (
          <div className="absolute inset-0 z-[10005] flex flex-col justify-end">
            <button
              type="button"
              aria-label="Close viewers"
              className="flex-1 bg-black/50"
              onClick={() => setShowViewers(false)}
            />
            <div className="max-h-[60%] overflow-y-auto rounded-t-3xl bg-neutral-900 p-4">
              <div className="mx-auto mb-3 h-1 w-10 rounded-full bg-white/25" />
              <p className="mb-3 text-sm font-semibold text-white">
                Seen by {current.viewers.length}
              </p>
              {current.viewers.length === 0 ? (
                <p className="pb-6 text-sm text-white/60">No views yet.</p>
              ) : (
                <ul className="space-y-3 pb-6">
                  {[...current.viewers]
                    .sort((a, b) => b.at - a.at)
                    .map((v) => {
                      const p = viewerProfiles.get(v.userId);
                      return (
                        <li key={v.userId} className="flex items-center gap-3">
                          <div className="h-9 w-9 overflow-hidden rounded-full bg-neutral-700">
                            {p?.avatarUrl ? (
                              <img src={p.avatarUrl} alt="" className="h-full w-full object-cover" />
                            ) : null}
                          </div>
                          <div className="min-w-0 flex-1">
                            <p className="truncate text-sm font-medium text-white">
                              {p?.name ?? "User"}
                            </p>
                            <p className="truncate text-[11px] text-white/50">
                              @{p?.username ?? "user"} · {timeAgo(v.at)}
                            </p>
                          </div>
                          {v.screenshot ? (
                            <span className="rounded-full bg-amber-500/20 px-2 py-0.5 text-[10px] font-semibold text-amber-300">
                              screenshot
                            </span>
                          ) : null}
                          {v.liked ? <Heart className="h-4 w-4 fill-red-500 text-red-500" /> : null}
                        </li>
                      );
                    })}
                </ul>
              )}

              {current.replies.length > 0 ? (
                <>
                  <p className="mb-2 text-sm font-semibold text-white">
                    Replies {current.replies.length}
                  </p>
                  <ul className="space-y-2 pb-6">
                    {current.replies.map((r) => (
                      <li key={r.id} className="rounded-xl bg-white/5 px-3 py-2">
                        <p className="text-sm text-white">{r.text}</p>
                        <p className="text-[11px] text-white/45">{timeAgo(r.at)}</p>
                      </li>
                    ))}
                  </ul>
                </>
              ) : null}
            </div>
          </div>
        ) : null}
      </div>
    </div>
  );
}

function timeAgo(ts: number) {
  const diff = Math.max(0, Date.now() - ts);
  const m = Math.floor(diff / 60000);
  if (m < 1) return "now";
  if (m < 60) return `${m}m`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h`;
  return `${Math.floor(h / 24)}d`;
}
