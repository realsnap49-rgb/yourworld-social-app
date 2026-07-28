import { createFileRoute } from "@tanstack/react-router";
import { ChannelHeader } from "@/components/yw/ChannelHeader";
import { channelStats, channelSubscribers, formatCount } from "@/lib/channel-data";

export const Route = createFileRoute("/channel/subscribers")({
  head: () => ({
    meta: [
      { title: "Channel Subscribers — YourWorld" },
      { name: "description", content: "See who subscribed to your channel and when they joined." },
      { property: "og:title", content: "Channel Subscribers — YourWorld" },
      { property: "og:description", content: "Your recent subscribers on YourWorld." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: ChannelSubscribers,
});

function ChannelSubscribers() {
  return (
    <main className="min-h-screen pb-12">
      <ChannelHeader title="Subscribers" />

      <div className="px-4 pt-4">
        <div className="surface-card rounded-3xl p-4">
          <p className="font-display text-2xl font-bold">{formatCount(channelStats.subscribers)}</p>
          <p className="text-xs text-muted-foreground">Total subscribers · +284 this week</p>
        </div>
      </div>

      <ul className="space-y-2 px-4 pt-4">
        {channelSubscribers.map((s, i) => (
          <li
            key={s.id}
            className="surface-card animate-rise flex items-center gap-3 rounded-2xl p-3"
            style={{ animationDelay: `${i * 35}ms` }}
          >
            <span
              aria-hidden
              className="grid h-10 w-10 shrink-0 place-items-center rounded-full text-sm font-semibold text-background"
              style={{ background: `oklch(0.72 0.15 ${s.hue})` }}
            >
              {s.name.charAt(0)}
            </span>
            <span className="min-w-0 flex-1">
              <span className="block truncate text-sm font-medium">{s.name}</span>
              <span className="block truncate text-xs text-muted-foreground">@{s.handle}</span>
            </span>
            <span className="shrink-0 text-[11px] text-muted-foreground">{s.since}</span>
          </li>
        ))}
      </ul>
    </main>
  );
}
