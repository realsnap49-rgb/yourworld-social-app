import { useEffect } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { computeBreakdown, inr, type EarningSource } from "@/lib/payout-math";

const netFor = (source: string, gross: number) => {
  const key: EarningSource = source === "ads" || source === "course" || source === "vip" ? source : "ads";
  const bd = computeBreakdown({
    ads: key === "ads" ? gross : 0,
    course: key === "course" ? gross : 0,
    vip: key === "vip" ? gross : 0,
  });
  return bd.net;
};

/** Atomic pop-up whenever earnings land in the creator's wallet. */
export function EarningsCreditWatcher() {
  useEffect(() => {
    let channel: ReturnType<typeof supabase.channel> | null = null;
    let cancelled = false;

    void (async () => {
      const { data } = await supabase.auth.getUser();
      const uid = data.user?.id;
      if (!uid || cancelled) return;
      channel = supabase
        .channel(`earnings-credit-${uid}`)
        .on(
          "postgres_changes",
          {
            event: "INSERT",
            schema: "public",
            table: "creator_earnings",
            filter: `user_id=eq.${uid}`,
          },
          (payload) => {
            const row = payload.new as { source?: string; gross_amount?: number | string };
            const net = netFor(String(row.source ?? "ads"), Number(row.gross_amount ?? 0));
            if (net <= 0) return;
            toast.success(`💰 Earnings Credited: ${inr(net)} added to your Monetization Wallet.`);
          },
        )
        .subscribe();
    })();

    return () => {
      cancelled = true;
      if (channel) void supabase.removeChannel(channel);
    };
  }, []);

  return null;
}
