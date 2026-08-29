/** Shared revenue-share and tax rules for the Monetization & Wallet dashboard. */

export const CREATOR_SHARE = { ads: 0.7, course: 0.85, vip: 0.85 } as const;
export const PLATFORM_SHARE = { ads: 0.3, course: 0.15, vip: 0.15 } as const;
export const GST_RATE = 0.18;
export const TDS_RATE = 0.01; // Section 194J

export type EarningSource = keyof typeof CREATOR_SHARE;

export type GrossBySource = Record<EarningSource, number>;

export type PayoutBreakdown = {
  gross: number;
  gst: number;
  platformShare: number;
  creatorShare: number;
  tds: number;
  net: number;
  bySource: GrossBySource;
  creatorBySource: GrossBySource;
};

const round2 = (n: number) => Math.round(n * 100) / 100;

export function computeBreakdown(bySource: GrossBySource): PayoutBreakdown {
  const creatorBySource = {
    ads: round2(bySource.ads * CREATOR_SHARE.ads),
    course: round2(bySource.course * CREATOR_SHARE.course),
    vip: round2(bySource.vip * CREATOR_SHARE.vip),
  };
  const gross = round2(bySource.ads + bySource.course + bySource.vip);
  const creatorShare = round2(
    creatorBySource.ads + creatorBySource.course + creatorBySource.vip,
  );
  const platformShare = round2(gross - creatorShare);
  const gst = round2(gross * GST_RATE);
  const tds = round2(creatorShare * TDS_RATE);
  return {
    gross,
    gst,
    platformShare,
    creatorShare,
    tds,
    net: round2(creatorShare - tds),
    bySource,
    creatorBySource,
  };
}

export const inr = (n: number) =>
  `₹${(Number.isFinite(n) ? n : 0).toLocaleString("en-IN", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
