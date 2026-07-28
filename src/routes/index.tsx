import { createFileRoute, Link } from "@tanstack/react-router";
import { Heart, MessageCircle } from "lucide-react";
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
    <main>
      <header className="header-lux sticky top-0 z-40 flex h-14 items-center justify-between gap-3 px-4">
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
            aria-label="Notifications"
            className="icon-pill grid h-9 w-9 place-items-center transition-all duration-200 active:scale-90"
          >
            <Heart className="h-[21px] w-[21px]" strokeWidth={1.6} />
          </button>
          <Link
            to="/chat"
            aria-label="Chat"
            className="icon-pill relative grid h-9 w-9 place-items-center transition-all duration-200 active:scale-90"
          >
            <MessageCircle className="h-[21px] w-[21px]" strokeWidth={1.6} />
            <span className="absolute right-1.5 top-1.5 h-1.5 w-1.5 rounded-full bg-foreground" />
          </Link>
        </div>
      </header>

      <section aria-label="Moments" className="border-b border-border">
        <Stories />
      </section>

      <section aria-label="Feed" className="pt-2">
        {posts.map((p) => (
          <PostCard key={p.id} post={p} />
        ))}
      </section>
    </main>
  );
}
