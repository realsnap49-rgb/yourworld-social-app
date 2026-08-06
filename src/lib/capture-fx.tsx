import { useCallback, useRef, useState } from "react";
import {
  Sun,
  Zap,
  ZapOff,
  Timer,
  Sparkles,
  Layers,
  type LucideIcon,
} from "lucide-react";
import { cn } from "@/lib/utils";

/** AR privacy masks applied live over the camera preview. */
export type ArMask = "none" | "blur" | "pixel" | "eyes" | "glow";

export const AR_MASKS: { id: ArMask; label: string }[] = [
  { id: "none", label: "Off" },
  { id: "blur", label: "Soft blur" },
  { id: "pixel", label: "Pixelate" },
  { id: "eyes", label: "Eye bar" },
  { id: "glow", label: "Neon glow" },
];

/** View-once timer, in seconds. 0 = keep in chat. */
export type ViewOnceSeconds = 0 | 3 | 5 | 10;
export const VIEW_ONCE_STEPS: ViewOnceSeconds[] = [0, 3, 5, 10];

export function maskClass(mask: ArMask): string {
  switch (mask) {
    case "blur":
      return "blur-xl scale-110";
    case "pixel":
      return "blur-[6px] contrast-125 saturate-150 scale-105";
    case "glow":
      return "brightness-125 saturate-200 contrast-125 hue-rotate-15";
    default:
      return "";
  }
}

const wait = (ms: number) => new Promise((r) => window.setTimeout(r, ms));

type TorchTrack = MediaStreamTrack & {
  getCapabilities?: () => MediaTrackCapabilities & { torch?: boolean };
};

export type CaptureFx = ReturnType<typeof useCaptureFx>;

/**
 * Shared capture effects: front screen-flash, back LED (torch) flash,
 * view-once timer, AR privacy masks and dual-camera capture.
 * `getStream` lets the LED toggle reach the live camera track.
 */
export function useCaptureFx(getStream?: () => MediaStream | null) {
  const [screenFlash, setScreenFlash] = useState(false);
  const [led, setLed] = useState(false);
  const [viewOnce, setViewOnce] = useState<ViewOnceSeconds>(0);
  const [mask, setMask] = useState<ArMask>("none");
  const [dual, setDual] = useState(false);
  const [flashing, setFlashing] = useState(false);
  const busy = useRef(false);

  const toggleLed = useCallback(async () => {
    const next = !led;
    setLed(next);
    const track = getStream?.()?.getVideoTracks()[0] as TorchTrack | undefined;
    if (!track) return next;
    try {
      await track.applyConstraints({
        advanced: [{ torch: next }],
      } as unknown as MediaTrackConstraints);
    } catch {
      /* device has no LED — the toggle stays a visual preference */
    }
    return next;
  }, [led, getStream]);

  /** Fire the front screen-flash (white burst) before a capture. */
  const fireScreenFlash = useCallback(async () => {
    if (!screenFlash || busy.current) return;
    busy.current = true;
    setFlashing(true);
    await wait(260);
    setFlashing(false);
    busy.current = false;
  }, [screenFlash]);

  return {
    screenFlash,
    setScreenFlash,
    led,
    setLed,
    toggleLed,
    viewOnce,
    setViewOnce,
    mask,
    setMask,
    dual,
    setDual,
    flashing,
    fireScreenFlash,
  };
}

/** Full-screen white burst used as the front-camera flash. */
export function ScreenFlashOverlay({ active }: { active: boolean }) {
  if (!active) return null;
  return (
    <div
      aria-hidden
      className="pointer-events-none fixed inset-0 z-[99] bg-white opacity-95 transition-opacity duration-150"
    />
  );
}

/** Decorative overlay for masks that can't be done with a CSS filter alone. */
export function ArMaskOverlay({ mask }: { mask: ArMask }) {
  if (mask === "eyes") {
    return (
      <div
        aria-hidden
        className="pointer-events-none absolute left-1/2 top-[34%] h-[9%] w-[46%] -translate-x-1/2 rounded-full bg-foreground/90 mix-blend-normal"
      />
    );
  }
  if (mask === "pixel") {
    return (
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 opacity-70 [background-image:linear-gradient(var(--background)_1px,transparent_1px),linear-gradient(90deg,var(--background)_1px,transparent_1px)] [background-size:12px_12px]"
      />
    );
  }
  return null;
}

function FxButton({
  icon: Icon,
  label,
  active,
  onClick,
  badge,
}: {
  icon: LucideIcon;
  label: string;
  active?: boolean;
  onClick: () => void;
  badge?: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={label}
      aria-pressed={active}
      title={label}
      className={cn(
        "relative grid h-9 w-9 shrink-0 place-items-center rounded-full transition-transform active:scale-90",
        active ? "bg-foreground text-background" : "bg-secondary/70 text-muted-foreground",
      )}
    >
      <Icon className="h-[17px] w-[17px]" strokeWidth={1.7} />
      {badge ? (
        <span className="absolute -bottom-0.5 -right-0.5 rounded-full bg-primary px-1 text-[9px] font-bold leading-[13px] text-primary-foreground">
          {badge}
        </span>
      ) : null}
    </button>
  );
}

/**
 * Compact control strip shared by chat composers and call screens.
 */
export function CaptureFxBar({ fx, className }: { fx: CaptureFx; className?: string }) {
  const nextMask = () => {
    const i = AR_MASKS.findIndex((m) => m.id === fx.mask);
    fx.setMask(AR_MASKS[(i + 1) % AR_MASKS.length].id);
  };
  const nextTimer = () => {
    const i = VIEW_ONCE_STEPS.indexOf(fx.viewOnce);
    fx.setViewOnce(VIEW_ONCE_STEPS[(i + 1) % VIEW_ONCE_STEPS.length]);
  };

  return (
    <div className={cn("flex items-center gap-2 overflow-x-auto no-scrollbar", className)}>
      <FxButton
        icon={Sun}
        label={fx.screenFlash ? "Front screen-flash on" : "Front screen-flash off"}
        active={fx.screenFlash}
        onClick={() => fx.setScreenFlash(!fx.screenFlash)}
      />
      <FxButton
        icon={fx.led ? Zap : ZapOff}
        label={fx.led ? "Back LED flash on" : "Back LED flash off"}
        active={fx.led}
        onClick={() => void fx.toggleLed()}
      />
      <FxButton
        icon={Timer}
        label={fx.viewOnce ? `View once · ${fx.viewOnce}s` : "View once off"}
        active={fx.viewOnce > 0}
        badge={fx.viewOnce ? `${fx.viewOnce}` : undefined}
        onClick={nextTimer}
      />
      <FxButton
        icon={Sparkles}
        label={`AR privacy mask · ${AR_MASKS.find((m) => m.id === fx.mask)?.label}`}
        active={fx.mask !== "none"}
        onClick={nextMask}
      />
      <FxButton
        icon={Layers}
        label={fx.dual ? "Dual camera on" : "Dual camera off"}
        active={fx.dual}
        onClick={() => fx.setDual(!fx.dual)}
      />
    </div>
  );
}
