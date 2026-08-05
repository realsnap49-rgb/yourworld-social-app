import { useMemo, useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { ChevronLeft, Heart, MessageCircle, Search, Sparkle } from "lucide-react";
import { orbitProfiles } from "@/lib/orbit-data";
import { useOrbit } from "@/lib/orbit-store";

export const Route = createFileRoute("/orbit/messages")({
  head: () => ({
    meta: [
      { title: "Orbit Messages — YourWorld" },
      {
        name: "description",
        content:
          "Private Orbit conversations with people you've connected with, kept separate from your main YourWorld chats.",
      },
      { property: "og:title", content: "Orbit Messages — YourWorld" },
      {
        property: "og:description",
        content: "Your private Orbit conversations, separate from main chats.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: OrbitMessagesPage,
});

function OrbitMessagesPage() {
  const orbit = useOrbit();
  const [showMatches, setShowMatches] = useState(false);

  const threads = useMemo(
    () =>
      orbitProfiles.filter(
        (p) =>
          orbit.connected[p.id] &&
          !orbit.privacy.blocked.includes(p.id) &&
          !orbit.privacy.hiddenFrom.includes(p.id),
      ),
    [orbit.connected, orbit.privacy.blocked, orbit.privacy.hiddenFrom],
  );

  const visible = useMemo(
    () =>
      orbitProfiles.filter(
        (p) =>
          !orbit.privacy.blocked.includes(p.id) && !orbit.privacy.hiddenFrom.includes(p.id),
      ),
    [orbit.privacy.blocked, orbit.privacy.hiddenFrom],
  );

  const matches = useMemo(
    () => visible.filter((p) => orbit.liked[p.id]),
    [visible, orbit.liked],
  );

  const suggested = useMemo(
    () => visible.filter((p) => !orbit.connected[p.id]).slice(0, 4),
    [visible, orbit.connected],
  );

  const listed = showMatches ? matches : suggested;

  return (
    <main className="min-h-screen pb-10">
      <header className="sticky top-0 z-40 flex items-center gap-2 border-b border-border glass px-3 py-3">
        <Link
          to="/orbit"
          aria-label="Back to Orbit"
          className="grid h-9 w-9 place-items-center rounded-full transition-transform active:scale-90"
        >
          <ChevronLeft className="h-5 w-5" strokeWidth={1.8} />
        </Link>
        <h1 className="font-display text-lg font-bold">Orbit Messages</h1>
      </header>

      {threads.length === 0 ? (
        <div className="px-5 pt-10">
          <div className="relative mx-auto grid h-32 w-32 place-items-center">
            <span className="absolute inset-0 animate-[spin_18s_linear_infinite] rounded-full border border-border" />
            <span className="absolute inset-4 animate-[spin_12s_linear_infinite_reverse] rounded-full border border-dashed border-border" />
            <span className="absolute inset-0 animate-[pulse_3s_ease-in-out_infinite] rounded-full bg-[radial-gradient(circle,color-mix(in_oklab,var(--primary)_22%,transparent),transparent_65%)]" />
            <span className="grid h-14 w-14 place-items-center rounded-2xl bg-secondary shadow-lg">
              <MessageCircle className="h-6 w-6" strokeWidth={1.6} />
            </span>
            <Sparkle
              className="absolute right-1 top-2 h-4 w-4 animate-[pulse_2.4s_ease-in-out_infinite] text-muted-foreground"
              strokeWidth={1.6}
            />
          </div>

          <p className="pt-6 text-center font-display text-base font-bold">No conversations yet</p>
          <p className="pt-1 text-center text-xs leading-relaxed text-muted-foreground">
            Connect with someone in Orbit to start chatting.
          </p>

          <div className="flex items-center justify-center gap-2 pt-5">
            <Link
              to="/orbit"
              className="flex items-center gap-1.5 rounded-full bg-primary px-4 py-2.5 text-xs font-semibold text-primary-foreground transition-transform active:scale-95"
            >
              <Search className="h-4 w-4" strokeWidth={1.8} />
              Discover People
            </Link>
            <button
              type="button"
              onClick={() => setShowMatches((v) => !v)}
              aria-pressed={showMatches}
              className="flex items-center gap-1.5 rounded-full border border-border px-4 py-2.5 text-xs font-semibold transition-transform active:scale-95"
            >
              <Heart
                className={showMatches ? "h-4 w-4 fill-current text-primary" : "h-4 w-4"}
                strokeWidth={1.8}
              />
              View Matches
            </button>
          </div>

          <p className="px-1 pt-8 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
            {showMatches ? "Your matches" : "Suggested connections"}
          </p>

          {listed.length === 0 ? (
            <p className="pt-3 text-xs text-muted-foreground">
              No matches yet — like a few profiles in Orbit first.
            </p>
          ) : (
            <ul className="pt-2">
              {listed.map((p) => (
                <li key={p.id}>
                  <Link
                    to="/orbit/$profileId"
                    params={{ profileId: p.id }}
                    className="flex items-center gap-3 rounded-2xl px-1 py-2.5 transition-colors hover:bg-[color-mix(in_oklab,var(--foreground)_6%,transparent)]"
                  >
                    <img
                      src={p.photo}
                      alt={p.name}
                      loading="lazy"
                      className="h-11 w-11 shrink-0 rounded-full object-cover"
                    />
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-sm font-semibold">{p.name}</span>
                      <span className="block truncate text-xs text-muted-foreground">
                        {p.city} · {p.hobbies.slice(0, 2).join(", ")}
                      </span>
                    </span>
                    <span className="shrink-0 rounded-full border border-border px-3 py-1.5 text-[11px] font-semibold">
                      View
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </div>
      ) : (
        <ul className="px-3 pt-3">
          {threads.map((p) => (
            <li key={p.id}>
              <Link
                to="/orbit/chat/$userId"
                params={{ userId: p.id }}
                className="flex items-center gap-3 rounded-2xl px-2 py-3 transition-colors hover:bg-[color-mix(in_oklab,var(--foreground)_6%,transparent)]"
              >
                <img
                  src={p.photo}
                  alt={p.name}
                  loading="lazy"
                  className="h-12 w-12 shrink-0 rounded-full object-cover"
                />
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-sm font-semibold">{p.name}</span>
                  <span className="block truncate text-xs text-muted-foreground">
                    Connected on Orbit · say hello
                  </span>
                </span>
                <MessageCircle
                  className="h-[18px] w-[18px] shrink-0 text-muted-foreground"
                  strokeWidth={1.7}
                />
              </Link>
            </li>
          ))}
        </ul>
      )}
    </main>
  );
}
