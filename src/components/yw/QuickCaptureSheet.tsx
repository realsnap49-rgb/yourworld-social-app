import { useCallback, useEffect, useRef, useState } from "react";
import { X, Circle, SwitchCamera } from "lucide-react";
import { Sheet, SheetContent } from "@/components/ui/sheet";
import {
  ArMaskOverlay,
  CaptureFxBar,
  ScreenFlashOverlay,
  maskClass,
  useCaptureFx,
  type CaptureFx,
} from "@/lib/capture-fx";
import { cn } from "@/lib/utils";

export type CaptureResult = { url: string; viewOnce: number };

/**
 * Camera capture surface with front screen-flash, back LED flash, view-once
 * timer, AR privacy masks and dual-camera (front + back) capture.
 */
export function QuickCaptureSheet({
  open,
  onOpenChange,
  onCapture,
  fx: externalFx,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  onCapture: (result: CaptureResult) => void;
  fx?: CaptureFx;
}) {
  const mainRef = useRef<HTMLVideoElement | null>(null);
  const pipRef = useRef<HTMLVideoElement | null>(null);
  const mainStream = useRef<MediaStream | null>(null);
  const pipStream = useRef<MediaStream | null>(null);
  const [facing, setFacing] = useState<"user" | "environment">("user");
  const [error, setError] = useState<string | null>(null);
  const localFx = useCaptureFx(() => mainStream.current);
  const fx = externalFx ?? localFx;

  useEffect(() => {
    fx.bindStream(() => mainStream.current);
    return () => fx.bindStream(null);
  }, [fx]);

  const stopAll = useCallback(() => {
    mainStream.current?.getTracks().forEach((t) => t.stop());
    pipStream.current?.getTracks().forEach((t) => t.stop());
    mainStream.current = null;
    pipStream.current = null;
  }, []);

  useEffect(() => {
    if (!open) {
      stopAll();
      return;
    }
    let cancelled = false;
    (async () => {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: facing, width: { ideal: 1920 }, height: { ideal: 1080 } },
          audio: false,
        });
        if (cancelled) return stream.getTracks().forEach((t) => t.stop());
        mainStream.current = stream;
        if (mainRef.current) mainRef.current.srcObject = stream;
        setError(null);
      } catch {
        if (!cancelled) setError("Camera permission declined");
      }
    })();
    return () => {
      cancelled = true;
      stopAll();
    };
  }, [open, facing, stopAll]);

  // Second camera for dual capture.
  useEffect(() => {
    if (!open || !fx.dual) {
      pipStream.current?.getTracks().forEach((t) => t.stop());
      pipStream.current = null;
      return;
    }
    let cancelled = false;
    (async () => {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: facing === "user" ? "environment" : "user" },
          audio: false,
        });
        if (cancelled) return stream.getTracks().forEach((t) => t.stop());
        pipStream.current = stream;
        if (pipRef.current) pipRef.current.srcObject = stream;
      } catch {
        /* single-camera device — dual capture falls back to one frame */
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [open, fx.dual, facing]);

  const capture = async () => {
    await fx.fireScreenFlash();
    const video = mainRef.current;
    if (!video || !video.videoWidth) return;
    const canvas = document.createElement("canvas");
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    if (fx.mask === "blur") ctx.filter = "blur(24px)";
    else if (fx.mask === "pixel") ctx.filter = "blur(8px) contrast(1.25) saturate(1.5)";
    else if (fx.mask === "glow") ctx.filter = "brightness(1.25) saturate(2) contrast(1.25)";
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
    ctx.filter = "none";

    if (fx.mask === "eyes") {
      ctx.fillStyle = "#000";
      ctx.fillRect(canvas.width * 0.27, canvas.height * 0.34, canvas.width * 0.46, canvas.height * 0.09);
    }

    const pip = pipRef.current;
    if (fx.dual && pip?.videoWidth) {
      const w = canvas.width * 0.28;
      const h = (w * pip.videoHeight) / pip.videoWidth;
      const x = canvas.width - w - canvas.width * 0.04;
      const y = canvas.height * 0.04;
      ctx.save();
      ctx.strokeStyle = "rgba(255,255,255,0.9)";
      ctx.lineWidth = Math.max(2, canvas.width * 0.004);
      ctx.drawImage(pip, x, y, w, h);
      ctx.strokeRect(x, y, w, h);
      ctx.restore();
    }

    onCapture({ url: canvas.toDataURL("image/jpeg", 0.92), viewOnce: fx.viewOnce });
    onOpenChange(false);
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="bottom" className="h-[86dvh] rounded-t-3xl border-border/60 p-0 [&>button]:hidden">
        <ScreenFlashOverlay active={fx.flashing} />
        <div className="relative flex h-full flex-col">
          <div className="relative flex-1 overflow-hidden rounded-t-3xl bg-black">
            <video
              ref={mainRef}
              autoPlay
              playsInline
              muted
              className={cn("h-full w-full object-cover", maskClass(fx.mask))}
            />
            <ArMaskOverlay mask={fx.mask} />
            {fx.dual && (
              <video
                ref={pipRef}
                autoPlay
                playsInline
                muted
                className="absolute right-4 top-4 h-36 w-24 rounded-2xl border-2 border-white/80 object-cover shadow-2xl"
              />
            )}
            {error && (
              <p className="absolute inset-x-0 top-1/2 text-center text-sm text-white/80">{error}</p>
            )}
            <button
              type="button"
              onClick={() => onOpenChange(false)}
              aria-label="Close camera"
              className="absolute left-4 top-4 grid h-9 w-9 place-items-center rounded-full bg-background/70 backdrop-blur"
            >
              <X className="h-4 w-4" />
            </button>
            {fx.viewOnce > 0 && (
              <span className="absolute bottom-4 left-1/2 -translate-x-1/2 rounded-full bg-background/70 px-3 py-1.5 text-[11px] backdrop-blur">
                View once · disappears after {fx.viewOnce}s
              </span>
            )}
          </div>

          <div className="flex items-center justify-between gap-3 px-4 py-4">
            <CaptureFxBar fx={fx} />
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={() => setFacing((f) => (f === "user" ? "environment" : "user"))}
                aria-label="Switch camera"
                className="grid h-9 w-9 place-items-center rounded-full bg-secondary/70 transition-transform active:scale-90"
              >
                <SwitchCamera className="h-[17px] w-[17px]" strokeWidth={1.7} />
              </button>
              <button
                type="button"
                onClick={capture}
                aria-label="Capture photo"
                className="grid h-14 w-14 place-items-center rounded-full brand-gradient transition-transform active:scale-90"
              >
                <Circle className="h-6 w-6 text-primary-foreground" strokeWidth={2} />
              </button>
            </div>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}
