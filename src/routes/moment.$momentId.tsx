import { createFileRoute, useNavigate, useParams, Link } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import {
  ArrowLeft,
  Eye,
  Heart,
  MessageCircle,
  Camera,
  Download,
  Archive,
  Trash2,
  MapPin,
  Music2,
  Clock,
  Send,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { YwAvatar } from "@/components/yw/Avatar";
import { byId, currentUser, formatCount } from "@/lib/yw-data";
import { aiFilterCss, useMoments } from "@/lib/moment-store";
import { downloadWithWatermark } from "@/lib/yw-download";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

/** re-applies the editor's zoom/pan framing, scaled to this viewport width */
function cropStyle(crop?: {
  zoom: number;
  x: number;
  y: number;
  frameW: number;
  frameH: number;
}): React.CSSProperties | undefined {
  if (!crop || (crop.zoom <= 1.001 && !crop.x && !crop.y)) return undefined;
  return {
    transformOrigin: "0 0",
    transform: `translate(${(crop.x / (crop.frameW || 1)) * 100}%, ${(crop.y / (crop.frameH || 1)) * 100}%) scale(${crop.zoom})`,
  };
}

export const Route = createFileRoute("/moment/$momentId")({
  head: () => ({
    meta: [
      { title: "Moment insights — YourWorld" },
      {
        name: "description",
        content:
          "See views, viewer list, likes, replies, poll results and screenshot alerts for your moment, and archive or delete it.",
      },
      { property: "og:title", content: "Moment insights — YourWorld" },
      {
        property: "og:description",
        content: "Views, viewers, likes, replies, polls and screenshot alerts for your moment.",
      },
    ],
  }),
  component: MomentViewer,
});

function MomentViewer() {
  const { momentId } = useParams({ from: "/moment/$momentId" });
  const navigate = useNavigate();
  const { moments, archive, addReply, votePoll, archiveMoment, deleteMoment, registerScreenshot } =
    useMoments();
  const moment = useMemo(
    () => [...moments, ...archive].find((m) => m.id === momentId),
    [moments, archive, momentId],
  );
  const [reply, setReply] = useState("");
  const [tab, setTab] = useState<"viewers" | "replies">("viewers");

  // Screenshot / capture alert
  useEffect(() => {
    if (!moment?.screenshotAlert) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "PrintScreen" || (e.metaKey && e.shiftKey)) {
        registerScreenshot(moment.id);
        toast("Screenshot detected — both of you were notified");
      }
    };
    window.addEventListener("keyup", onKey);
    return () => window.removeEventListener("keyup", onKey);
  }, [moment, registerScreenshot]);

  if (!moment) {
    return (
      <main className="grid min-h-screen place-items-center px-6 text-center">
        <div>
          <h1 className="font-display text-xl font-bold">Moment not available</h1>
          <p className="pt-2 text-sm text-muted-foreground">It expired or was deleted.</p>
          <Link to="/" className="mt-5 inline-block">
            <Button className="rounded-full brand-gradient text-primary-foreground">Go home</Button>
          </Link>
        </div>
      </main>
    );
  }

  const views = moment.viewers.length;
  const likes = moment.viewers.filter((v) => v.liked).length;
  const shots = moment.viewers.filter((v) => v.screenshot).length;
  const expiresIn = Math.max(
    0,
    Math.round((moment.createdAt + moment.duration * 3600_000 - Date.now()) / 3600_000),
  );
  const filter = aiFilterCss(moment.ai, moment.effect);

  const download = async () => {
    if (!moment.allowDownload) {
      toast("Downloads are turned off for this moment");
      return;
    }
    if (moment.kind !== "photo" || !moment.media) {
      toast("Only photo moments can be saved right now");
      return;
    }
    try {
      await downloadWithWatermark(moment.media, currentUser.username, `yw-moment-${moment.id}.jpg`);
      toast.success("Saved with the YW watermark");
    } catch {
      toast.error("Couldn't save this moment");
    }
  };

  return (
    <main className="grain relative min-h-screen pb-10">
      <div aria-hidden className="ambient-canvas" />

      <header className="header-lux sticky top-0 z-40 flex h-[54px] items-center justify-between gap-3 px-3">
        <button
          aria-label="Back"
          onClick={() => navigate({ to: "/" })}
          className="icon-pill grid h-9 w-9 place-items-center active:scale-90"
        >
          <ArrowLeft className="h-5 w-5" strokeWidth={1.7} />
        </button>
        <h1 className="font-ui text-[17px] font-semibold tracking-[-0.02em]">Your Moment</h1>
        <span className="flex items-center gap-1 rounded-full bg-secondary px-2.5 py-1 text-[11px] font-semibold text-muted-foreground">
          <Clock className="h-3 w-3" /> {expiresIn}h
        </span>
      </header>

      <section className="px-4 pt-4">
        <div
          className="relative aspect-9/16 w-full overflow-hidden rounded-[28px] border border-border bg-secondary"
          style={moment.kind === "text" ? { background: moment.textBg } : undefined}
        >
          {moment.kind === "video" && moment.media ? (
            <div className="h-full w-full overflow-hidden" style={cropStyle(moment.crop)}>
              <video
                src={moment.media}
                autoPlay
                loop
                muted
                playsInline
                style={{ filter }}
                className="h-full w-full object-cover"
                onLoadedMetadata={(e) => {
                  if (moment.trim) e.currentTarget.currentTime = moment.trim.start;
                }}
                onTimeUpdate={(e) => {
                  const v = e.currentTarget;
                  if (!moment.trim) return;
                  if (v.currentTime >= moment.trim.end || v.currentTime < moment.trim.start) {
                    v.currentTime = moment.trim.start;
                  }
                }}
              />
            </div>
          ) : moment.kind === "photo" && moment.media ? (
            <div className="h-full w-full overflow-hidden" style={cropStyle(moment.crop)}>
              <img src={moment.media} alt="Your moment" style={{ filter }} className="h-full w-full object-cover" />
            </div>
          ) : (
            <div className="grid h-full w-full place-items-center p-8">
              <p className="text-center font-display text-2xl font-bold text-white">{moment.text}</p>
            </div>
          )}

          <div className="pointer-events-none absolute inset-x-3 top-3 flex flex-wrap gap-1.5">
            {moment.music && (
              <span className="flex items-center gap-1 rounded-full bg-black/45 px-2 py-1 text-[10.5px] font-semibold text-white backdrop-blur-md">
                <Music2 className="h-3 w-3" /> {moment.music}
              </span>
            )}
            {moment.location && (
              <span className="flex items-center gap-1 rounded-full bg-black/45 px-2 py-1 text-[10.5px] font-semibold text-white backdrop-blur-md">
                <MapPin className="h-3 w-3" /> {moment.location}
              </span>
            )}
          </div>

          {moment.stickers.map((s) => (
            <span
              key={s.id}
              style={{ left: `${s.x * 100}%`, top: `${s.y * 100}%` }}
              className="pointer-events-none absolute -translate-x-1/2 -translate-y-1/2 text-3xl drop-shadow-lg"
            >
              {s.content}
            </span>
          ))}

          {moment.kind !== "text" && moment.text.trim() && (
            <p className="pointer-events-none absolute inset-x-4 bottom-4 text-center font-display text-lg font-bold text-white drop-shadow-lg">
              {moment.text}
            </p>
          )}
        </div>
      </section>

      {/* stats */}
      <section className="grid grid-cols-4 gap-2 px-4 pt-4">
        <Stat icon={<Eye className="h-4 w-4" />} value={formatCount(views)} label="Views" />
        <Stat icon={<Heart className="h-4 w-4" />} value={formatCount(likes)} label="Likes" />
        <Stat
          icon={<MessageCircle className="h-4 w-4" />}
          value={formatCount(moment.replies.length)}
          label="Replies"
        />
        <Stat icon={<Camera className="h-4 w-4" />} value={formatCount(shots)} label="Captures" />
      </section>

      {moment.poll && (
        <section className="px-4 pt-5">
          <div className="rounded-2xl bg-secondary/60 p-4">
            <p className="text-sm font-semibold">{moment.poll.question}</p>
            <div className="mt-3 space-y-2">
              {moment.poll.options.map((o, i) => {
                const total = moment.poll!.votes[0] + moment.poll!.votes[1];
                const pct = total ? Math.round((moment.poll!.votes[i]! / total) * 100) : 0;
                return (
                  <button
                    key={o}
                    onClick={() => votePoll(moment.id, i as 0 | 1)}
                    className="relative w-full overflow-hidden rounded-xl bg-background px-3 py-2.5 text-left active:scale-[0.99]"
                  >
                    <span
                      className="absolute inset-y-0 left-0 bg-primary/25 transition-all"
                      style={{ width: `${pct}%` }}
                    />
                    <span className="relative flex justify-between text-[13px] font-semibold">
                      <span>{o}</span>
                      <span className="text-muted-foreground">{pct}%</span>
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
        </section>
      )}

      {/* viewers / replies */}
      <section className="px-4 pt-5">
        <div className="grid grid-cols-2 gap-1 rounded-2xl bg-secondary p-1">
          {(["viewers", "replies"] as const).map((t) => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={cn(
                "rounded-xl py-2 text-[13px] font-semibold capitalize transition-all",
                tab === t ? "bg-background text-foreground shadow-sm" : "text-muted-foreground",
              )}
            >
              {t}
            </button>
          ))}
        </div>

        {tab === "viewers" ? (
          <ul className="space-y-1.5 pt-3">
            {moment.viewers.map((v) => {
              const u = byId(v.userId);
              return (
                <li
                  key={v.userId}
                  className="flex items-center gap-3 rounded-2xl bg-secondary/60 px-3 py-2.5"
                >
                  <YwAvatar user={u} size={36} />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-semibold">@{u.username}</p>
                    <p className="text-[11px] text-muted-foreground">
                      {Math.max(1, Math.round((Date.now() - v.at) / 60000))}m ago
                    </p>
                  </div>
                  {v.screenshot && moment.screenshotAlert && (
                    <Camera className="h-4 w-4 text-primary" aria-label="Captured a screenshot" />
                  )}
                  {v.liked && <Heart className="h-4 w-4 fill-primary text-primary" />}
                </li>
              );
            })}
          </ul>
        ) : (
          <div className="pt-3">
            <ul className="space-y-1.5">
              {moment.replies.length === 0 && (
                <li className="rounded-2xl bg-secondary/60 px-3 py-4 text-center text-sm text-muted-foreground">
                  No replies yet
                </li>
              )}
              {moment.replies.map((r) => (
                <li key={r.id} className="flex items-center gap-3 rounded-2xl bg-secondary/60 px-3 py-2.5">
                  <YwAvatar user={byId(r.userId)} size={32} />
                  <p className="min-w-0 flex-1 truncate text-sm">{r.text}</p>
                </li>
              ))}
            </ul>
            <form
              className="flex gap-2 pt-3"
              onSubmit={(e) => {
                e.preventDefault();
                if (!reply.trim()) return;
                addReply(moment.id, reply.trim());
                setReply("");
              }}
            >
              <Input
                value={reply}
                onChange={(e) => setReply(e.target.value)}
                placeholder="Reply to your moment…"
                className="h-11 border-0 bg-secondary"
              />
              <Button type="submit" size="icon" className="h-11 w-11 shrink-0 rounded-full brand-gradient text-primary-foreground">
                <Send className="h-4 w-4" />
              </Button>
            </form>
          </div>
        )}
      </section>

      {/* safety actions */}
      <section className="space-y-2 px-4 pt-6">
        <Button variant="secondary" className="h-11 w-full justify-start rounded-2xl" onClick={download}>
          <Download className="mr-2 h-4 w-4" />
          {moment.allowDownload ? "Save with watermark" : "Downloads off"}
        </Button>
        <Button
          variant="secondary"
          className="h-11 w-full justify-start rounded-2xl"
          onClick={() => {
            archiveMoment(moment.id);
            toast.success("Saved to your archive");
          }}
        >
          <Archive className="mr-2 h-4 w-4" /> Save to archive
        </Button>
        <Button
          variant="secondary"
          className="h-11 w-full justify-start rounded-2xl text-destructive"
          onClick={() => {
            deleteMoment(moment.id);
            toast.success("Moment deleted");
            navigate({ to: "/" });
          }}
        >
          <Trash2 className="mr-2 h-4 w-4" /> Delete moment
        </Button>
      </section>
    </main>
  );
}

function Stat({ icon, value, label }: { icon: React.ReactNode; value: string; label: string }) {
  return (
    <div className="grid place-items-center gap-1 rounded-2xl bg-secondary/60 py-3">
      <span className="text-muted-foreground">{icon}</span>
      <span className="text-sm font-bold leading-none">{value}</span>
      <span className="text-[10.5px] text-muted-foreground">{label}</span>
    </div>
  );
}