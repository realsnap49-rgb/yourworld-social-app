import { useEffect, useState } from "react";

export const ORBIT_KEY = "yw.orbit.v1";
export const ORBIT_PREFS_EVENT = "yw:orbit-prefs";

export type OrbitAppPrefs = {
  hideOrbitEntry: boolean;
  hideOrbitNotifications: boolean;
};

const fallback: OrbitAppPrefs = { hideOrbitEntry: false, hideOrbitNotifications: false };

/** Reads the Orbit app-level prefs straight from storage — safe outside OrbitProvider. */
export function readOrbitPrefs(): OrbitAppPrefs {
  if (typeof window === "undefined") return fallback;
  try {
    const raw = window.localStorage.getItem(ORBIT_KEY);
    if (!raw) return fallback;
    const parsed = JSON.parse(raw) as { privacy?: Partial<OrbitAppPrefs> };
    return {
      hideOrbitEntry: !!parsed.privacy?.hideOrbitEntry,
      hideOrbitNotifications: !!parsed.privacy?.hideOrbitNotifications,
    };
  } catch {
    return fallback;
  }
}

export function notifyOrbitPrefsChanged() {
  if (typeof window !== "undefined") window.dispatchEvent(new Event(ORBIT_PREFS_EVENT));
}

/** Live app-level Orbit prefs, usable anywhere in the app. */
export function useOrbitAppPrefs(): OrbitAppPrefs {
  const [prefs, setPrefs] = useState<OrbitAppPrefs>(fallback);

  useEffect(() => {
    const sync = () => setPrefs(readOrbitPrefs());
    sync();
    window.addEventListener(ORBIT_PREFS_EVENT, sync);
    window.addEventListener("storage", sync);
    return () => {
      window.removeEventListener(ORBIT_PREFS_EVENT, sync);
      window.removeEventListener("storage", sync);
    };
  }, []);

  return prefs;
}
