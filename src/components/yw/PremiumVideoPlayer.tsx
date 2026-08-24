import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  Volume2, VolumeX, Maximize, Minimize, Settings, PictureInPicture2,
  Lock, Unlock, RotateCw, Repeat, Sun, Gauge, MonitorPlay, RotateCcw,
  Subtitles, Languages, ChevronLeft,
} from "lucide-react";
import { cn } from "@/lib/utils";

type Props = {
  src: string;
  poster?: string | null;
  title?: string;
  portrait?: boolean;
  autoPlay?: boolean;
  className?: string;
  onOrientationChange?: (portrait: boolean) => void;
};

const SPEEDS = [0.25, 0.5, 0.75, 1, 1.25, 1.5, 1.75, 2];
const FITS = ["Fit", "Fill", "Stretch"] as const;

function fmt(t: number) {
  if (!Number.isFinite(t)) return "0:00";
  const s = Math.floor(t % 60);
  const m = Math.floor(t / 60) % 60;
  const h = Math.floor(t / 3600);
  const mm = h ? String(m).padStart(2, "0") : String(m);
  return `${h ? `${h}:` : ""}${mm}:${String(s).padStart(2, "0")}`;
}

/** Premium player: YouTube-style controls + MX Player gestures (seek, volume, brightness, lock, fit). */
export function PremiumVideoPlayer({ src, poster, title, portrait, autoPlay, className, onOrientationChange }: Props) {
  const wrapRef = useRef<HTMLDivElement | null>(null);
  const vidRef = useRef<HTMLVideoElement | null>(null);

  const [playing, setPlaying] = useState(!!autoPlay);
  const [muted, setMuted] = useState(false);
  const [volume, setVolume] = useState(1);
  const [brightness, setBrightness] = useState(1);
  const [time, setTime] = useState(0);
  const [dur, setDur] = useState(0);
  const [buffered, setBuffered] = useState(0);
  const [speed, setSpeed] = useState(1);
  const [quality, setQuality] = useState("Auto");
  const [sourceHeight, setSourceHeight] = useState(0);
  const [fit, setFit] = useState<(typeof FITS)[number]>("Fill");
  const [loop, setLoop] = useState(false);
  const [locked, setLocked] = useState(false);
  const [fullscreen, setFullscreen] = useState(false);
  const [showUI, setShowUI] = useState(true);
  const [menu, setMenu] = useState<null | "root" | "speed" | "quality" | "fit" | "captions" | "audio">(null);
  const [toastMsg, setToastMsg] = useState<string | null>(null);
  const [viewPortrait, setViewPortrait] = useState(!!portrait);
  const [captionTracks, setCaptionTracks] = useState<Array<{ index: number; label: string }>>([]);
  const [caption, setCaption] = useState("Off");
  const [audioTracks, setAudioTracks] = useState<Array<{ index: number; label: string }>>([]);
  const [audio, setAudio] = useState("Original");

  const hideTimer = useRef<number | null>(null);
  const gesture = useRef<{ x: number; y: number; mode: null | "seek" | "vol" | "bright"; t0: number } | null>(null);
  const lastTap = useRef(0);

  const flash = useCallback((m: string) => {
    setToastMsg(m);
    window.setTimeout(() => setToastMsg((c) => (c === m ? null : c)), 700);
  }, []);

  const poke = useCallback(() => {
    setShowUI(true);
    if (hideTimer.current) window.clearTimeout(hideTimer.current);
    hideTimer.current = window.setTimeout(() => setShowUI(false), 2800);
  }, []);

  useEffect(() => () => { if (hideTimer.current) window.clearTimeout(hideTimer.current); }, []);

  const toggle = useCallback(() => {
    const v = vidRef.current;
    if (!v) return;
    if (v.paused) void v.play(); else v.pause();
  }, []);

  const seekBy = useCallback((d: number) => {
    const v = vidRef.current;
    if (!v) return;
    v.currentTime = Math.max(0, Math.min(v.duration || 0, v.currentTime + d));
    flash(`${d > 0 ? "+" : ""}${d}s`);
  }, [flash]);

  useEffect(() => {
    const v = vidRef.current;
    if (v) { v.playbackRate = speed; v.volume = volume; v.muted = muted; v.loop = loop; }
  }, [speed, volume, muted, loop]);

  useEffect(() => {
    const onFs = () => setFullscreen(!!document.fullscreenElement);
    document.addEventListener("fullscreenchange", onFs);
    return () => document.removeEventListener("fullscreenchange", onFs);
  }, []);

  const toggleFullscreen = async () => {
    const el = wrapRef.current;
    if (!el) return;
    try {
      if (document.fullscreenElement) await document.exitFullscreen();
      else await el.requestFullscreen();
    } catch { /* ignore */ }
  };

  const togglePip = async () => {
    const v = vidRef.current as (HTMLVideoElement & { requestPictureInPicture?: () => Promise<unknown> }) | null;
    if (!v?.requestPictureInPicture) { flash("PiP not supported"); return; }
    try {
      if (document.pictureInPictureElement) await document.exitPictureInPicture();
      else await v.requestPictureInPicture();
    } catch { flash("PiP not supported"); }
  };

  const rotate = () => {
    const next = !viewPortrait;
    setViewPortrait(next);
    onOrientationChange?.(next);
    setMenu(null);
    flash(next ? "Portrait" : "Landscape");
  };

  const readMediaTracks = useCallback(() => {
    const video = vidRef.current;
    if (!video) return;
    const captions = Array.from(video.textTracks).map((track, index) => ({
      index,
      label: track.label || track.language || `Captions ${index + 1}`,
    }));
    setCaptionTracks(captions);
    const tracks = (video as HTMLVideoElement & {
      audioTracks?: ArrayLike<{ label?: string; language?: string; enabled: boolean }>;
    }).audioTracks;
    const availableAudio = tracks
      ? Array.from(tracks).map((track, index) => ({
          index,
          label: track.label || track.language || `Audio ${index + 1}`,
        }))
      : [];
    setAudioTracks(availableAudio);
    const activeAudio = tracks ? Array.from(tracks).find((track) => track.enabled) : undefined;
    setAudio(activeAudio?.label || activeAudio?.language || "Original");
  }, []);

  const pickCaption = (value: string) => {
    const video = vidRef.current;
    if (!video) return;
    Array.from(video.textTracks).forEach((track, index) => {
      track.mode = value !== "Off" && captionTracks[index]?.label === value ? "showing" : "disabled";
    });
    setCaption(value);
    setMenu(null);
    flash(value === "Off" ? "Captions off" : `Captions · ${value}`);
  };

  const pickAudio = (value: string) => {
    const video = vidRef.current as (HTMLVideoElement & {
      audioTracks?: ArrayLike<{ label?: string; language?: string; enabled: boolean }>;
    }) | null;
    if (!video?.audioTracks) {
      setMenu(null);
      flash("Original audio");
      return;
    }
    Array.from(video.audioTracks).forEach((track, index) => {
      track.enabled = audioTracks[index]?.label === value;
    });
    setAudio(value);
    setMenu(null);
    flash(`Audio · ${value}`);
  };

  // ---- gestures (MX Player style) ----
  const onPointerDown = (e: React.PointerEvent) => {
    if (locked) return;
    gesture.current = { x: e.clientX, y: e.clientY, mode: null, t0: vidRef.current?.currentTime ?? 0 };
  };
  const onPointerMove = (e: React.PointerEvent) => {
    const g = gesture.current;
    if (!g || locked) return;
    const dx = e.clientX - g.x;
    const dy = e.clientY - g.y;
    if (!g.mode) {
      if (Math.abs(dx) < 18 && Math.abs(dy) < 18) return;
      const rect = wrapRef.current?.getBoundingClientRect();
      const rightHalf = rect ? e.clientX - rect.left > rect.width / 2 : true;
      g.mode = Math.abs(dx) > Math.abs(dy) ? "seek" : rightHalf ? "vol" : "bright";
    }
    if (g.mode === "seek") {
      const v = vidRef.current;
      if (!v) return;
      const nt = Math.max(0, Math.min(v.duration || 0, g.t0 + dx / 6));
      v.currentTime = nt;
      flash(fmt(nt));
    } else if (g.mode === "vol") {
      const nv = Math.max(0, Math.min(1, volume - dy / 250));
      setVolume(nv); setMuted(nv === 0);
      flash(`Volume ${Math.round(nv * 100)}%`);
    } else {
      const nb = Math.max(0.25, Math.min(1.6, brightness - dy / 250));
      setBrightness(nb);
      flash(`Brightness ${Math.round(nb * 100)}%`);
    }
  };
  const onPointerUp = () => { gesture.current = null; };

  const onTapZone = (side: "l" | "c" | "r") => {
    if (locked) { poke(); return; }
    if (side === "c") {
      lastTap.current = 0;
      toggle();
      return;
    }
    const now = Date.now();
    if (now - lastTap.current < 300) { seekBy(side === "l" ? -10 : 10); lastTap.current = 0; }
    else { lastTap.current = now; window.setTimeout(() => { if (lastTap.current) { lastTap.current = 0; poke(); } }, 260); }
  };

  const progress = dur ? (time / dur) * 100 : 0;
  const qualityOptions = useMemo(() => {
    const standardHeights = [2160, 1440, 1080, 720, 480, 360, 240];
    const available = sourceHeight
      ? standardHeights.filter((height) => height <= sourceHeight)
      : [1080, 720, 480, 360];
    const sourceLabel = sourceHeight ? `Original · ${sourceHeight}p` : "Original";
    return ["Auto", sourceLabel, ...available.map((height) => `${height}p`)]
      .filter((option, index, options) => options.indexOf(option) === index);
  }, [sourceHeight]);

  return (
    <div
      ref={wrapRef}
      onMouseMove={poke}
      className={cn(
        "relative w-full overflow-hidden rounded-2xl bg-black select-none",
        viewPortrait ? "aspect-[9/16]" : "aspect-video",
        className,
      )}
    >
      <video
        ref={vidRef}
        src={src}
        poster={poster ?? undefined}
        autoPlay={autoPlay}
        playsInline
        preload="metadata"
        style={{ filter: `brightness(${brightness})` }}
        className={cn(
          "h-full w-full",
          fit === "Fit" ? "object-contain" : fit === "Fill" ? "object-cover" : "object-fill",
        )}
        onPlay={() => { setPlaying(true); poke(); }}
        onPause={() => { setPlaying(false); setShowUI(true); }}
        onLoadedMetadata={(e) => {
          const video = e.currentTarget;
          setDur(video.duration || 0);
          setSourceHeight(video.videoHeight || 0);
          readMediaTracks();
        }}
        onTimeUpdate={(e) => {
          const v = e.currentTarget;
          setTime(v.currentTime);
          if (v.buffered.length) setBuffered(v.buffered.end(v.buffered.length - 1));
        }}
      />

      {/* gesture surface */}
      <div
        className="absolute inset-0 flex"
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={onPointerUp}
      >
        <div className="h-full flex-1" onClick={() => onTapZone("l")} />
        <div className="h-full flex-1" onClick={() => onTapZone("c")} />
        <div className="h-full flex-1" onClick={() => onTapZone("r")} />
      </div>

      {toastMsg && (
        <div className="pointer-events-none absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 rounded-xl bg-black/70 px-3 py-1.5 text-sm font-semibold text-white backdrop-blur">
          {toastMsg}
        </div>
      )}

      {/* lock overlay */}
      {locked && (
        <button
          onClick={() => { setLocked(false); flash("Unlocked"); }}
          className="absolute left-3 top-1/2 z-30 -translate-y-1/2 grid h-11 w-11 place-items-center rounded-full bg-black/60 text-white backdrop-blur"
          aria-label="Unlock controls"
        >
          <Lock size={18} />
        </button>
      )}

      {!locked && (
        <div
          className={cn(
            "pointer-events-none absolute inset-0 z-20 transition-opacity duration-200",
            showUI || !playing ? "opacity-100" : "opacity-0",
          )}
        >
          {/* top bar */}
          <div className="pointer-events-auto flex items-start justify-between gap-2 bg-gradient-to-b from-black/80 to-transparent p-3">
            <p className="line-clamp-1 pt-1 text-xs font-semibold text-white/90">{title}</p>
            <div className="flex items-center gap-1">
              <IconBtn label="Lock screen" onClick={() => { setLocked(true); flash("Locked"); }}><Unlock size={16} /></IconBtn>
              <IconBtn label="Rotate" onClick={rotate}><RotateCw size={16} /></IconBtn>
              <IconBtn label="Picture in picture" onClick={togglePip}><PictureInPicture2 size={16} /></IconBtn>
              <IconBtn label="Settings" onClick={() => setMenu(menu ? null : "root")}><Settings size={16} /></IconBtn>
            </div>
          </div>

          {/* bottom bar */}
          <div className="pointer-events-auto absolute inset-x-0 bottom-0 space-y-2 bg-gradient-to-t from-black/90 to-transparent px-3 pb-3 pt-8">
            <div className="relative h-4">
              <div className="absolute inset-x-0 top-1.5 h-1 rounded-full bg-white/25">
                <div className="h-full rounded-full bg-white/40" style={{ width: `${dur ? (buffered / dur) * 100 : 0}%` }} />
              </div>
              <div
                className="absolute top-1.5 h-1 rounded-full bg-gradient-to-r from-pink-500 to-purple-500"
                style={{ width: `${progress}%` }}
              />
              <div
                className="absolute top-0 h-4 w-4 -translate-x-1/2 rounded-full border-2 border-white bg-pink-500 shadow"
                style={{ left: `${progress}%` }}
              />
              <input
                type="range"
                min={0}
                max={dur || 0}
                step={0.1}
                value={time}
                aria-label="Seek"
                onChange={(e) => {
                  const v = vidRef.current;
                  if (v) { v.currentTime = Number(e.target.value); setTime(Number(e.target.value)); }
                }}
                className="absolute inset-0 h-4 w-full cursor-pointer opacity-0"
              />
            </div>

            <div className="flex items-center justify-between text-[11px] font-semibold text-white/85">
              <div className="flex items-center gap-3">
                <button onClick={() => { setMuted((m) => !m); }} aria-label="Mute">
                  {muted || volume === 0 ? <VolumeX size={16} /> : <Volume2 size={16} />}
                </button>
                <span className="tabular-nums">{fmt(time)} / {fmt(dur)}</span>
              </div>
              <div className="flex items-center gap-3">
                <button onClick={() => setLoop((l) => !l)} aria-label="Loop">
                  <Repeat size={16} className={loop ? "text-pink-400" : ""} />
                </button>
                <button onClick={toggleFullscreen} aria-label="Fullscreen">
                  {fullscreen ? <Minimize size={16} /> : <Maximize size={16} />}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* settings sheet */}
      {menu && !locked && (
        <div className="absolute inset-0 z-30 flex items-end bg-black/50 backdrop-blur-sm" onClick={() => setMenu(null)}>
          <div
            className="max-h-full w-full overflow-y-auto rounded-t-3xl border-t border-white/10 bg-zinc-950/95 p-3 text-white"
            onClick={(e) => e.stopPropagation()}
          >
            {menu === "root" && (
              <div className="space-y-1">
                <Row icon={<Gauge size={16} />} label="Playback speed" value={`${speed}x`} onClick={() => setMenu("speed")} />
                <Row icon={<MonitorPlay size={16} />} label="Quality" value={quality} onClick={() => setMenu("quality")} />
                <Row icon={<Subtitles size={16} />} label="Captions" value={caption} onClick={() => setMenu("captions")} />
                <Row icon={<Languages size={16} />} label="Audio track" value={audio} onClick={() => setMenu("audio")} />
                <Row icon={<Maximize size={16} />} label="Screen fit" value={fit} onClick={() => setMenu("fit")} />
                <Row icon={<Sun size={16} />} label="Brightness" value={`${Math.round(brightness * 100)}%`} onClick={() => setBrightness((b) => (b >= 1.6 ? 0.5 : b + 0.25))} />
                <Row icon={<Repeat size={16} />} label="Loop" value={loop ? "On" : "Off"} onClick={() => setLoop((l) => !l)} />
                <Row icon={<RotateCcw size={16} />} label="Restart" value="" onClick={() => { const v = vidRef.current; if (v) v.currentTime = 0; setMenu(null); }} />
              </div>
            )}
            {menu === "speed" && (
              <OptionList
                title="Playback speed"
                options={SPEEDS.map((s) => `${s}x`)}
                active={`${speed}x`}
                onPick={(o) => { setSpeed(parseFloat(o)); setMenu(null); flash(`${o}`); }}
              />
            )}
            {menu === "quality" && (
              <OptionList
                title="Quality"
                options={qualityOptions}
                active={quality}
                onPick={(option) => {
                  setQuality(option);
                  setMenu("root");
                  flash(`Quality · ${option}`);
                }}
                onBack={() => setMenu("root")}
              />
            )}
            {menu === "fit" && (
              <OptionList
                title="Screen fit"
                options={[...FITS]}
                active={fit}
                onPick={(o) => { setFit(o as (typeof FITS)[number]); setMenu(null); }}
              />
            )}
            {menu === "captions" && (
              <OptionList
                title="Captions"
                options={["Off", ...captionTracks.map((track) => track.label)]}
                active={caption}
                onPick={pickCaption}
                emptyHint={captionTracks.length === 0 ? "This video has no caption tracks" : undefined}
              />
            )}
            {menu === "audio" && (
              <OptionList
                title="Audio track"
                options={audioTracks.length ? audioTracks.map((track) => track.label) : ["Original"]}
                active={audio}
                onPick={pickAudio}
                emptyHint={audioTracks.length === 0 ? "No alternate language track was uploaded" : undefined}
              />
            )}
          </div>
        </div>
      )}
    </div>
  );
}

function IconBtn({ children, label, onClick, big }: { children: React.ReactNode; label: string; onClick: () => void; big?: boolean }) {
  return (
    <button
      onClick={onClick}
      aria-label={label}
      className={cn(
        "grid place-items-center rounded-full bg-black/45 text-white backdrop-blur transition-transform active:scale-90",
        big ? "h-11 w-11" : "h-8 w-8",
      )}
    >
      {children}
    </button>
  );
}

function Row({ icon, label, value, onClick }: { icon: React.ReactNode; label: string; value: string; onClick: () => void }) {
  return (
    <button onClick={onClick} className="flex w-full items-center gap-3 rounded-xl px-3 py-3 text-left text-sm hover:bg-white/5">
      <span className="text-zinc-400">{icon}</span>
      <span className="flex-1 font-medium">{label}</span>
      <span className="text-xs text-zinc-400">{value}</span>
    </button>
  );
}

function OptionList({ title, options, active, onPick, emptyHint, onBack }: { title: string; options: string[]; active: string; onPick: (o: string) => void; emptyHint?: string; onBack?: () => void }) {
  return (
    <div className="space-y-1">
      <div className="flex items-center gap-1 px-1 pb-1 pt-1">
        {onBack && (
          <button type="button" onClick={onBack} aria-label="Back to settings" className="grid h-8 w-8 place-items-center rounded-full text-zinc-300 hover:bg-white/10">
            <ChevronLeft size={18} />
          </button>
        )}
        <p className="px-2 text-xs font-bold uppercase tracking-wide text-zinc-400">{title}</p>
      </div>
      {emptyHint && <p className="px-3 pb-2 text-xs text-zinc-500">{emptyHint}</p>}
      {options.map((o) => (
        <button
          key={o}
          onClick={() => onPick(o)}
          className={cn(
            "flex w-full items-center justify-between rounded-xl px-3 py-2.5 text-sm hover:bg-white/5",
            o === active && "bg-white/10 font-bold text-pink-400",
          )}
        >
          {o}
          {o === active && <span className="text-xs">✓</span>}
        </button>
      ))}
    </div>
  );
}
