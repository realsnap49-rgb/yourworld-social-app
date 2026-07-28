import { useCallback, useEffect, useRef, useState } from "react";

export type LiveLocationDuration = { id: string; label: string; ms: number | null };

/** Never defaults to "always" — the user must pick a window explicitly. */
export const liveLocationDurations: LiveLocationDuration[] = [
  { id: "15m", label: "15 minutes", ms: 15 * 60_000 },
  { id: "1h", label: "1 hour", ms: 60 * 60_000 },
  { id: "8h", label: "8 hours", ms: 8 * 60 * 60_000 },
  { id: "manual", label: "Until I stop", ms: null },
];

export type LiveLocationSession = {
  /** Sharing is OFF until the user explicitly starts it. */
  active: boolean;
  /** Epoch ms when sharing auto-stops, or null for "until I stop". */
  endsAt: number | null;
  /** Metres of GPS accuracy for the latest fix — never the coordinates themselves. */
  accuracyM: number | null;
  updatedAt: number | null;
  error: string | null;
  /** Whether the peer chose to share back. Always starts declined/unset. */
  peerSharing: boolean;
};

const idle: LiveLocationSession = {
  active: false,
  endsAt: null,
  accuracyM: null,
  updatedAt: null,
  error: null,
  peerSharing: false,
};

/**
 * Privacy-first live location.
 * - Nothing is read or transmitted until `start()` runs from a user tap.
 * - Coordinates stay in this hook's ref and are never persisted or rendered.
 * - `stop()` immediately clears the watch and every stored fix.
 */
export function useLiveLocation() {
  const [session, setSession] = useState<LiveLocationSession>(idle);
  const watchId = useRef<number | null>(null);
  const timer = useRef<number | null>(null);
  /** Latest exact fix — kept in memory only, cleared on stop. */
  const lastFix = useRef<{ lat: number; lng: number } | null>(null);

  const teardown = useCallback(() => {
    if (watchId.current !== null && typeof navigator !== "undefined") {
      navigator.geolocation?.clearWatch(watchId.current);
    }
    watchId.current = null;
    if (timer.current !== null) window.clearTimeout(timer.current);
    timer.current = null;
    lastFix.current = null;
  }, []);

  const stop = useCallback(() => {
    teardown();
    setSession({ ...idle });
  }, [teardown]);

  useEffect(() => teardown, [teardown]);

  const start = useCallback(
    (duration: LiveLocationDuration) =>
      new Promise<boolean>((resolve) => {
        if (typeof navigator === "undefined" || !navigator.geolocation) {
          setSession((s) => ({ ...s, error: "Location isn't available on this device." }));
          resolve(false);
          return;
        }
        let settled = false;
        const endsAt = duration.ms === null ? null : Date.now() + duration.ms;

        watchId.current = navigator.geolocation.watchPosition(
          (pos) => {
            lastFix.current = { lat: pos.coords.latitude, lng: pos.coords.longitude };
            setSession((s) => ({
              ...s,
              active: true,
              endsAt,
              error: null,
              accuracyM: Math.round(pos.coords.accuracy),
              updatedAt: Date.now(),
            }));
            if (!settled) {
              settled = true;
              resolve(true);
            }
          },
          (err) => {
            teardown();
            setSession({
              ...idle,
              error:
                err.code === err.PERMISSION_DENIED
                  ? "Location permission was declined. Nothing was shared."
                  : "Couldn't get a location fix. Nothing was shared.",
            });
            if (!settled) {
              settled = true;
              resolve(false);
            }
          },
          { enableHighAccuracy: true, maximumAge: 5_000, timeout: 15_000 },
        );

        if (endsAt !== null) {
          timer.current = window.setTimeout(() => stop(), endsAt - Date.now());
        }
      }),
    [stop, teardown],
  );

  /** The peer's own opt-in — mirrors the same explicit consent rule. */
  const setPeerSharing = useCallback(
    (peerSharing: boolean) => setSession((s) => ({ ...s, peerSharing })),
    [],
  );

  return { session, start, stop, setPeerSharing };
}

export const remainingLabel = (endsAt: number | null) => {
  if (endsAt === null) return "until you stop";
  const mins = Math.max(0, Math.round((endsAt - Date.now()) / 60_000));
  if (mins >= 60) return `for ${Math.round(mins / 60)}h`;
  return `for ${mins} min`;
};
