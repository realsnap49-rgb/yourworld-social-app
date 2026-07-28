import { createFileRoute, Link, Navigate } from "@tanstack/react-router";
import {
  BarChart3,
  Users,
  PlaySquare,
  FileText,
  Clapperboard,
  Coins,
  Pencil,
  Globe2,
  Lock,
  MapPin,
  ChevronLeft,
  ChevronRight,
  type LucideIcon,
} from "lucide-react";
import { useChannel } from "@/lib/channel-store";
import {
  channelStats,
  formatCount,
  MONETIZATION,
  channelVideos,
  channelReels,
  channelPosts,
} from "@/lib/channel-data";
import { StatTile } from "@/components/yw/ChannelHeader";

export const Route = createFileRoute("/channel/")({
  head: () => ({
    meta: [
      { title: "Channel Dashboard — YourWorld" },
      {
        name: "description",
        content:
          "Your YourWorld channel dashboard: analytics, subscribers, videos, reels, posts and monetization in one place.",
      },
      { property: "og:title", content: "Channel Dashboard — YourWorld" },
      {
        property: "og:description",
        content: "Track growth, manage content and unlock monetization for your channel.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: ChannelDashboard,
});

const eligible =
  channelStats.subscribers >= MONETIZATION.minSubscribers &&
  channelStats.watchHours >= MONETIZATION.minWatchHours;

function ChannelDashboard() {
  const { channel, hasChannel, hydrated } = useChannel();

  if (!hydrated) return <main className="min-h-screen" />;
  if (!hasChannel || !channel) return <Navigate to="/channel/create" replace />;

  const links: { label: string; hint: string; icon: LucideIcon; to: string; params?: Record<string, string> }[] = [
    { label: "Analytics", hint: "Views, watch time, growth", icon: BarChart3, to: "/channel/analytics" },
    { label: "Subscribers", hint: `${formatCount(channelStats.subscribers)} total`, icon: Users, to: "/channel/subscribers" },
    { label: "Videos", hint: `${channelVideos.length} published`, icon: PlaySquare, to: "/channel/videos" },
    { label: "Posts", hint: `${channelPosts.length} published`, icon: FileText, to: "/channel/posts" },
    { label: "Reels", hint: `${channelReels.length} published`, icon: Clapperboard, to: "/channel/reels" },
    {
      label: "Monetization",
      hint: eligible ? "You're eligible — start earning" : "Locked until you meet the bar",
      icon: Coins,
      to: "/channel/monetization",
    },
  ];

  return (
    <main className="min-h-screen pb-12">
      <header className="sticky top-0 z-40 flex items-center gap-2 border-b border-border glass px-3 py-3">
        <Link
          to="/settings"
          aria-label="Back to settings"
          className="grid h-9 w-9 place-items-center rounded-full transition-transform active:scale-90"
        >
          <ChevronLeft className="h-5 w-5" strokeWidth={1.8} />
        </Link>
        <h1 className="font-display text-lg font-bold">Channel</h1>
        <Link
          to="/channel/create"
          aria-label="Edit channel"
          className="ml-auto grid h-9 w-9 place-items-center rounded-full chip transition-transform active:scale-90"
        >
          <Pencil className="h-[16px] w-[16px]" strokeWidth={1.6} />
        </Link>
      </header>

      <div className="px-4 pt-4">
        <div className="surface-card overflow-hidden rounded-[28px]">
          <div className="h-28 w-full bg-secondary">
            {channel.banner && (
              <img src={channel.banner} alt={`${channel.name} banner`} className="h-full w-full object-cover" />
            )}
          </div>
          <div className="-mt-8 px-4 pb-4">
            <div className="h-16 w-16 overflow-hidden rounded-full border-4 border-background bg-secondary">
              {channel.logo && (
                <img src={channel.logo} alt={`${channel.name} logo`} className="h-full w-full object-cover" />
              )}
            </div>
            <h2 className="pt-2 font-display text-lg font-bold">{channel.name}</h2>
            <p className="text-xs text-muted-foreground">@{channel.handle} · {channel.category}</p>
            {channel.description && (
              <p className="pt-2 text-sm leading-relaxed text-muted-foreground">{channel.description}</p>
            )}
            <div className="flex flex-wrap items-center gap-2 pt-3">
              <span className="chip inline-flex items-center gap-1 rounded-full px-3 py-1 text-[11px] font-medium">
                {channel.visibility === "public" ? (
                  <Globe2 className="h-3 w-3" strokeWidth={1.8} />
                ) : (
                  <Lock className="h-3 w-3" strokeWidth={1.8} />
                )}
                {channel.visibility === "public" ? "Public" : "Private"}
              </span>
              {channel.country && (
                <span className="chip inline-flex items-center gap-1 rounded-full px-3 py-1 text-[11px] font-medium">
                  <MapPin className="h-3 w-3" strokeWidth={1.8} />
                  {channel.country}
                </span>
              )}
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3 px-4 pt-4">
        <StatTile label="Subscribers" value={formatCount(channelStats.subscribers)} hint="+284 this week" />
        <StatTile label="Views · 30d" value={formatCount(channelStats.views30d)} hint="+18% vs last month" />
        <StatTile label="Watch hours" value={formatCount(channelStats.watchHours)} hint="Last 365 days" />
        <StatTile label="Published" value={`${channelStats.posts}`} hint="Videos, reels & posts" />
      </div>

      <div className="px-4 pt-4">
        <ul className="surface-card overflow-hidden rounded-3xl">
          {links.map((l, i) => (
            <li key={l.label} className="animate-rise" style={{ animationDelay: `${i * 28}ms` }}>
              <Link
                to={l.to}
                className="flex w-full items-center gap-3.5 border-b border-border px-4 py-3.5 text-left transition-colors last:border-0 hover:bg-[color-mix(in_oklab,var(--foreground)_6%,transparent)]"
              >
                <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full chip">
                  <l.icon className="h-[18px] w-[18px]" strokeWidth={1.6} />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-sm font-medium">{l.label}</span>
                  <span className="block truncate text-xs text-muted-foreground">{l.hint}</span>
                </span>
                <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground" />
              </Link>
            </li>
          ))}
        </ul>
      </div>
    </main>
  );
}
