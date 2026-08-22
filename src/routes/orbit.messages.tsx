import { useMemo, useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import {
  ChevronLeft,
  Heart,
  MessageCircle,
  Search,
  Sparkle,
  Sparkles,
  Inbox,
} from "lucide-react";
import { useOrbitProfiles } from "@/lib/orbit-live";
import { useOrbit } from "@/lib/orbit-store";
import { useOrbitMatches, useOrbitThreadPreviews } from "@/lib/orbit-match";
import type { OrbitProfile } from "@/lib/orbit-data";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/orbit/messages")({
  head: () => ({
    meta: [
      { title: "Orbit Messages & Matches — YourWorld" },
      {
        name: "description",
        content:
          "Your private Orbit chats, pending requests and mutual matches — kept separate from your main YourWorld conversations.",
      },
      { property: "og:title", content: "Orbit Messages & Matches — YourWorld" },
      {
        property: "og:description",
        content: "Private Orbit chats, requests and mutual matches in one place.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: OrbitMessagesPage,
});

type Tab = "chats" | "requests" | "matches";

function timeShort(at: number) {
  const diff = Date.now() - at;
  const m = Math.floor(diff / 60000);
  if (m < 1) return "now";
  if (m < 60) return `${m}m`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h`;
  return `${Math.floor(h / 24)}d`;
}

function Avatar({ p, size = 48 }: { p: OrbitProfile; size?: number }) {
  return p.photo ? (
    <img
      src={p.photo}
      alt={p.name}
      loading="lazy"
      style={{ width: size, height: size }}
      className="shrink-0 rounded-full object-cover"
    />
  ) : (
    <span
      style={{
        width: size,
        height: size,
        backgroundImage: `linear-gradient(140deg, oklch(0.55 0.17 ${p.hue}), oklch(0.3 0.1 ${p.hue + 40}))`,
      }}
      aria-hidden
      className="grid shrink-0 place-items-center rounded-full font-display text-base font-bold text-background"
    >
      {p.name.charAt(0)}
    </span>
  );
}

function OrbitMessagesPage() {
  const orbit = useOrbit();
  const { profiles: orbitProfiles } = useOrbitProfiles();
  const { mutual, likesMe, likedByMe } = useOrbitMatches();
  const previews = useOrbitThreadPreviews();
  const [tab, setTab] = useState<Tab>("chats");
  const [q, setQ] = useState("");

  const visible = useMemo(
    () =>
      orbitProfiles.filter(
        (p) =>
          !orbit.privacy.blocked.includes(p.id) && !orbit.privacy.hiddenFrom.includes(p.id),
      ),
    [orbitProfiles, orbit.privacy.blocked, orbit.privacy.hiddenFrom],
  );

  const byId = useMemo(() => new Map(visible.map((p) => [p.id, p])), [visible]);

  const chats = useMemo(() => {
    const ids = new Set<string>([
      ...Object.keys(orbit.connected).filter((id) => orbit.connected[id]),
      ...Object.keys(previews),
      ...Object.entries(orbit.requests)
        .filter(([, r]) => r.status === "accepted")
        .map(([id]) => id),
    ]);
    return [...ids]
      .map((id) => byId.get(id))
      .filter((p): p is OrbitProfile => !!p)
      .sort((a, b) => (previews[b.id]?.at ?? 0) - (previews[a.id]?.at ?? 0));
  }, [orbit.connected, orbit.requests, previews, byId]);

  const requests = useMemo(
    () =>
      Object.entries(orbit.requests)
        .filter(([, r]) => r.status === "pending")
        .map(([id, r]) => ({ p: byId.get(id), r }))
        .filter((x): x is { p: OrbitProfile; r: (typeof orbit.requests)[string] } => !!x.p),
    [orbit.requests, byId],
  );

  const matches = useMemo(() => {
    const set = new Set(mutual);
    const likeSet = new Set(likesMe);
    const mineSet = new Set(likedByMe);
    return visible
      .filter((p) => set.has(p.id) || likeSet.has(p.id) || mineSet.has(p.id))
      .map((p) => ({
        p,
        mutual: set.has(p.id),
        theyLiked: likeSet.has(p.id),
      }))
      .sort((a, b) => Number(b.mutual) - Number(a.mutual) || Number(b.theyLiked) - Number(a.theyLiked));
  }, [visible, mutual, likesMe, likedByMe]);

  const filter = <T extends { p?: OrbitProfile } | OrbitProfile>(list: T[]) => list;
  const term = q.trim().toLowerCase();
  const chatList = term ? chats.filter((p) => p.name.toLowerCase().includes(term)) : chats;
  const matchList = term ? matches.filter((m) => m.p.name.toLowerCase().includes(term)) : matches;
  const reqList = term ? requests.filter((r) => r.p.name.toLowerCase().includes(term)) : requests;
  void filter;

  const counts = { chats: chats.length, requests: requests.length, matches: mutual.length };

  return (
    <main className="min-h-screen pb-16">
      <header className="sticky top-0 z-40 border-b border-border glass px-3 pb-2.5 pt-3">
        <div className="flex items-center gap-2">
          <Link
            to="/orbit"
            aria-label="Back to Orbit"
            className="grid h-9 w-9 place-items-center rounded-full transition-transform active:scale-90"
          >
            <ChevronLeft className="h-5 w-5" strokeWidth={1.8} />
          </Link>
          <h1 className="font-display text-lg font-bold">Orbit</h1>
          <Link
            to="/orbit"
            className="ml-auto flex items-center gap-1.5 rounded-full chip px-3 py-1.5 text-[11px] font-semibold transition-transform active:scale-95"
          >
            <Search className="h-3.5 w-3.5" strokeWidth={1.8} />
            Discover
          </Link>
        </div>

        <div className="mt-2.5 flex items-center gap-2 rounded-full bg-secondary px-3 py-2">
          <Search className="h-4 w-4 shrink-0 text-muted-foreground" strokeWidth={1.8} />
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search Orbit people"
            aria-label="Search Orbit people"
            className="min-w-0 flex-1 bg-transparent text-sm outline-none placeholder:text-muted-foreground"
          />
        </div>

        <div className="mt-2.5 grid grid-cols-3 gap-1 rounded-full bg-secondary p-1">
          {(["chats", "requests", "matches"] as Tab[]).map((t) => (
            <button
              key={t}
              type="button"
              onClick={() => setTab(t)}
              aria-pressed={tab === t}
              className={cn(
                "relative rounded-full py-1.5 text-[12px] font-semibold capitalize transition-colors",
                tab === t ? "bg-background shadow-sm" : "text-muted-foreground",
              )}
            >
              {t}
              {counts[t] > 0 && (
                <span className="ml-1.5 rounded-full bg-primary px-1.5 py-0.5 text-[9px] font-bold leading-none text-primary-foreground">
                  {counts[t]}
                </span>
              )}
            </button>
          ))}
        </div>
      </header>

      {tab === "chats" && (
        <section aria-label="Orbit chats" className="px-3 pt-3">
          {chatList.length === 0 ? (
            <EmptyState
              icon={MessageCircle}
              title="No conversations yet"
              body="Connect or match with someone in Orbit to start chatting."
            />
          ) : (
            <ul>
              {chatList.map((p) => {
                const prev = previews[p.id];
                return (
                  <li key={p.id}>
                    <Link
                      to="/orbit/chat/$userId"
                      params={{ userId: p.id }}
                      className="flex items-center gap-3 rounded-2xl px-2 py-2.5 transition-colors hover:bg-[color-mix(in_oklab,var(--foreground)_6%,transparent)]"
                    >
                      <Avatar p={p} />
                      <span className="min-w-0 flex-1">
                        <span className="flex items-baseline gap-2">
                          <span className="min-w-0 flex-1 truncate text-sm font-semibold">
                            {p.name}
                          </span>
                          {prev && (
                            <span className="shrink-0 text-[11px] text-muted-foreground">
                              {timeShort(prev.at)}
                            </span>
                          )}
                        </span>
                        <span className="block truncate text-xs text-muted-foreground">
                          {prev
                            ? `${prev.mine ? "You: " : ""}${prev.text}`
                            : "Connected on Orbit · say hello"}
                        </span>
                      </span>
                      {mutual.includes(p.id) && (
                        <Sparkles className="h-4 w-4 shrink-0 text-primary" strokeWidth={1.8} />
                      )}
                    </Link>
                  </li>
                );
              })}
            </ul>
          )}
        </section>
      )}

      {tab === "requests" && (
        <section aria-label="Orbit requests" className="px-3 pt-3">
          {reqList.length === 0 ? (
            <EmptyState
              icon={Inbox}
              title="No pending requests"
              body="Chat requests you send or receive show up here until they're answered."
            />
          ) : (
            <ul className="space-y-2">
              {reqList.map(({ p, r }) => (
                <li key={p.id} className="surface-card rounded-2xl px-3 py-3">
                  <div className="flex items-center gap-3">
                    <Avatar p={p} size={44} />
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-semibold">{p.name}</p>
                      <p className="truncate text-xs text-muted-foreground">
                        {r.direction === "incoming" ? "Wants to chat" : "Request sent"}
                        {r.intro ? ` · ${r.intro}` : ""}
                      </p>
                    </div>
                  </div>
                  <div className="mt-2.5 flex gap-2">
                    {r.direction === "incoming" ? (
                      <>
                        <button
                          type="button"
                          onClick={() => orbit.acceptRequest(p.id)}
                          className="flex-1 rounded-full bg-primary py-2 text-xs font-semibold text-primary-foreground transition-transform active:scale-95"
                        >
                          Accept
                        </button>
                        <button
                          type="button"
                          onClick={() => orbit.declineRequest(p.id)}
                          className="flex-1 rounded-full border border-border py-2 text-xs font-semibold transition-transform active:scale-95"
                        >
                          Decline
                        </button>
                      </>
                    ) : (
                      <Link
                        to="/orbit/chat/$userId"
                        params={{ userId: p.id }}
                        className="flex-1 rounded-full border border-border py-2 text-center text-xs font-semibold transition-transform active:scale-95"
                      >
                        Open request
                      </Link>
                    )}
                  </div>
                </li>
              ))}
            </ul>
          )}
        </section>
      )}

      {tab === "matches" && (
        <section aria-label="Orbit matches" className="px-3 pt-3">
          {matchList.length === 0 ? (
            <EmptyState
              icon={Heart}
              title="No matches yet"
              body="Tap Match on a profile in Orbit — when they match you back you'll both unlock chat."
            />
          ) : (
            <ul className="space-y-2">
              {matchList.map(({ p, mutual: isMutual, theyLiked }) => (
                <li key={p.id} className="surface-card flex items-center gap-3 rounded-2xl px-3 py-2.5">
                  <Link
                    to="/orbit/$profileId"
                    params={{ profileId: p.id }}
                    className="flex min-w-0 flex-1 items-center gap-3"
                  >
                    <Avatar p={p} size={44} />
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-sm font-semibold">
                        {p.name}, {p.age}
                      </span>
                      <span className="block truncate text-xs text-muted-foreground">
                        {isMutual
                          ? "It's a match — chat unlocked"
                          : theyLiked
                            ? "Matched you — match back to chat"
                            : "Waiting for them to match back"}
                      </span>
                    </span>
                  </Link>
                  {isMutual ? (
                    <Link
                      to="/orbit/chat/$userId"
                      params={{ userId: p.id }}
                      className="shrink-0 rounded-full bg-primary px-3.5 py-1.5 text-[11px] font-semibold text-primary-foreground transition-transform active:scale-95"
                    >
                      Chat
                    </Link>
                  ) : (
                    <span
                      className={cn(
                        "shrink-0 rounded-full px-3 py-1.5 text-[11px] font-semibold",
                        theyLiked ? "bg-foreground text-background" : "chip text-muted-foreground",
                      )}
                    >
                      {theyLiked ? "Match back" : "Pending"}
                    </span>
                  )}
                </li>
              ))}
            </ul>
          )}
        </section>
      )}
    </main>
  );
}

function EmptyState({
  icon: Icon,
  title,
  body,
}: {
  icon: typeof MessageCircle;
  title: string;
  body: string;
}) {
  return (
    <div className="px-5 pt-10">
      <div className="relative mx-auto grid h-28 w-28 place-items-center">
        <span className="absolute inset-0 animate-[spin_18s_linear_infinite] rounded-full border border-border" />
        <span className="absolute inset-4 animate-[spin_12s_linear_infinite_reverse] rounded-full border border-dashed border-border" />
        <span className="absolute inset-0 animate-[pulse_3s_ease-in-out_infinite] rounded-full bg-[radial-gradient(circle,color-mix(in_oklab,var(--primary)_22%,transparent),transparent_65%)]" />
        <span className="grid h-13 w-13 place-items-center rounded-2xl bg-secondary p-3.5 shadow-lg">
          <Icon className="h-6 w-6" strokeWidth={1.6} />
        </span>
        <Sparkle
          className="absolute right-1 top-2 h-4 w-4 animate-[pulse_2.4s_ease-in-out_infinite] text-muted-foreground"
          strokeWidth={1.6}
        />
      </div>
      <p className="pt-6 text-center font-display text-base font-bold">{title}</p>
      <p className="mx-auto max-w-xs pt-1 text-center text-xs leading-relaxed text-muted-foreground">
        {body}
      </p>
      <div className="flex justify-center pt-5">
        <Link
          to="/orbit"
          className="flex items-center gap-1.5 rounded-full bg-primary px-4 py-2.5 text-xs font-semibold text-primary-foreground transition-transform active:scale-95"
        >
          <Search className="h-4 w-4" strokeWidth={1.8} />
          Discover people
        </Link>
      </div>
    </div>
  );
}
