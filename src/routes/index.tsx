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
      <header className="sticky top-0 z-40 grid grid-cols-[minmax(0,1fr)_auto] items-center gap-3 border-b border-border glass px-4 py-3">
        <h1 className="brand-text truncate font-display text-2xl font-extrabold">YourWorld</h1>
        <div className="flex shrink-0 items-center gap-4">
          <button aria-label="Notifications" className="transition-transform active:scale-90">
            <Heart className="h-6 w-6" />
          </button>
          <Link to="/chat" aria-label="Chat" className="relative">
            <MessageCircle className="h-6 w-6" />
            <span className="absolute -right-1 -top-1 h-2.5 w-2.5 rounded-full bg-primary" />
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
