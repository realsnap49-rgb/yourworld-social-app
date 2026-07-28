import { createFileRoute } from "@tanstack/react-router";
import { TrendingUp } from "lucide-react";
import { ChannelHeader, StatTile } from "@/components/yw/ChannelHeader";
import {
  channelStats,
  formatCount,
  viewsSeries,
  channelVideos,
  channelReels,
} from "@/lib/channel-data";

export const Route = createFileRoute("/channel/analytics")({
  head: () => ({
    meta: [
      { title: "Channel Analytics — YourWorld" },
      {
        name: "description",
        content: "Views, watch time, subscriber growth and top performing content for your channel.",
      },
      { property: "og:title", content: "Channel Analytics — YourWorld" },
      { property: "og:description", content: "Understand how your channel is growing on YourWorld." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: ChannelAnalytics,
});

const top = [...channelVideos, ...channelReels].sort((a, b) => b.views - a.views).slice(0, 4);

function ChannelAnalytics() {
  const max = Math.max(...viewsSeries);

  return (
    <main className="min-h-screen pb-12">
      <ChannelHeader title="Analytics" />

      <div className="grid grid-cols-2 gap-3 px-4 pt-4">
        <StatTile label="Views · 30d" value={formatCount(channelStats.views30d)} hint="+18% vs last month" />
        <StatTile label="Watch hours" value={formatCount(channelStats.watchHours)} hint="Last 365 days" />
        <StatTile label="Subscribers" value={formatCount(channelStats.subscribers)} hint="+284 this week" />
        <StatTile label="Avg. view rate" value="61%" hint="Across all formats" />
      </div>

      <div className="px-4 pt-4">
        <section className="surface-card rounded-3xl p-4">
          <div className="flex items-center gap-2">
            <TrendingUp className="h-4 w-4 text-muted-foreground" strokeWidth={1.8} />
            <p className="text-sm font-semibold">Daily views · last 14 days</p>
          </div>
          <div className="flex h-28 items-end gap-1.5 pt-4" role="img" aria-label="Daily views trend for the last 14 days">
            {viewsSeries.map((v, i) => (
              <span
                key={i}
                className="flex-1 rounded-t-md bg-foreground/80"
                style={{ height: `${(v / max) * 100}%` }}
              />
            ))}
          </div>
          <p className="pt-2 text-[11px] text-muted-foreground">
            Peak day {formatCount(max * 1000)} views · trending upward
          </p>
        </section>
      </div>

      <div className="px-4 pt-4">
        <section className="surface-card overflow-hidden rounded-3xl">
          <p className="px-4 pt-3.5 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            Top performing
          </p>
          <ul className="pt-1">
            {top.map((t) => (
              <li
                key={t.id}
                className="flex items-center gap-3 border-b border-border px-4 py-3 last:border-0"
              >
                <img src={t.thumb} alt="" loading="lazy" className="h-11 w-16 rounded-xl object-cover" />
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-sm font-medium">{t.title}</span>
                  <span className="block text-[11px] text-muted-foreground">{t.publishedAt}</span>
                </span>
                <span className="shrink-0 text-xs font-semibold">{formatCount(t.views)}</span>
              </li>
            ))}
          </ul>
        </section>
      </div>
    </main>
  );
}
