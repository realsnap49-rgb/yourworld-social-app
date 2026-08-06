import { useEffect, useRef, useState } from "react";
import { Mic, MicOff, PhoneOff, Video, VideoOff, SwitchCamera, Signal } from "lucide-react";
import { YwAvatar } from "@/components/yw/Avatar";
import type { User } from "@/lib/yw-data";
import { cn } from "@/lib/utils";
import {
  ArMaskOverlay,
  CaptureFxBar,
  ScreenFlashOverlay,
  maskClass,
  useCaptureFx,
} from "@/lib/capture-fx";

type Tier = { label: string; width: number; height: number; fps: number; bitrate: number };

// Adaptive ladder, highest first. The engine climbs/falls automatically.
const TIERS: Tier[] = [
  { label: "4K Ultra HD", width: 3840, height: 2160, fps: 60, bitrate: 24_000_000 },
  { label: "1440p", width: 2560, height: 1440, fps: 60, bitrate: 12_000_000 },
  { label: "1080p", width: 1920, height: 1080, fps: 60, bitrate: 6_000_000 },
  { label: "720p", width: 1280, height: 720, fps: 30, bitrate: 2_500_000 },
  { label: "540p", width: 960, height: 540, fps: 30, bitrate: 1_200_000 },
  { label: "360p", width: 640, height: 360, fps: 24, bitrate: 600_000 },
];

type NetInfo = { downlink?: number; effectiveType?: string; saveData?: boolean; addEventListener?: Function; removeEventListener?: Function };

const netInfo = (): NetInfo | undefined =>
  typeof navigator !== "undefined" ? (navigator as unknown as { connection?: NetInfo }).connection : undefined;

/** Best tier the current network + device can sustain. */
function ceilingIndex(): number {
  const net = netInfo();
  const cores = (typeof navigator !== "undefined" && navigator.hardwareConcurrency) || 4;
  const mbps = net?.downlink ?? 10;
  const eff = net?.effectiveType ?? "4g";

  if (net?.saveData) return 5;
  if (eff === "slow-2g" || eff === "2g") return 5;
  if (eff === "3g") return 4;

  let idx = 3; // 720p baseline
  if (mbps >= 30 && cores >= 8) idx = 0;
  else if (mbps >= 18 && cores >= 6) idx = 1;
  else if (mbps >= 8) idx = 2;
  else if (mbps >= 3) idx = 3;
  else idx = 4;
  return idx;
}

