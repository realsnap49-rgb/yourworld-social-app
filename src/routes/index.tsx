import { createFileRoute } from "@tanstack/react-router";
import { Heart, Search } from "lucide-react";
import { Stories } from "@/components/yw/Stories";
import { PostCard } from "@/components/yw/PostCard";
import { posts } from "@/lib/yw-data";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "YourWorld — Your feed of moments" },
      {
        name: "description",
        content:
          "Watch moments from friends, scroll a hand-picked feed, and like, comment, share or save what you love on YourWorld.",
      },
      { property: "og:title", content: "YourWorld — Your feed of moments" },
      {
        property: "og:description",
        content: "Moments, feed and reactions in one dark, fast social app.",
      },
    ],
  }),
  component: HomePage,
});

function HomePage() {
  return (
    <main className="grain relative pb-28">
      <div aria-hidden className="ambient-canvas" />
      <header className="header-lux sticky top-0 z-40 flex h-[54px] items-center justify-between gap-3 px-4">
        <div className="flex min-w-0 items-center gap-2.5">
          <span className="logo-mark grid h-7 w-7 shrink-0 place-items-center rounded-[9px]">
            <span className="font-ui text-[11px] font-semibold leading-none tracking-[-0.02em]">
              YW
            </span>
          </span>
          <h1 className="truncate font-ui text-[19px] font-semibold leading-none tracking-[-0.03em] text-foreground">
            YourWorld
          </h1>
        </div>
        <div className="-mr-1.5 flex shrink-0 items-center">
          <button
            aria-label="Search"
            className="icon-pill grid h-9 w-9 place-items-center transition-all duration-200 active:scale-90"
          >
            <Search className="h-[21px] w-[21px]" strokeWidth={1.6} />
          </button>
          <button
            aria-label="Notifications"
            className="icon-pill grid h-9 w-9 place-items-center transition-all duration-200 active:scale-90"
          >
            <Heart className="h-[21px] w-[21px]" strokeWidth={1.6} />
          </button>
        </div>
      </header>

      <section aria-label="Moments" className="hairline border-b">
        <Stories />
      </section>

      <section aria-label="Feed" className="mx-auto max-w-lg space-y-6 px-3 pt-5">
        {posts.map((p, i) => (
          <div
            key={p.id}
            className="animate-rise"
            style={{ animationDelay: `${Math.min(i, 6) * 70}ms` }}
          >
            <PostCard post={p} />
          </div>
        ))}
      </section>
    </main>
  );
}
