import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  Volume2, VolumeX, Maximize, Minimize, Settings, Cast,
  Lock, Unlock, Repeat, Gauge, MonitorPlay,
  Subtitles, Languages, ChevronLeft, Check, Sun,
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
  /** Fullscreen-only swipe to the next/previous video of the same orientation. */
  onSwipeQueue?: (dir: 1 | -1, portrait: boolean) => void;
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
export function PremiumVideoPlayer({ src, poster, title, portrait, autoPlay, className, onOrientationChange, onSwipeQueue }: Props) {
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
  const [menu, setMenu] = useState<null | "root" | "speed" | "quality" | "captions" | "audio">(null);
  const [toastMsg, setToastMsg] = useState<string | null>(null);
  const [viewPortrait] = useState(!!portrait);
  const [captionTracks, setCaptionTracks] = useState<Array<{ index: number; label: string }>>([]);
  const [caption, setCaption] = useState("Off");
  const [audioTracks, setAudioTracks] = useState<Array<{ index: number; label: string }>>([]);
  const [audio, setAudio] = useState("Original");

  const hideTimer = useRef<number | null>(null);
  const gesture = useRef<{ x: number; y: number; mode: null | "seek" | "vol" | "bright" | "queue"; t0: number; dy: number } | null>(null);
  const lastTap = useRef(0);

  // fullscreen-only: brightness slider + pinch zoom/pan
  const [showBrightBar, setShowBrightBar] = useState(false);
  const brightBarTimer = useRef<number | null>(null);
  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const pinch = useRef<{ dist: number; cx: number; cy: number; zoom: number; pan: { x: number; y: number } } | null>(null);

  const flashBrightBar = useCallback(() => {
    setShowBrightBar(true);
    if (brightBarTimer.current) window.clearTimeout(brightBarTimer.current);
    brightBarTimer.current = window.setTimeout(() => setShowBrightBar(false), 900);
  }, []);

  useEffect(() => () => { if (brightBarTimer.current) window.clearTimeout(brightBarTimer.current); }, []);

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

  // Zoom/pan are fullscreen-only; reset to 100% fit when leaving fullscreen.
  useEffect(() => {
    if (!fullscreen) { setZoom(1); setPan({ x: 0, y: 0 }); pinch.current = null; }
  }, [fullscreen]);

  const toggleFullscreen = async () => {
    const el = wrapRef.current;
    if (!el) return;
    try {
      if (document.fullscreenElement) {
        await document.exitFullscreen();
        try { (screen.orientation as unknown as { unlock?: () => void }).unlock?.(); } catch { /* ignore */ }
      } else {
        await el.requestFullscreen();
        // Cinematic landscape mode for landscape videos (best-effort, mobile only).
        if (!viewPortrait) {
          try {
            await (screen.orientation as unknown as { lock?: (o: string) => Promise<void> }).lock?.("landscape");
          } catch { /* unsupported */ }
        }
      }
    } catch { /* ignore */ }
  };

  const cast = async () => {
    const v = vidRef.current as (HTMLVideoElement & { remote?: { prompt?: () => Promise<unknown> } }) | null;
    try {
      if (v?.remote?.prompt) { await v.remote.prompt(); return; }
      flash("Cast not supported");
    } catch { flash("Cast unavailable"); }
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
    gesture.current = { x: e.clientX, y: e.clientY, mode: null, t0: vidRef.current?.currentTime ?? 0, dy: 0 };
  };
  const onPointerMove = (e: React.PointerEvent) => {
    const g = gesture.current;
    if (!g || locked) return;
    const dx = e.clientX - g.x;
    const dy = e.clientY - g.y;
    g.dy = dy;
    if (pinch.current) return;
    if (!g.mode) {
      if (Math.abs(dx) < 18 && Math.abs(dy) < 18) return;
      const rect = wrapRef.current?.getBoundingClientRect();
      const rightHalf = rect ? e.clientX - rect.left > rect.width / 2 : true;
      const vertical = Math.abs(dy) >= Math.abs(dx);
      // Fullscreen: left half = brightness (MX Player), right half = queue paging / volume.
      g.mode = vertical
        ? fullscreen
          ? rightHalf
            ? onSwipeQueue ? "queue" : "vol"
            : "bright"
          : rightHalf ? "vol" : "bright"
        : "seek";
    }
    if (g.mode === "queue") {
      return;
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
      if (fullscreen) flashBrightBar(); else flash(`Brightness ${Math.round(nb * 100)}%`);
    }
  };
  const onPointerUp = () => {
    const g = gesture.current;
    gesture.current = null;
    if (g?.mode === "queue" && Math.abs(g.dy) > 90) {
      onSwipeQueue?.(g.dy < 0 ? 1 : -1, viewPortrait);
    }
  };

  // ---- fullscreen-only pinch to zoom (up to 300%) + two-finger pan ----
  const touchMid = (t: React.TouchList) => ({
    x: (t[0].clientX + t[1].clientX) / 2,
    y: (t[0].clientY + t[1].clientY) / 2,
    d: Math.hypot(t[0].clientX - t[1].clientX, t[0].clientY - t[1].clientY),
  });
  const onTouchStart = (e: React.TouchEvent) => {
    if (!fullscreen || locked || e.touches.length !== 2) return;
    const m = touchMid(e.touches);
    gesture.current = null;
    pinch.current = { dist: m.d || 1, cx: m.x, cy: m.y, zoom, pan };
  };
  const onTouchMove = (e: React.TouchEvent) => {
    const p = pinch.current;
    if (!p || !fullscreen || e.touches.length !== 2) return;
    e.preventDefault();
    const m = touchMid(e.touches);
    const next = Math.max(1, Math.min(3, p.zoom * (m.d / p.dist)));
    setZoom(next);
    const limit = (v: number) => Math.max(-400, Math.min(400, v));
    setPan({ x: limit(p.pan.x + (m.x - p.cx)), y: limit(p.pan.y + (m.y - p.cy)) });
  };
  const onTouchEnd = (e: React.TouchEvent) => {
    if (e.touches.length < 2) pinch.current = null;
    if (zoom <= 1.01) setPan({ x: 0, y: 0 });
  };

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
        "relative w-full overflow-hidden bg-black select-none",
        fullscreen
          ? "h-full w-full rounded-none"
          : cn("rounded-2xl", viewPortrait ? "aspect-[9/16]" : "aspect-video"),
        className,
      )}
    >
      <video
        ref={vidRef}
        src={src}
        poster={poster ?? undefined}
        autoPlay={autoPlay}
        playsInline
        preload="auto"
        style={{
          filter: `brightness(${brightness})`,
          transform: fullscreen && zoom > 1 ? `translate(${pan.x}px, ${pan.y}px) scale(${zoom})` : undefined,
          transformOrigin: "center center",
          transition: pinch.current ? "none" : "transform 120ms ease-out",
        }}
        className={cn(
          "h-full w-full",
          fullscreen
            ? "object-contain"
            : fit === "Fit" ? "object-contain" : fit === "Fill" ? "object-cover" : "object-fill",
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
        style={{ touchAction: fullscreen ? "none" : undefined }}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={onPointerUp}
        onTouchStart={onTouchStart}
        onTouchMove={onTouchMove}
        onTouchEnd={onTouchEnd}
        onTouchCancel={onTouchEnd}
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

      {/* fullscreen brightness slider (left side, MX Player style) */}
      {fullscreen && showBrightBar && !locked && (
        <div className="pointer-events-none absolute left-6 top-1/2 z-30 flex -translate-y-1/2 flex-col items-center gap-2 rounded-full bg-black/60 px-2 py-3 backdrop-blur">
          <Sun size={16} className="text-white" />
          <div className="relative h-32 w-1.5 overflow-hidden rounded-full bg-white/25">
            <div
              className="absolute bottom-0 w-full rounded-full bg-white transition-[height] duration-100"
              style={{ height: `${Math.round(((brightness - 0.25) / 1.35) * 100)}%` }}
            />
          </div>
          <span className="text-[10px] font-semibold tabular-nums text-white">{Math.round(brightness * 100)}%</span>
        </div>
      )}

      {/* zoom indicator */}
      {fullscreen && zoom > 1.01 && (
        <div className="pointer-events-none absolute right-4 top-1/2 z-30 -translate-y-1/2 rounded-full bg-black/60 px-2.5 py-1 text-[11px] font-semibold text-white backdrop-blur">
          {Math.round(zoom * 100)}%
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
          <div className="pointer-events-auto flex items-start justify-end gap-2 bg-gradient-to-b from-black/80 to-transparent p-3">
            <div className="flex items-center gap-1">
              <IconBtn label="Lock screen" onClick={() => { setLocked(true); flash("Locked"); }}><Unlock size={16} /></IconBtn>
              <IconBtn label="Cast" onClick={cast}><Cast size={16} /></IconBtn>
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

      {/* settings sheet — YouTube-style bottom sheet */}
      {menu && !locked && (
        <div
          className="fixed inset-0 z-50 flex items-end bg-black/60 backdrop-blur-sm"
          onClick={() => setMenu(null)}
        >
          <div
            className="relative max-h-[70vh] w-full overflow-y-auto rounded-t-[16px] bg-[#1f1f1f] text-white shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="sticky top-0 z-10 flex flex-col gap-2 bg-[#1f1f1f] px-4 pb-2 pt-3">
              <span className="mx-auto h-1.5 w-10 rounded-full bg-white/25" />
              <p className="text-sm font-medium text-white/90">{menu === "root" ? "Settings" : title || "Settings"}</p>
            </div>
            <div className="px-2 pb-4 pt-1">
            {menu === "root" && (
              <div className="space-y-0.5">
                <Row icon={<Gauge size={18} />} label="Playback speed" value={`${speed}x`} onClick={() => setMenu("speed")} />
                <Row icon={<MonitorPlay size={18} />} label="Quality" value={quality} onClick={() => setMenu("quality")} />
                <Row icon={<Subtitles size={18} />} label="Captions" value={caption} onClick={() => setMenu("captions")} />
                <Row icon={<Languages size={18} />} label="Audio track" value={audio} onClick={() => setMenu("audio")} />
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
    <button onClick={onClick} className="flex w-full items-center gap-4 px-4 py-3.5 text-left text-[15px] text-white transition-colors hover:bg-white/10">
      <span className="text-white/70">{icon}</span>
      <span className="flex-1 font-normal">{label}</span>
      <span className="text-sm text-white/60">{value}</span>
    </button>
  );
}

function OptionList({ title, options, active, onPick, emptyHint, onBack }: { title: string; options: string[]; active: string; onPick: (o: string) => void; emptyHint?: string; onBack?: () => void }) {
  return (
    <div className="space-y-0.5">
      <div className="flex items-center gap-2 px-4 pb-1 pt-2">
        {onBack && (
          <button type="button" onClick={onBack} aria-label="Back to settings" className="grid h-8 w-8 place-items-center rounded-full text-white/80 hover:bg-white/10">
            <ChevronLeft size={20} />
          </button>
        )}
        <p className="text-[15px] font-medium text-white">{title}</p>
      </div>
      {emptyHint && <p className="px-4 pb-2 text-xs text-white/50">{emptyHint}</p>}
      {options.map((o) => (
        <button
          key={o}
          onClick={() => onPick(o)}
          className={cn(
            "flex w-full items-center justify-between px-4 py-3 text-[15px] transition-colors hover:bg-white/10",
            o === active ? "text-white" : "text-white/90",
          )}
        >
          {o}
          {o === active && <span className="text-white"><Check size={18} /></span>}
        </button>
      ))}
    </div>
  );
}
