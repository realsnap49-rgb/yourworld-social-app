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
      <header className="header-lux sticky top-0 z-40 grid grid-cols-[minmax(0,1fr)_auto] items-center gap-3 px-4 pb-3 pt-3.5">
        <div className="flex min-w-0 items-center gap-3">
          <span className="logo-mark grid h-10 w-10 shrink-0 place-items-center rounded-2xl brand-gradient">
            <span className="font-display text-[15px] font-extrabold tracking-tight text-primary-foreground">
              YW
            </span>
          </span>
          <span className="min-w-0">
            <h1 className="brand-text truncate font-display text-[26px] font-extrabold leading-none">
              YourWorld
            </h1>
            <span className="mt-1 block truncate text-[10px] font-medium uppercase tracking-[0.22em] text-muted-foreground">
              Your feed of moments
            </span>
          </span>
        </div>
        <div className="flex shrink-0 items-center gap-2.5">
          <button
            aria-label="Notifications"
            className="icon-pill grid h-10 w-10 place-items-center rounded-2xl transition-all duration-200 hover:-translate-y-0.5 active:scale-90"
          >
            <Heart className="h-5 w-5" strokeWidth={2} />
          </button>
          <Link
            to="/chat"
            aria-label="Chat"
            className="icon-pill relative grid h-10 w-10 place-items-center rounded-2xl transition-all duration-200 hover:-translate-y-0.5 active:scale-90"
          >
            <MessageCircle className="h-5 w-5" strokeWidth={2} />
            <span className="absolute right-1.5 top-1.5 h-2 w-2 rounded-full bg-primary ring-2 ring-card" />
            <span className="absolute right-1.5 top-1.5 h-2 w-2 animate-ping rounded-full bg-primary" />
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
