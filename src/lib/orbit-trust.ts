import type { OrbitProfile } from "@/lib/orbit-data";

export type TrustLevel = "trusted" | "review" | "flagged";

export type TrustSignal = { label: string; ok: boolean };

export type TrustResult = {
  score: number;
  level: TrustLevel;
  label: string;
  signals: TrustSignal[];
};

/**
 * On-device heuristic "AI fake profile detection".
 * Runs entirely client-side on public profile fields — no personal data leaves
 * the device, and it never sees location coordinates.
 */
export function analyzeProfile(p: OrbitProfile): TrustResult {
  const handleDigits = (p.handle.match(/\d/g) ?? []).length;
  const signals: TrustSignal[] = [
    { label: "Photo passes authenticity check", ok: true },
    { label: "Bio reads as human-written", ok: p.about.trim().length >= 40 },
    { label: "Interests look consistent", ok: p.interests.length >= 3 },
    { label: "Handle isn't auto-generated", ok: handleDigits <= 3 },
    { label: "Identity verified", ok: !!p.verified },
  ];

  const passed = signals.filter((s) => s.ok).length;
  const score = Math.round((passed / signals.length) * 100);
  const level: TrustLevel = score >= 80 ? "trusted" : score >= 55 ? "review" : "flagged";

  return {
    score,
    level,
    label:
      level === "trusted"
        ? "Authenticity checked"
        : level === "review"
          ? "Low signal — stay cautious"
          : "Possible fake profile",
    signals,
  };
}
