import React, { useEffect, useState } from "react";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { ArrowLeft, ExternalLink, ShieldAlert, Trash2, XCircle } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth-store";

export const Route = createFileRoute("/admin/copyright-reports")({
  head: () => ({
    meta: [
      { title: "DMCA Reports Admin — YourWorld" },
      {
        name: "description",
        content: "Review copyright takedown reports, compare reported media with proof links, and resolve claims.",
      },
      { property: "og:title", content: "DMCA Reports Admin — YourWorld" },
      { property: "og:description", content: "Admin dashboard for reviewing YourWorld copyright takedown reports." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: AdminCopyrightReports,
});

type Report = {
  id: string;
  reporter_user_id: string;
  reporter_full_name: string | null;
  reported_post_id: string | null;
  reported_moment_id: string | null;
  original_work_link: string | null;
  infringing_content_link: string | null;
  reason: string | null;
  contact_email: string | null;
  status: string;
  reporter_flagged: boolean;
  created_at: string;
};

type Media = { url: string | null; type: string | null; caption: string | null };

function AdminCopyrightReports() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [isAdmin, setIsAdmin] = useState<boolean | null>(null);
  const [reports, setReports] = useState<Report[]>([]);
  const [media, setMedia] = useState<Record<string, Media>>({});
  const [busy, setBusy] = useState<string | null>(null);

  useEffect(() => {
    let alive = true;
    (async () => {
      if (!user) {
        setIsAdmin(false);
        return;
      }
      const { data } = await supabase.from("user_roles").select("role").eq("user_id", user.id).eq("role", "admin");
      if (!alive) return;
      setIsAdmin(!!data && data.length > 0);
    })();
    return () => {
      alive = false;
    };
  }, [user]);

  const load = React.useCallback(async () => {
    const { data, error } = await supabase
      .from("copyright_reports")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(200);
    if (error) return;
    const rows = (data ?? []) as unknown as Report[];
    setReports(rows);

    const next: Record<string, Media> = {};
    await Promise.all(
      rows.map(async (r) => {
        if (r.reported_post_id) {
          const { data: p } = await supabase
            .from("posts")
            .select("media_url, media_type, caption")
            .eq("id", r.reported_post_id)
            .maybeSingle();
          if (p) next[r.id] = { url: p.media_url, type: p.media_type, caption: p.caption };
        } else if (r.reported_moment_id) {
          const { data: m } = await supabase
            .from("moments")
            .select("media_url, media_type, text")
            .eq("id", r.reported_moment_id)
            .maybeSingle();
          if (m) next[r.id] = { url: m.media_url, type: m.media_type, caption: m.text };
        }
      }),
    );
    setMedia(next);
  }, []);

  useEffect(() => {
    if (isAdmin) void load();
  }, [isAdmin, load]);

  const approve = async (r: Report) => {
    setBusy(r.id);
    try {
      if (r.reported_post_id) {
        const { error } = await supabase.from("posts").delete().eq("id", r.reported_post_id);
        if (error) throw error;
      } else if (r.reported_moment_id) {
        const { error } = await supabase.from("moments").delete().eq("id", r.reported_moment_id);
        if (error) throw error;
      }
      const { error } = await supabase
        .from("copyright_reports")
        .update({ status: "resolved", resolved_at: new Date().toISOString() })
        .eq("id", r.id);
      if (error) throw error;
      toast.success("Media removed and report resolved");
      await load();
    } catch {
      toast.error("Could not complete the takedown");
    } finally {
      setBusy(null);
    }
  };

  const reject = async (r: Report) => {
    setBusy(r.id);
    const { error } = await supabase
      .from("copyright_reports")
      .update({ status: "rejected", reporter_flagged: true, resolved_at: new Date().toISOString() })
      .eq("id", r.id);
    setBusy(null);
    if (error) {
      toast.error("Could not reject the report");
      return;
    }
    toast.success("Report dismissed and reporter flagged for spam");
    await load();
  };

  if (isAdmin === null) {
    return <div className="min-h-screen bg-[#09090b] p-6 text-sm text-zinc-400">Loading…</div>;
  }

  if (!isAdmin) {
    return (
      <div className="min-h-screen bg-[#09090b] p-6 text-white">
        <div className="mx-auto max-w-md rounded-2xl border border-zinc-800 bg-[#141418] p-6 text-center">
          <ShieldAlert className="mx-auto mb-3 text-red-500" size={28} />
          <h1 className="text-lg font-bold">Admins only</h1>
          <p className="mt-1 text-sm text-zinc-400">You do not have access to the DMCA dashboard.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#09090b] p-4 text-white">
      <div className="mb-6 mt-2 flex items-center gap-3">
        <button onClick={() => navigate({ to: "/settings" })} className="p-1 text-zinc-300 hover:text-white">
          <ArrowLeft size={22} />
        </button>
        <h1 className="text-xl font-bold">DMCA Reports</h1>
      </div>

      {reports.length === 0 && (
        <div className="rounded-2xl border border-zinc-800 bg-[#141418] p-6 text-sm text-zinc-400">
          No copyright reports yet.
        </div>
      )}

      <div className="space-y-4">
        {reports.map((r) => {
          const m = media[r.id];
          return (
            <div key={r.id} className="rounded-2xl border border-zinc-800 bg-[#141418] p-4">
              <div className="mb-3 flex flex-wrap items-center gap-2 text-[11px] text-zinc-500">
                <span
                  className={`rounded-full px-2 py-0.5 font-semibold ${
                    r.status === "resolved"
                      ? "bg-emerald-500/15 text-emerald-400"
                      : r.status === "rejected"
                        ? "bg-red-500/15 text-red-400"
                        : "bg-amber-500/15 text-amber-400"
                  }`}
                >
                  {r.status}
                </span>
                {r.reporter_flagged && (
                  <span className="rounded-full bg-red-500/15 px-2 py-0.5 font-semibold text-red-400">spam flagged</span>
                )}
                <span>{new Date(r.created_at).toLocaleString()}</span>
              </div>

              <div className="grid gap-3 sm:grid-cols-2">
                <div className="rounded-xl border border-zinc-800 bg-zinc-900/60 p-3">
                  <div className="mb-2 text-xs font-bold text-zinc-300">Reported Media</div>
                  {m?.url ? (
                    m.type?.startsWith("video") ? (
                      <video src={m.url} controls className="max-h-56 w-full rounded-lg bg-black" />
                    ) : (
                      <img src={m.url} alt="Reported media" className="max-h-56 w-full rounded-lg object-contain" />
                    )
                  ) : (
                    <div className="rounded-lg border border-dashed border-zinc-700 p-4 text-[11px] text-zinc-500">
                      Media preview unavailable
                    </div>
                  )}
                  {m?.caption && <p className="mt-2 line-clamp-3 text-[11px] text-zinc-400">{m.caption}</p>}
                  {r.infringing_content_link && (
                    <a
                      href={r.infringing_content_link}
                      target="_blank"
                      rel="noreferrer noopener"
                      className="mt-2 inline-flex items-center gap-1 break-all text-[11px] text-indigo-400 hover:underline"
                    >
                      <ExternalLink size={12} /> {r.infringing_content_link}
                    </a>
                  )}
                </div>

                <div className="rounded-xl border border-zinc-800 bg-zinc-900/60 p-3">
                  <div className="mb-2 text-xs font-bold text-zinc-300">Reporter&apos;s Original Proof</div>
                  {r.original_work_link ? (
                    <a
                      href={r.original_work_link}
                      target="_blank"
                      rel="noreferrer noopener"
                      className="inline-flex items-center gap-1 break-all text-[11px] text-indigo-400 hover:underline"
                    >
                      <ExternalLink size={12} /> {r.original_work_link}
                    </a>
                  ) : (
                    <div className="text-[11px] text-zinc-500">No proof link provided</div>
                  )}
                  <dl className="mt-3 space-y-1 text-[11px] text-zinc-400">
                    <div>
                      <span className="text-zinc-500">Name: </span>
                      {r.reporter_full_name || "—"}
                    </div>
                    <div>
                      <span className="text-zinc-500">Email: </span>
                      {r.contact_email || "—"}
                    </div>
                    <div className="whitespace-pre-wrap">
                      <span className="text-zinc-500">Claim: </span>
                      {r.reason || "—"}
                    </div>
                  </dl>
                </div>
              </div>

              <div className="mt-3 flex flex-wrap gap-2">
                <button
                  onClick={() => approve(r)}
                  disabled={busy === r.id || r.status !== "pending"}
                  className="inline-flex items-center gap-2 rounded-xl bg-red-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-red-500 disabled:opacity-50"
                >
                  <Trash2 size={16} /> Approve &amp; Delete Media
                </button>
                <button
                  onClick={() => reject(r)}
                  disabled={busy === r.id || r.status !== "pending"}
                  className="inline-flex items-center gap-2 rounded-xl border border-zinc-700 px-4 py-2.5 text-sm font-semibold text-zinc-200 hover:bg-zinc-800 disabled:opacity-50"
                >
                  <XCircle size={16} /> Reject Fake Report
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

export default AdminCopyrightReports;
