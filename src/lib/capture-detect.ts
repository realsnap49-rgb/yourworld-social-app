import { useEffect, useRef } from "react";

/**
 * Best-effort screenshot / screen-recording detection.
 * Browsers can't observe OS captures directly, so we watch for the signals we
 * do get: PrintScreen keys, and the brief focus/visibility loss that accompanies
 * a system capture UI. Fires `onCapture` (throttled) instead of alerting.
 */
export function useCaptureDetect(enabled: boolean, onCapture: (kind: "screenshot" | "recording") => void) {
  const cb = useRef(onCapture);
  cb.current = onCapture;

  useEffect(() => {
    if (!enabled || typeof window === "undefined") return;
    let last = 0;
    const fire = (kind: "screenshot" | "recording") => {
      const now = Date.now();
      if (now - last < 4000) return;
      last = now;
      cb.current(kind);
    };

    const onKey = (e: KeyboardEvent) => {
      if (e.key === "PrintScreen" || (e.metaKey && e.shiftKey && ["3", "4", "5"].includes(e.key))) {
        fire(e.key === "5" ? "recording" : "screenshot");
      }
    };
    const onVisibility = () => {
      if (document.visibilityState === "hidden") fire("screenshot");
    };

    window.addEventListener("keyup", onKey);
    document.addEventListener("visibilitychange", onVisibility);
    return () => {
      window.removeEventListener("keyup", onKey);
      document.removeEventListener("visibilitychange", onVisibility);
    };
  }, [enabled]);
}