export function VideoCallSheet({ open, onClose, peer, title }: { open: boolean; onClose: () => void; peer: User; title: string }) {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const pipRef = useRef<HTMLVideoElement | null>(null);
  const pipStreamRef = useRef<MediaStream | null>(null);
  const tierRef = useRef<number>(3);
  const [tier, setTier] = useState<Tier>(TIERS[3]);
  const [actual, setActual] = useState<{ w: number; h: number; fps: number } | null>(null);
  const [muted, setMuted] = useState(false);
  const [camOff, setCamOff] = useState(false);
  const [facing, setFacing] = useState<"user" | "environment">("user");
  const [status, setStatus] = useState("Connecting…");
  const [seconds, setSeconds] = useState(0);
  const fx = useCaptureFx(() => streamRef.current);

  // Dual-camera: second stream shown as a picture-in-picture tile.
  useEffect(() => {
    if (!open || !fx.dual) {
      pipStreamRef.current?.getTracks().forEach((t) => t.stop());
      pipStreamRef.current = null;
      return;
    }
    let cancelled = false;
    (async () => {
      try {
        const s = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: facing === "user" ? "environment" : "user" },
          audio: false,
        });
        if (cancelled) return s.getTracks().forEach((t) => t.stop());
        pipStreamRef.current = s;
        if (pipRef.current) pipRef.current.srcObject = s;
      } catch {
        /* single-camera device */
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [open, fx.dual, facing]);

  // Start / stop the camera with the auto-negotiated tier.
  useEffect(() => {
    if (!open) return;
    let cancelled = false;

    const start = async () => {
      const startIdx = ceilingIndex();
      tierRef.current = startIdx;
      for (let i = startIdx; i < TIERS.length; i++) {
        const t = TIERS[i];
        try {
          const stream = await navigator.mediaDevices.getUserMedia({
            audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: true },
            video: {
              facingMode: facing,
              width: { ideal: t.width },
              height: { ideal: t.height },
              frameRate: { ideal: t.fps, max: t.fps },
            },
          });
          if (cancelled) {
            stream.getTracks().forEach((tr) => tr.stop());
            return;
          }
          streamRef.current = stream;
          tierRef.current = i;
          setTier(t);
          if (videoRef.current) videoRef.current.srcObject = stream;
          const s = stream.getVideoTracks()[0]?.getSettings();
          setActual({ w: s?.width ?? t.width, h: s?.height ?? t.height, fps: Math.round(s?.frameRate ?? t.fps) });
          setStatus("Connected");
          return;
        } catch {
          // step down the ladder and retry
        }
      }
      if (!cancelled) setStatus("Camera unavailable");
    };

    start();
    return () => {
      cancelled = true;
      streamRef.current?.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
      setActual(null);
      setStatus("Connecting…");
      setSeconds(0);
    };
  }, [open, facing]);

  // Real-time adaptation: re-apply constraints as network / conditions shift.
  useEffect(() => {
    if (!open) return;
    const adapt = async () => {
      const track = streamRef.current?.getVideoTracks()[0];
      if (!track) return;
      const target = ceilingIndex();
      if (target === tierRef.current) return;
      const t = TIERS[target];
      try {
        await track.applyConstraints({
          width: { ideal: t.width },
          height: { ideal: t.height },
          frameRate: { ideal: t.fps, max: t.fps },
        });
        tierRef.current = target;
        setTier(t);
        const s = track.getSettings();
        setActual({ w: s.width ?? t.width, h: s.height ?? t.height, fps: Math.round(s.frameRate ?? t.fps) });
      } catch {
        /* keep current tier */
      }
    };

    const id = window.setInterval(adapt, 3000);
    const net = netInfo();
    net?.addEventListener?.("change", adapt);
    return () => {
      window.clearInterval(id);
      net?.removeEventListener?.("change", adapt);
    };
  }, [open]);

  useEffect(() => {
    if (!open || status !== "Connected") return;
    const id = window.setInterval(() => setSeconds((s) => s + 1), 1000);
    return () => window.clearInterval(id);
  }, [open, status]);

  useEffect(() => {
    const track = streamRef.current?.getAudioTracks()[0];
    if (track) track.enabled = !muted;
  }, [muted]);

  useEffect(() => {
    const track = streamRef.current?.getVideoTracks()[0];
    if (track) track.enabled = !camOff;
  }, [camOff]);

  if (!open) return null;

  const clock = `${String(Math.floor(seconds / 60)).padStart(2, "0")}:${String(seconds % 60).padStart(2, "0")}`;
  const mbps = (tier.bitrate / 1_000_000).toFixed(1);

  return (
    <div className="fixed inset-0 z-[70] flex flex-col bg-background/95 backdrop-blur-xl">
      <ScreenFlashOverlay active={fx.flashing} />
      <div className="relative flex-1 overflow-hidden">
        {/* Remote placeholder */}
        <div className="absolute inset-0 grid place-items-center gap-4">
          <div className="flex flex-col items-center gap-3">
            <YwAvatar user={peer} size={96} />
            <p className="text-lg font-semibold">{title}</p>
            <p className="text-sm text-muted-foreground">{status === "Connected" ? clock : status}</p>
          </div>
        </div>

        {/* Adaptive quality badge */}
        <div className="absolute left-4 top-4 flex items-center gap-2 rounded-full border border-border bg-background/60 px-3 py-1.5 text-xs backdrop-blur-md">
          <Signal className="h-3.5 w-3.5 text-primary" strokeWidth={1.8} />
          <span className="font-medium">Auto · {tier.label}</span>
          <span className="text-muted-foreground">
            {actual ? `${actual.w}×${actual.h} · ${actual.fps}fps` : "negotiating"} · {mbps} Mbps
          </span>
        </div>

        {/* Self preview */}
        <div
          className={cn(
            "absolute bottom-4 right-4 h-44 w-28 overflow-hidden rounded-2xl border border-border shadow-2xl transition-opacity",
            camOff && "opacity-0",
          )}
        >
          <video
            ref={videoRef}
            autoPlay
            playsInline
            muted
            className={cn("h-full w-full object-cover", maskClass(fx.mask))}
          />
          <ArMaskOverlay mask={fx.mask} />
        </div>
        {fx.dual && (
          <video
            ref={pipRef}
            autoPlay
            playsInline
            muted
            className="absolute bottom-52 right-4 h-28 w-20 rounded-2xl border border-border object-cover shadow-2xl"
          />
        )}
        {fx.viewOnce > 0 && (
          <span className="absolute bottom-4 left-4 rounded-full border border-border bg-background/60 px-3 py-1.5 text-[11px] backdrop-blur-md">
            View once · {fx.viewOnce}s
          </span>
        )}
      </div>

      <div className="safe-bottom border-t border-border px-6 py-5">
        <CaptureFxBar fx={fx} className="justify-center pb-4" />
        <div className="flex items-center justify-center gap-4">
        <button
          aria-label={muted ? "Unmute" : "Mute"}
          onClick={() => setMuted((m) => !m)}
          className={cn("grid h-12 w-12 place-items-center rounded-full transition-transform active:scale-90", muted ? "bg-secondary" : "bg-secondary/60")}
        >
          {muted ? <MicOff className="h-5 w-5" strokeWidth={1.7} /> : <Mic className="h-5 w-5" strokeWidth={1.7} />}
        </button>
        <button
          aria-label={camOff ? "Turn camera on" : "Turn camera off"}
          onClick={() => setCamOff((c) => !c)}
          className="grid h-12 w-12 place-items-center rounded-full bg-secondary/60 transition-transform active:scale-90"
        >
          {camOff ? <VideoOff className="h-5 w-5" strokeWidth={1.7} /> : <Video className="h-5 w-5" strokeWidth={1.7} />}
        </button>
        <button
          aria-label="Switch camera"
          onClick={() => setFacing((f) => (f === "user" ? "environment" : "user"))}
          className="grid h-12 w-12 place-items-center rounded-full bg-secondary/60 transition-transform active:scale-90"
        >
          <SwitchCamera className="h-5 w-5" strokeWidth={1.7} />
        </button>
        <button
          aria-label="End call"
          onClick={onClose}
          className="grid h-14 w-14 place-items-center rounded-full bg-destructive transition-transform active:scale-90"
        >
          <PhoneOff className="h-5 w-5 text-destructive-foreground" strokeWidth={1.8} />
        </button>
        </div>
      </div>
    </div>
  );
}