import { memo, useCallback, useEffect, useRef, useState } from "react";
import { Link } from "@tanstack/react-router";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { YwAvatar } from "@/components/yw/Avatar";
import { cn } from "@/lib/utils";
import { Plus, X, Download, Music2, Eye, Volume2, VolumeX } from "lucide-react";
import { useMoments, aiFilterCss, type MyMoment } from "@/lib/moment-store";
import { currentUser } from "@/lib/yw-data";
import { downloadMomentMedia } from "@/lib/yw-download";
import { toast } from "sonner";

const PHOTO_MS = 5000;

function StoriesBase() {
  const { moments } = useMoments();
  const [index, setIndex] = useState<number | null>(null);
  const close = useCallback(() => setIndex(null), []);

  return (
    <>
      <div className="no-scrollbar flex gap-3.5 overflow-x-auto px-4 pb-4 pt-4">
        <Link to="/moment/create" className="flex flex-col items-center gap-1.5 shrink-0">
          <div className="relative flex h-[68px] w-[68px] items-center justify-center rounded-full border-2 border-dashed border-primary/40 bg-muted/30 p-1 transition-all hover:border-primary">
            <div className="flex h-full w-full items-center justify-center rounded-full bg-background shadow-xs">
              <Plus className="h-6 w-6 text-primary" />
            </div>
          </div>
          <span className="text-[11px] font-medium text-muted-foreground">Your Moment</span>
        </Link>

        {moments.map((item, i) => (
          <button
            key={item.id}
            onClick={() => setIndex(i)}
            className="flex flex-col items-center gap-1.5 shrink-0 focus:outline-none"
          >
            <div className="rounded-full bg-gradient-to-tr from-amber-500 via-rose-500 to-purple-600 p-[2px]">
              <div className="rounded-full bg-background p-[2px]">
                {item.kind === "text" || !item.media ? (
                  <div
                    className="grid h-14 w-14 place-items-center rounded-full text-[10px] font-semibold text-white"
                    style={{ background: item.textBg || "hsl(var(--muted))" }}
                  >
                    Aa
                  </div>
                ) : item.kind === "video" ? (
                  <video
                    src={`${item.media}${item.media.includes("#") ? "" : "#t=0.1"}`}
                    muted
                    playsInline
                    preload="metadata"
                    className="h-14 w-14 rounded-full bg-zinc-900 object-cover"
                  />
                ) : (
                  <img
                    src={item.media}
                    alt=""
                    className="h-14 w-14 rounded-full object-cover"
                  />
                )}
              </div>
            </div>
            <span className="max-w-[68px] truncate text-[11px] font-medium">{currentUser.name}</span>
          </button>
        ))}
      </div>

      <Dialog open={index !== null} onOpenChange={close}>
        <DialogContent
          className="max-w-md gap-0 overflow-hidden border-none bg-black p-0 text-white"
        >
          <DialogTitle className="sr-only">Moment</DialogTitle>
          {index !== null && moments[index] && (
            <StoryPlayer
              moments={moments}
              index={index}
              onIndex={setIndex}
              onClose={close}
            />
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}

function StoryPlayer({
  moments,
  index,
  onIndex,
  onClose,
}: {
  moments: MyMoment[];
  index: number;
  onIndex: (i: number) => void;
  onClose: () => void;
}) {
  const moment = moments[index]!;
  const [progress, setProgress] = useState(0);
  const [saving, setSaving] = useState(false);
  const [muted, setMuted] = useState(false);
  const [paused, setPaused] = useState(false);
  const [holding, setHolding] = useState(false);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const holdTimer = useRef<number | null>(null);
  const pressStart = useRef(0);
  const segmentStart = useRef(Date.now());

  const next = useCallback(() => {
    if (index + 1 < moments.length) onIndex(index + 1);
    else onClose();
  }, [index, moments.length, onIndex, onClose]);

  const prev = useCallback(() => {
    if (index > 0) onIndex(index - 1);
  }, [index, onIndex]);

  const restart = useCallback(() => {
    segmentStart.current = Date.now();
    setProgress(0);
    const v = videoRef.current;
    if (v) {
      v.currentTime = moment.trim?.start ?? 0;
      void v.play().catch(() => {});
    }
  }, [moment.trim?.start]);

  // reset per-segment timing whenever the active segment changes
  useEffect(() => {
    segmentStart.current = Date.now();
    setProgress(0);
    setPaused(false);
    setHolding(false);
  }, [moment.id]);

  // pause / resume media with the hold gesture
  useEffect(() => {
    const v = videoRef.current;
    const a = audioRef.current;
    if (paused) {
      v?.pause();
      a?.pause();
    } else {
      void v?.play().catch(() => {});
      void a?.play().catch(() => {});
    }
  }, [paused]);

  // preload the next segment so transitions are seamless
  useEffect(() => {
    const upcoming = moments[index + 1];
    if (!upcoming?.media || upcoming.kind === "text") return;
    if (upcoming.kind === "photo") {
      const img = new Image();
      img.src = upcoming.media;
    } else {
      const el = document.createElement("video");
      el.preload = "auto";
      el.muted = true;
      el.src = upcoming.media;
      try {
        el.load();
      } catch {
        /* ignore */
      }
    }
  }, [index, moments]);

  // timed progress for photo / text moments
  useEffect(() => {
    if (moment.kind === "video" && moment.media) return;
    if (paused) return;
    let elapsedBefore = progress * PHOTO_MS;
    const started = Date.now();
    const id = window.setInterval(() => {
      const p = Math.min(1, (elapsedBefore + (Date.now() - started)) / PHOTO_MS);
      setProgress(p);
      if (p >= 1) {
        window.clearInterval(id);
        next();
      }
    }, 50);
    return () => {
      elapsedBefore = 0;
      window.clearInterval(id);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [moment.id, moment.kind, moment.media, next, paused]);

  const onPressStart = (e: React.PointerEvent) => {
    pressStart.current = Date.now();
    (e.currentTarget as HTMLElement).setPointerCapture?.(e.pointerId);
    holdTimer.current = window.setTimeout(() => {
      setHolding(true);
      setPaused(true);
    }, 300);
  };

  const onPressEnd = (e: React.PointerEvent) => {
    if (holdTimer.current) {
      window.clearTimeout(holdTimer.current);
      holdTimer.current = null;
    }
    if (holding) {
      setHolding(false);
      setPaused(false);
      return;
    }
    const host = e.currentTarget as HTMLElement;
    const rect = host.getBoundingClientRect();
    const ratio = (e.clientX - rect.left) / (rect.width || 1);
    if (ratio > 0.6) {
      next();
    } else if (ratio < 0.4) {
      const elapsed = Date.now() - segmentStart.current;
      if (elapsed > 2000) restart();
      else if (index > 0) prev();
      else restart();
    }
  };


  const save = async () => {
    if (!moment.allowDownload) {
      toast("Downloads are off for this moment");
      return;
    }
    if (!moment.media) {
      toast("Nothing to save for a text moment");
      return;
    }
    setSaving(true);
    try {
      await downloadMomentMedia(moment.media, moment.kind, currentUser.username, moment.id);
      toast.success("Saved to your device");
    } catch {
      toast.error("Couldn't save this moment");
    } finally {
      setSaving(false);
    }
  };

  const filter = aiFilterCss(moment.ai, moment.effect);

  return (
    <div className="relative aspect-9/16 w-full overflow-hidden bg-black">
      {moment.kind === "video" && moment.media ? (
        <video
          ref={videoRef}
          key={moment.id}
          src={moment.media}
          autoPlay
          playsInline
          muted={muted}
          style={{ filter }}
          className="h-full w-full object-cover"
          onLoadedMetadata={(e) => {
            if (moment.trim) e.currentTarget.currentTime = moment.trim.start;
          }}
          onTimeUpdate={(e) => {
            const v = e.currentTarget;
            const start = moment.trim?.start ?? 0;
            const end = moment.trim?.end ?? (v.duration || 0);
            if (end > start) setProgress(Math.min(1, (v.currentTime - start) / (end - start)));
            if (end && v.currentTime >= end) next();
          }}
          onEnded={next}
        />
      ) : moment.kind === "photo" && moment.media ? (
        <img
          src={moment.media}
          alt={moment.text || "Moment"}
          style={{ filter }}
          className="h-full w-full object-cover"
        />
      ) : (
        <div
          className="grid h-full w-full place-items-center p-8"
          style={{ background: moment.textBg }}
        >
          <p className="text-center font-display text-2xl font-bold">{moment.text}</p>
        </div>
      )}

      {moment.musicUrl && (
        <audio
          ref={audioRef}
          key={`a-${moment.id}`}
          src={moment.musicUrl}
          autoPlay
          loop
          muted={muted}
          className="hidden"
          onLoadedMetadata={(e) => {
            e.currentTarget.volume =
              moment.musicVolume ?? (moment.kind === "video" ? 0.45 : 0.8);
            e.currentTarget.currentTime = moment.musicStart ?? 0;
            void e.currentTarget.play().catch(() => {});
          }}
          onTimeUpdate={(e) => {
            const a = e.currentTarget;
            const start = moment.musicStart ?? 0;
            const end = moment.musicEnd ?? 0;
            if (end > start && (a.currentTime >= end || a.currentTime < start)) {
              a.currentTime = start;
            }
          }}
        />
      )}

      {/* tap / hold surface */}
      <div
        className="absolute inset-0 z-10 select-none"
        style={{ touchAction: "none" }}
        onPointerDown={onPressStart}
        onPointerUp={onPressEnd}
        onPointerCancel={() => {
          if (holdTimer.current) window.clearTimeout(holdTimer.current);
          holdTimer.current = null;
          if (holding) {
            setHolding(false);
            setPaused(false);
          }
        }}
      />

      {/* progress bars */}
      <div
        className={cn(
          "absolute inset-x-2 top-2 z-20 flex gap-1 transition-opacity duration-200",
          holding && "opacity-0",
        )}
      >
        {moments.map((m, i) => (
          <div key={m.id} className="h-[3px] flex-1 overflow-hidden rounded-full bg-white/30">
            <div
              className="h-full bg-white transition-[width] duration-100"
              style={{ width: `${i < index ? 100 : i === index ? progress * 100 : 0}%` }}
            />
          </div>
        ))}
      </div>

      {/* header */}
      <div
        className={cn(
          "absolute inset-x-3 top-6 z-20 flex items-center gap-2.5 transition-opacity duration-200",
          holding && "pointer-events-none opacity-0",
        )}
      >

        <YwAvatar user={currentUser} size={32} />
        <div className="min-w-0 flex-1">
          <p className="truncate text-[13px] font-semibold">{currentUser.name}</p>
          <p className="flex items-center gap-1 text-[11px] text-white/70">
            <Eye className="h-3 w-3" /> {moment.viewers.length}
            {moment.music && (
              <>
                <Music2 className="ml-1.5 h-3 w-3" />
                <span className="max-w-[110px] truncate">{moment.music}</span>
              </>
            )}
          </p>
        </div>
        {(moment.kind === "video" || moment.musicUrl) && (
          <button
            aria-label={muted ? "Unmute" : "Mute"}
            onClick={() => setMuted((v) => !v)}
            className="grid h-8 w-8 place-items-center rounded-full bg-white/15 backdrop-blur-md active:scale-90"
          >
            {muted ? <VolumeX className="h-4 w-4" /> : <Volume2 className="h-4 w-4" />}
          </button>
        )}
        <button
          aria-label="Save moment"
          onClick={save}
          disabled={saving}
          className={cn(
            "grid h-8 w-8 place-items-center rounded-full bg-white/15 backdrop-blur-md active:scale-90",
            saving && "opacity-50",
          )}
        >
          <Download className="h-4 w-4" />
        </button>
        <button
          aria-label="Close"
          onClick={onClose}
          className="grid h-8 w-8 place-items-center rounded-full bg-white/15 backdrop-blur-md active:scale-90"
        >
          <X className="h-4 w-4" />
        </button>
      </div>

      {/* tap zones */}
      <button
        aria-label="Previous"
        onClick={prev}
        className="absolute inset-y-14 left-0 w-1/3 cursor-default"
      />
      <button
        aria-label="Next"
        onClick={next}
        className="absolute inset-y-14 right-0 w-1/3 cursor-default"
      />

      {moment.kind !== "text" && moment.text.trim() && (
        <p className="pointer-events-none absolute inset-x-4 bottom-14 text-center font-display text-lg font-bold drop-shadow-lg">
          {moment.text}
        </p>
      )}

      <Link
        to="/moment/$momentId"
        params={{ momentId: moment.id }}
        onClick={onClose}
        className="absolute inset-x-0 bottom-3 mx-auto w-fit rounded-full bg-white/15 px-4 py-1.5 text-[12px] font-semibold backdrop-blur-md"
      >
        View insights
      </Link>
    </div>
  );
}

export const Stories = memo(StoriesBase);
