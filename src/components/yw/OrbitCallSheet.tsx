import { useEffect, useRef, useState } from "react";
import {
  Mic,
  MicOff,
  PhoneOff,
  Video,
  VideoOff,
  SwitchCamera,
  ShieldCheck,
  Eye,
  EyeOff,
} from "lucide-react";
import { Sheet, SheetContent } from "@/components/ui/sheet";
import { cn } from "@/lib/utils";

export type OrbitCallMode = "voice" | "video";

/**
 * Orbit call surface. Media is captured only while the sheet is open and every
 * track is stopped the moment the call ends — nothing is recorded or stored.
 */
export function OrbitCallSheet({
  mode,
  peerName,
  peerPhoto,
  onClose,
}: {
  mode: OrbitCallMode | null;
  peerName: string;
  peerPhoto: string;
  onClose: () => void;
}) {
  const open = mode !== null;
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const [muted, setMuted] = useState(false);
  const [camOff, setCamOff] = useState(false);
  const [blurFace, setBlurFace] = useState(true);
  const [facing, setFacing] = useState<"user" | "environment">("user");
  const [status, setStatus] = useState("Connecting…");
  const [seconds, setSeconds] = useState(0);

  useEffect(() => {
    if (!open) return;
    let cancelled = false;

    (async () => {
      try {
        const hiRes: MediaTrackConstraints = {
          facingMode: facing,
          width: { ideal: 3840, max: 3840 },
          height: { ideal: 2160, max: 2160 },
          frameRate: { ideal: 60, max: 60 },
        };
        let stream: MediaStream;
        try {
          stream = await navigator.mediaDevices.getUserMedia({
            audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: true },
            video: mode === "video" ? hiRes : false,
          });
        } catch {
          stream = await navigator.mediaDevices.getUserMedia({
            audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: true },
            video:
              mode === "video"
                ? {
                    facingMode: facing,
                    width: { ideal: 1920 },
                    height: { ideal: 1080 },
                    frameRate: { ideal: 30 },
                  }
                : false,
          });
        }
        if (cancelled) {
          stream.getTracks().forEach((t) => t.stop());
          return;
        }
        streamRef.current = stream;
        if (videoRef.current) videoRef.current.srcObject = stream;
        setStatus("Ringing…");
        window.setTimeout(() => !cancelled && setStatus("Connected"), 1200);
      } catch {
        if (!cancelled) setStatus("Permission declined — nothing was shared");
      }
    })();

    return () => {
      cancelled = true;
      streamRef.current?.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
    };
  }, [open, mode, facing]);

  useEffect(() => {
    if (!open) {
      setSeconds(0);
      setStatus("Connecting…");
      setBlurFace(true);
      return;
    }
    const id = window.setInterval(() => setSeconds((s) => s + 1), 1000);
    return () => window.clearInterval(id);
  }, [open]);

  const toggleMute = () => {
    const next = !muted;
    setMuted(next);
    streamRef.current?.getAudioTracks().forEach((t) => (t.enabled = !next));
  };

  const toggleCam = () => {
    const next = !camOff;
    setCamOff(next);
    streamRef.current?.getVideoTracks().forEach((t) => (t.enabled = !next));
  };

  const clock = `${String(Math.floor(seconds / 60)).padStart(2, "0")}:${String(seconds % 60).padStart(2, "0")}`;

  return (
    <Sheet open={open} onOpenChange={(o) => !o && onClose()}>
      <SheetContent
        side="bottom"
        className="h-[92dvh] rounded-t-3xl border-border/60 p-0 [&>button]:hidden"
      >
        <ScreenFlashOverlay active={fx.flashing} />
        <div className="relative flex h-full flex-col items-center justify-between overflow-hidden px-5 pb-8 pt-8">
          {mode === "video" && (
            <video
              ref={videoRef}
              autoPlay
              playsInline
              muted
              className={cn(
                "absolute inset-0 h-full w-full object-cover opacity-90",
                blurFace && "blur-2xl scale-110",
                !blurFace && maskClass(fx.mask),
                camOff && "hidden",
              )}
            />
          )}
          {mode === "video" && !blurFace && !camOff && <ArMaskOverlay mask={fx.mask} />}
          {mode === "video" && fx.dual && !camOff && (
            <video
              ref={pipRef}
              autoPlay
              playsInline
              muted
              className="absolute right-4 top-16 z-10 h-32 w-[5.5rem] rounded-2xl border border-border/60 object-cover shadow-2xl"
            />
          )}

          {mode === "video" && blurFace && !camOff && (
            <div className="absolute left-1/2 top-4 z-10 -translate-x-1/2 rounded-full bg-background/70 px-3 py-1.5 text-[11px] text-muted-foreground backdrop-blur">
              Face blurred · tap the eye to reveal
            </div>
          )}

          <div className="relative z-10 flex flex-col items-center text-center">
            <img
              src={peerPhoto}
              alt={peerName}
              className="h-24 w-24 rounded-full object-cover shadow-lg"
            />
            <h2 className="pt-4 font-display text-xl font-bold">{peerName}</h2>
            <p className="pt-1 text-sm text-muted-foreground">
              {status === "Connected" ? clock : status}
            </p>
            <p className="mt-3 flex items-center gap-1.5 rounded-full bg-background/70 px-3 py-1.5 text-[11px] text-muted-foreground backdrop-blur">
              <ShieldCheck className="h-3.5 w-3.5" strokeWidth={1.8} />
              {mode === "video" ? "Video call" : "Voice call"} · connections only · nothing recorded
            </p>
          </div>

          <div className="relative z-10 flex w-full flex-col items-center gap-4">
            <CaptureFxBar fx={fx} className="justify-center" />
            {fx.viewOnce > 0 && (
              <span className="rounded-full bg-background/70 px-3 py-1.5 text-[11px] text-muted-foreground backdrop-blur">
                View once · {fx.viewOnce}s
              </span>
            )}
            <div className="flex items-center gap-3">
            <CallBtn onClick={toggleMute} label={muted ? "Unmute" : "Mute"}>
              {muted ? <MicOff className="h-5 w-5" /> : <Mic className="h-5 w-5" />}
            </CallBtn>
            {mode === "video" && (
              <>
                <CallBtn
                  onClick={() => setBlurFace((b) => !b)}
                  label={blurFace ? "Unblur face" : "Blur face"}
                  active={blurFace}
                >
                  {blurFace ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                </CallBtn>
                <CallBtn onClick={toggleCam} label={camOff ? "Camera on" : "Camera off"}>
                  {camOff ? <VideoOff className="h-5 w-5" /> : <Video className="h-5 w-5" />}
                </CallBtn>
                <CallBtn
                  onClick={() => setFacing((f) => (f === "user" ? "environment" : "user"))}
                  label="Switch camera"
                >
                  <SwitchCamera className="h-5 w-5" />
                </CallBtn>
              </>
            )}
            <button
              type="button"
              onClick={onClose}
              aria-label="End call"
              className="grid h-14 w-14 place-items-center rounded-full bg-[oklch(0.58_0.21_25)] text-white transition-transform active:scale-90"
            >
              <PhoneOff className="h-5 w-5" strokeWidth={2} />
            </button>
            </div>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}

function CallBtn({
  onClick,
  label,
  children,
  active,
}: {
  onClick: () => void;
  label: string;
  children: React.ReactNode;
  active?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={label}
      aria-pressed={active}
      className={cn(
        "grid h-12 w-12 place-items-center rounded-full backdrop-blur transition-transform active:scale-90",
        active ? "bg-foreground text-background" : "bg-secondary/80",
      )}
    >
      {children}
    </button>
  );
}