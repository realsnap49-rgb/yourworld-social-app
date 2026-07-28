import reel1 from "@/assets/reel-1.jpg";
import reel2 from "@/assets/reel-2.jpg";
import reel3 from "@/assets/reel-3.jpg";
import post1 from "@/assets/post-1.jpg";

export type User = {
  id: string;
  username: string;
  name: string;
  hue: number;
  bio?: string;
};

export const currentUser: User = {
  id: "u0",
  username: "you",
  name: "Your World",
  hue: 320,
  bio:
    "Night photographer 🌃 reel maker · collecting small moments\n" +
    "Neon streets, slow mornings and long exposures ✨\n" +
    "Shot on 35mm · edits in the dark\n" +
    "#nightwalk #neon #filmlook — collabs open, DM @riko.night\n" +
    "New drop every Friday → https://yourworld.app/you",
};

export const users: User[] = [
  { id: "u1", username: "riko.night", name: "Riko Tan", hue: 300 },
  { id: "u2", username: "sea.salt", name: "Mara Vega", hue: 190 },
  { id: "u3", username: "spinsolo", name: "Ada Kim", hue: 40 },
  { id: "u4", username: "slowbrunch", name: "Noah Ferre", hue: 15 },
  { id: "u5", username: "wavelen", name: "Kai Oduya", hue: 250 },
  { id: "u6", username: "moss.club", name: "Ines Roth", hue: 150 },
];

export const byId = (id: string) => users.find((u) => u.id === id) ?? currentUser;

export type Moment = {
  id: string;
  userId: string;
  image: string;
  seen: boolean;
};

export const moments: Moment[] = [
  { id: "m1", userId: "u1", image: reel1, seen: false },
  { id: "m2", userId: "u2", image: reel2, seen: false },
  { id: "m3", userId: "u3", image: reel3, seen: false },
  { id: "m4", userId: "u4", image: post1, seen: true },
  { id: "m5", userId: "u5", image: reel2, seen: true },
  { id: "m6", userId: "u6", image: reel1, seen: true },
];

export type Post = {
  id: string;
  userId: string;
  image: string;
  caption: string;
  hashtags: string[];
  likes: number;
  comments: Comment[];
  location?: string;
  time: string;
  allowDownload: boolean;
};

export type Comment = {
  id: string;
  userId: string;
  text: string;
  time: string;
};

export const posts: Post[] = [
  {
    id: "p1",
    userId: "u1",
    image: reel1,
    caption: "Shinjuku after the rain. The signs do all the work.",
    hashtags: ["nightwalk", "tokyo", "neon"],
    likes: 12840,
    location: "Tokyo, Japan",
    time: "2h",
    allowDownload: true,
    comments: [
      { id: "c1", userId: "u2", text: "This palette is unreal 🔥", time: "1h" },
      { id: "c2", userId: "u5", text: "what lens?", time: "42m" },
    ],
  },
  {
    id: "p2",
    userId: "u4",
    image: post1,
    caption: "Sunday table. No plans, only pastries.",
    hashtags: ["brunch", "slowmornings"],
    likes: 4021,
    location: "Lisbon",
    time: "5h",
    allowDownload: false,
    comments: [{ id: "c3", userId: "u6", text: "saving this for next weekend", time: "3h" }],
  },
  {
    id: "p3",
    userId: "u2",
    image: reel2,
    caption: "Golden hour barrels. Salt in everything for a week.",
    hashtags: ["surf", "goldenhour", "ocean"],
    likes: 30219,
    location: "Ericeira",
    time: "9h",
    allowDownload: true,
    comments: [
      { id: "c4", userId: "u1", text: "frame of the year", time: "8h" },
      { id: "c5", userId: "u3", text: "🌊🌊🌊", time: "6h" },
    ],
  },
];

export type Reel = {
  id: string;
  userId: string;
  poster: string;
  caption: string;
  hashtags: string[];
  audio: string;
  likes: number;
  commentCount: number;
  shares: number;
  allowDownload: boolean;
};

