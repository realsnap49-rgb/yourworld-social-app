import { useMemo } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { ChevronLeft, MessageCircle } from "lucide-react";
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
        <div className="px-6 py-20 text-center">
          <span className="mx-auto grid h-12 w-12 place-items-center rounded-2xl bg-secondary">
            <MessageCircle className="h-5 w-5" strokeWidth={1.7} />
          </span>
          <p className="pt-4 text-sm font-semibold">No Orbit conversations yet</p>
          <p className="pt-1 text-xs leading-relaxed text-muted-foreground">
            Connect with someone in Orbit to start a private conversation here.
          </p>
        </div>
      ) : (
        <ul className="px-3 pt-3">
          {threads.map((p) => (
            <li key={p.id}>
              <Link
                to="/orbit/$profileId"
                params={{ profileId: p.id }}
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
