import { useEffect, useState } from "react";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { ArrowLeft, Coins, Download, Loader2, Wallet } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth-store";
import { computeBreakdown, inr, type GrossBySource } from "@/lib/payout-math";
import { downloadPayoutPdf, payoutPdfBase64, type StatementInfo } from "@/lib/payout-pdf";
import { emailPayoutInvoice, processPayout } from "@/lib/payouts.functions";

export const Route = createFileRoute("/wallet")({
  head: () => ({
    meta: [
      { title: "Monetization & Wallet — YourWorld" },
      {
        name: "description",
        content:
          "Track creator earnings, course sales, VIP memberships, payouts and download GST/TDS tax invoices.",
      },
      { property: "og:title", content: "Monetization & Wallet — YourWorld" },
      {
        property: "og:description",
        content: "Earnings, courses, payouts and tax invoices for YourWorld creators.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: WalletPage,
});

type PayoutRow = {
  id: string;
  statement_id: string;
  gross_amount: number;
  gst_amount: number;
  platform_share: number;
  tds_amount: number;
  net_amount: number;
  ads_gross: number;
  course_gross: number;
  vip_gross: number;
  pan_number: string | null;
  status: string;
  email_sent: boolean;
  created_at: string;
};

type Details = {
  creator_email: string;
  upi_id: string;
  bank_account: string;
  ifsc_code: string;
  account_holder: string;
  pan_number: string;
};

const emptyDetails: Details = {
  creator_email: "",
  upi_id: "",
  bank_account: "",
  ifsc_code: "",
  account_holder: "",
  pan_number: "",
};

function WalletPage() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const runPayout = useServerFn(processPayout);
  const sendInvoice = useServerFn(emailPayoutInvoice);

  const [gross, setGross] = useState<GrossBySource>({ ads: 0, course: 0, vip: 0 });
  const [details, setDetails] = useState<Details>(emptyDetails);
  const [profile, setProfile] = useState<{ display_name: string; username: string }>({
    display_name: "",
    username: "",
  });
  const [payouts, setPayouts] = useState<PayoutRow[]>([]);
  const [saving, setSaving] = useState(false);
  const [processing, setProcessing] = useState(false);

  useEffect(() => {
    const uid = user?.id;
    if (!uid) return;
    let alive = true;
    (async () => {
      const [{ data: earnings }, { data: det }, { data: prof }, { data: hist }] =
        await Promise.all([
          supabase.from("creator_earnings").select("source, gross_amount").eq("user_id", uid).is("payout_id", null),
          supabase.from("creator_payout_details").select("*").eq("user_id", uid).maybeSingle(),
          supabase.from("profiles").select("display_name, username").eq("id", uid).maybeSingle(),
          supabase
            .from("creator_payouts")
            .select("*")
            .eq("user_id", uid)
            .order("created_at", { ascending: false }),
        ]);
      if (!alive) return;
      const next: GrossBySource = { ads: 0, course: 0, vip: 0 };
      for (const row of earnings ?? []) {
        const key = row.source as keyof GrossBySource;
        if (key in next) next[key] += Number(row.gross_amount ?? 0);
      }
      setGross(next);
      if (det) {
        setDetails({
          creator_email: det.creator_email ?? "",
          upi_id: det.upi_id ?? "",
          bank_account: det.bank_account ?? "",
          ifsc_code: det.ifsc_code ?? "",
          account_holder: det.account_holder ?? "",
          pan_number: det.pan_number ?? "",
        });
      } else {
        setDetails((d) => ({ ...d, creator_email: user?.email ?? "" }));
      }
      setProfile({
        display_name: prof?.display_name ?? "",
        username: prof?.username ?? "",
      });
      setPayouts((hist ?? []) as PayoutRow[]);
    })();
    return () => {
      alive = false;
    };
  }, [user?.id, user?.email]);

  const b = computeBreakdown(gross);

  const statementInfo = (p: {
    statement_id: string;
    created_at: string;
    pan_number: string | null;
  }): StatementInfo => ({
    statementId: p.statement_id,
    date: new Date(p.created_at).toLocaleDateString("en-IN", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    }),
    creatorName: details.account_holder || profile.display_name || "Creator",
    username: profile.username ? `@${profile.username}` : "—",
    email: details.creator_email || user?.email || "—",
    pan: p.pan_number || details.pan_number || "",
  });

  const saveDetails = async () => {
    if (!user?.id) return;
    setSaving(true);
    const { error } = await supabase
      .from("creator_payout_details")
      .upsert({ user_id: user.id, ...details }, { onConflict: "user_id" });
    setSaving(false);
    if (error) toast.error(error.message);
    else toast.success("Payout details saved");
  };

  const withdraw = async () => {
    if (!details.creator_email && !user?.email) {
      toast.error("Add your creator email before requesting a payout");
      return;
    }
    setProcessing(true);
    try {
      const res = await runPayout({});
      const payout = res.payout as PayoutRow;
      setPayouts((p) => [payout, ...p]);
      setGross({ ads: 0, course: 0, vip: 0 });

      const info = statementInfo(payout);
      const bd = computeBreakdown({
        ads: Number(payout.ads_gross),
        course: Number(payout.course_gross),
        vip: Number(payout.vip_gross),
      });
      const pdfBase64 = payoutPdfBase64(info, bd);
      const mail = await sendInvoice({
        data: {
          payoutId: payout.id,
          to: details.creator_email || user!.email!,
          statementId: payout.statement_id,
          pdfBase64,
        },
      });
      if (mail.sent) toast.success("Payout processed — invoice emailed to you");
      else toast.success(`Payout processed. ${mail.reason ?? ""} Download the PDF below.`);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Payout failed");
    } finally {
      setProcessing(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#09090b] pb-16 font-sans text-white">
      <header className="sticky top-0 z-40 flex items-center gap-3 border-b border-zinc-800 bg-[#09090b]/90 px-4 py-3 backdrop-blur">
        <button
          onClick={() => navigate({ to: "/settings" })}
          aria-label="Back to settings"
          className="p-1 text-zinc-300 hover:text-white"
        >
          <ArrowLeft size={22} />
        </button>
        <h1 className="text-lg font-bold">Monetization & Wallet</h1>
      </header>

      <div className="space-y-4 p-4">
        {/* Total earnings */}
        <section className="rounded-2xl border border-zinc-800 bg-gradient-to-br from-[#17171c] to-[#101014] p-5">
          <div className="flex items-center gap-2 text-zinc-400">
            <Wallet size={16} />
            <p className="text-[11px] font-semibold uppercase tracking-wide">
              Total Earnings (Net Creator Share)
            </p>
          </div>
          <p className="pt-2 text-3xl font-extrabold">{inr(b.creatorShare)}</p>
          <p className="pt-1 text-[11px] text-zinc-500">
            Withdrawable after 1% TDS: <span className="text-zinc-300">{inr(b.net)}</span>
          </p>
        </section>

        {/* Revenue breakdown */}
        <section className="grid grid-cols-3 gap-3">
          {[
            { label: "Ad & Brand Deals", v: b.creatorBySource.ads, share: "70% share" },
            { label: "Course Sales", v: b.creatorBySource.course, share: "85% share" },
            { label: "VIP Memberships", v: b.creatorBySource.vip, share: "85% share" },
          ].map((c) => (
            <div key={c.label} className="rounded-2xl border border-zinc-800 bg-[#141418] p-3">
              <p className="text-[10px] font-semibold uppercase tracking-wide text-zinc-500">
                {c.label}
              </p>
              <p className="pt-1.5 text-sm font-bold">{inr(c.v)}</p>
              <p className="text-[10px] text-zinc-500">{c.share}</p>
            </div>
          ))}
        </section>

        {/* Payout details */}
        <section className="rounded-2xl border border-zinc-800 bg-[#141418] p-4">
          <h2 className="text-sm font-bold">Payout & Bank Details</h2>
          <div className="grid gap-2.5 pt-3">
            {(
              [
                ["creator_email", "Creator Email ID", "you@gmail.com"],
                ["upi_id", "UPI ID", "name@upi"],
                ["bank_account", "Bank Account Number", "Account number"],
                ["ifsc_code", "IFSC Code", "IFSC0000000"],
                ["account_holder", "Account Holder Name", "Full name as per bank"],
                ["pan_number", "PAN Card Number", "ABCDE1234F"],
              ] as Array<[keyof Details, string, string]>
            ).map(([key, label, ph]) => (
              <label key={key} className="block">
                <span className="mb-1 block text-[11px] text-zinc-500">{label}</span>
                <input
                  value={details[key]}
                  onChange={(e) => setDetails((d) => ({ ...d, [key]: e.target.value }))}
                  placeholder={ph}
                  className="w-full rounded-xl border border-zinc-800 bg-[#0f0f13] px-3 py-2.5 text-sm outline-none placeholder:text-zinc-600 focus:border-zinc-600"
                />
              </label>
            ))}
          </div>
          <button
            onClick={saveDetails}
            disabled={saving}
            className="mt-3 w-full rounded-full bg-white py-2.5 text-sm font-semibold text-black disabled:opacity-60"
          >
            {saving ? "Saving…" : "Save Details"}
          </button>
        </section>

        {/* Withdraw */}
        <button
          onClick={withdraw}
          disabled={processing || b.net <= 0}
          className="flex w-full items-center justify-center gap-2 rounded-full bg-indigo-500 py-3 text-sm font-semibold disabled:opacity-50"
        >
          {processing ? <Loader2 className="animate-spin" size={16} /> : <Coins size={16} />}
          {processing ? "Processing payout…" : `Withdraw Balance (${inr(b.net)})`}
        </button>

        {/* History */}
        <section className="rounded-2xl border border-zinc-800 bg-[#141418] p-4">
          <h2 className="text-sm font-bold">Payout History</h2>
          {payouts.length === 0 ? (
            <p className="pt-2 text-[11px] text-zinc-500">
              No payouts yet. Your statements and Form 16A certificates will appear here.
            </p>
          ) : (
            <ul className="divide-y divide-zinc-800/80 pt-1">
              {payouts.map((p) => (
                <li key={p.id} className="flex items-center gap-3 py-3">
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-semibold">{inr(Number(p.net_amount))}</p>
                    <p className="truncate text-[11px] text-zinc-500">
                      {p.statement_id} ·{" "}
                      {new Date(p.created_at).toLocaleDateString("en-IN", {
                        day: "2-digit",
                        month: "short",
                        year: "numeric",
                      })}{" "}
                      · {p.status}
                    </p>
                  </div>
                  <button
                    onClick={() =>
                      downloadPayoutPdf(
                        statementInfo(p),
                        computeBreakdown({
                          ads: Number(p.ads_gross),
                          course: Number(p.course_gross),
                          vip: Number(p.vip_gross),
                        }),
                      )
                    }
                    className="flex items-center gap-1.5 rounded-full border border-zinc-700 px-3 py-1.5 text-[11px] font-semibold hover:bg-zinc-800"
                  >
                    <Download size={13} /> PDF
                  </button>
                </li>
              ))}
            </ul>
          )}
          <p className="pt-3 text-[10px] leading-relaxed text-zinc-500">
            Form 16A tax certificates are issued against your PAN at the end of each financial
            quarter and will be listed in this section.
          </p>
        </section>
      </div>
    </div>
  );
}
