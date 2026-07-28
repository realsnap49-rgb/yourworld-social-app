import reel1 from "@/assets/reel-1.jpg";
import reel2 from "@/assets/reel-2.jpg";
import reel3 from "@/assets/reel-3.jpg";
import post1 from "@/assets/post-1.jpg";

export type ChannelItem = {
  id: string;
  title: string;
  thumb: string;
  views: number;
  likes: number;
  publishedAt: string;
};

export const channelVideos: ChannelItem[] = [
  { id: "v1", title: "Night city in 4K — full walk", thumb: reel1, views: 128400, likes: 9120, publishedAt: "2 days ago" },
  { id: "v2", title: "Studio session, one take", thumb: reel3, views: 64230, likes: 4310, publishedAt: "1 week ago" },
  { id: "v3", title: "Coast to coast in 12 hours", thumb: reel2, views: 41890, likes: 3020, publishedAt: "3 weeks ago" },
];

export const channelReels: ChannelItem[] = [
  { id: "r1", title: "Neon alley loop", thumb: reel2, views: 302100, likes: 21400, publishedAt: "1 day ago" },
  { id: "r2", title: "Sunrise surf", thumb: reel1, views: 188900, likes: 12800, publishedAt: "4 days ago" },
  { id: "r3", title: "Golden hour spin", thumb: reel3, views: 96540, likes: 7010, publishedAt: "2 weeks ago" },
];

export const channelPosts: ChannelItem[] = [
  { id: "p1", title: "Behind the scenes of last night's shoot", thumb: post1, views: 24100, likes: 1880, publishedAt: "5 hours ago" },
  { id: "p2", title: "Gear list everyone keeps asking for", thumb: reel1, views: 18400, likes: 1240, publishedAt: "6 days ago" },
];

export type Subscriber = { id: string; name: string; handle: string; since: string; hue: number };

export const channelSubscribers: Subscriber[] = [
  { id: "s1", name: "Riko Tan", handle: "riko.night", since: "Today", hue: 300 },
  { id: "s2", name: "Mara Vega", handle: "sea.salt", since: "Yesterday", hue: 190 },
  { id: "s3", name: "Ada Kim", handle: "spinsolo", since: "3 days ago", hue: 40 },
  { id: "s4", name: "Noah Ferre", handle: "slowbrunch", since: "1 week ago", hue: 15 },
  { id: "s5", name: "Kai Oduya", handle: "wavelen", since: "2 weeks ago", hue: 250 },
  { id: "s6", name: "Ines Roth", handle: "moss.club", since: "1 month ago", hue: 150 },
];

export const channelStats = {
  subscribers: 12840,
  views30d: 486320,
  watchHours: 3120,
  posts: channelPosts.length + channelVideos.length + channelReels.length,
};

/** Views for the last 14 days — used by the lightweight sparkline chart. */
export const viewsSeries = [
  18, 22, 19, 31, 28, 35, 41, 38, 47, 52, 49, 61, 58, 72,
];

export const MONETIZATION = { minSubscribers: 1000, minWatchHours: 4000 };

export const formatCount = (n: number) =>
  n >= 1_000_000
    ? `${(n / 1_000_000).toFixed(1).replace(/\.0$/, "")}M`
    : n >= 1_000
      ? `${(n / 1_000).toFixed(1).replace(/\.0$/, "")}K`
      : `${n}`;