export const reels: Reel[] = [
  {
    id: "r1",
    userId: "u1",
    poster: reel1,
    caption: "3am in Kabukicho, nobody around but the signs",
    hashtags: ["tokyo", "nightlife", "cinematic"],
    audio: "midnight drive — lowtide",
    likes: 184300,
    commentCount: 2140,
    shares: 9820,
    allowDownload: true,
  },
  {
    id: "r2",
    userId: "u2",
    poster: reel2,
    caption: "Held the line for 4 seconds. Felt like a year.",
    hashtags: ["surf", "sunset"],
    audio: "saltwater — mara vega",
    likes: 92110,
    commentCount: 830,
    shares: 3402,
    allowDownload: false,
  },
  {
    id: "r3",
    userId: "u3",
    poster: reel3,
    caption: "One light, one take.",
    hashtags: ["dance", "studio", "onetake"],
    audio: "spotlight (slowed) — ada k",
    likes: 271004,
    commentCount: 5120,
    shares: 18300,
    allowDownload: true,
  },
];

export type ChatThread = {
  id: string;
  kind: "dm" | "group";
  title: string;
  userIds: string[];
  unread: number;
  lastMessage: string;
  lastTime: string;
  online?: boolean;
};

export const threads: ChatThread[] = [
  {
    id: "t1",
    kind: "dm",
    title: "Riko Tan",
    userIds: ["u1"],
    unread: 2,
    lastMessage: "sending the raw files tonight",
    lastTime: "2m",
    online: true,
  },
  {
    id: "t2",
    kind: "group",
    title: "Night Shooters",
    userIds: ["u1", "u3", "u5"],
    unread: 8,
    lastMessage: "Kai: meet at the crossing at 9",
    lastTime: "18m",
  },
  {
    id: "t3",
    kind: "dm",
    title: "Mara Vega",
    userIds: ["u2"],
    unread: 0,
    lastMessage: "voice message · 0:34",
    lastTime: "1h",
    online: true,
  },
  {
    id: "t4",
    kind: "group",
    title: "Lisbon crew 🇵🇹",
    userIds: ["u4", "u6", "u2"],
    unread: 0,
    lastMessage: "Ines: photo",
    lastTime: "yesterday",
  },
];

export type Message = {
  id: string;
  from: "me" | string;
  kind: "text" | "voice" | "image";
  body: string;
  time: string;
  read: boolean;
  duration?: string;
  image?: string;
};

export const messagesByThread: Record<string, Message[]> = {
  t1: [
    { id: "x1", from: "u1", kind: "text", body: "yo, the neon set came out insane", time: "21:04", read: true },
    { id: "x2", from: "me", kind: "text", body: "post the third one, trust me", time: "21:05", read: true },
    { id: "x3", from: "u1", kind: "image", body: "", image: reel1, time: "21:06", read: true },
    { id: "x4", from: "u1", kind: "voice", body: "", duration: "0:12", time: "21:07", read: false },
    { id: "x5", from: "me", kind: "text", body: "ok that's the cover 🔥", time: "21:09", read: false },
  ],
  t2: [
    { id: "y1", from: "u5", kind: "text", body: "meet at the crossing at 9", time: "20:40", read: true },
    { id: "y2", from: "u3", kind: "text", body: "bringing the 35mm", time: "20:42", read: true },
    { id: "y3", from: "me", kind: "text", body: "on my way", time: "20:45", read: true },
  ],
  t3: [
    { id: "z1", from: "u2", kind: "voice", body: "", duration: "0:34", time: "18:12", read: true },
    { id: "z2", from: "me", kind: "text", body: "haha the wipeout part killed me", time: "18:20", read: true },
  ],
  t4: [
    { id: "w1", from: "u6", kind: "image", body: "", image: post1, time: "11:02", read: true },
    { id: "w2", from: "u4", kind: "text", body: "same table next sunday?", time: "11:30", read: true },
  ],
};

export const profileStats = { posts: 148, followers: 24800, following: 612 };

export const formatCount = (n: number) => {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1).replace(/\.0$/, "")}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1).replace(/\.0$/, "")}K`;
  return `${n}`;
};