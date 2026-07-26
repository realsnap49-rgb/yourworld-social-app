import { createFileRoute } from "@tanstack/react-router";
import { Settings, Grid3x3, Bookmark, Play, ChevronRight } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { YwAvatar } from "@/components/yw/Avatar";
import { currentUser, formatCount, posts, profileStats, reels } from "@/lib/yw-data";
import { useYw } from "@/lib/yw-store";

export const Route = createFileRoute("/profile")({
  head: () => ({
    meta: [
      { title: "Profile — YourWorld" },
      {
        name: "description",
        content:
          "Your YourWorld profile: followers, following, saved posts, reels and account settings.",
      },
      { property: "og:title", content: "Profile — YourWorld" },
      {
        property: "og:description",
        content: "Followers, following, saved posts and settings on YourWorld.",
      },
    ],
  }),
  component: ProfilePage,
});

function ProfilePage() {
  const { saved } = useYw();
  const savedPosts = posts.filter((p) => saved[p.id]);

  return (
    <main className="pb-6">
      <header className="sticky top-0 z-40 grid grid-cols-[minmax(0,1fr)_auto] items-center gap-3 border-b border-border glass px-4 py-3">
        <h1 className="truncate font-display text-xl font-bold">@{currentUser.username}</h1>
        <button aria-label="Settings" className="transition-transform active:scale-90">
          <Settings className="h-6 w-6" />
        </button>
      </header>

      <section className="px-4 pt-4">
        <div className="flex items-center gap-5">
          <span className="grid h-[86px] w-[86px] shrink-0 place-items-center rounded-full p-[3px] ring-story">
            <span className="grid h-full w-full place-items-center rounded-full bg-background p-[2px]">
              <YwAvatar user={currentUser} size={74} />
            </span>
          </span>
          <dl className="grid flex-1 grid-cols-3 text-center">
            <Stat label="Posts" value={formatCount(profileStats.posts)} />
            <Stat label="Followers" value={formatCount(profileStats.followers)} />
            <Stat label="Following" value={formatCount(profileStats.following)} />
          </dl>
        </div>

        <div className="pt-3">
          <p className="font-semibold">{currentUser.name}</p>
          <p className="text-sm text-muted-foreground">
            Night photographer · reel maker · collecting small moments
          </p>
        </div>

        <div className="grid grid-cols-2 gap-2 pt-4">
          <Button variant="secondary" className="h-10 rounded-full">
            Edit profile
          </Button>
          <Button variant="secondary" className="h-10 rounded-full">
            Share profile
          </Button>
        </div>
      </section>

      <Tabs defaultValue="grid" className="pt-5">
        <TabsList className="grid w-full grid-cols-3 rounded-none border-y border-border bg-transparent p-0">
          <TabsTrigger value="grid" className="rounded-none py-3" aria-label="Posts">
            <Grid3x3 className="h-5 w-5" />
          </TabsTrigger>
          <TabsTrigger value="reels" className="rounded-none py-3" aria-label="Reels">
            <Play className="h-5 w-5" />
          </TabsTrigger>
          <TabsTrigger value="saved" className="rounded-none py-3" aria-label="Saved">
            <Bookmark className="h-5 w-5" />
          </TabsTrigger>
        </TabsList>

        <TabsContent value="grid" className="mt-0">
          <MediaGrid images={posts.map((p) => p.image)} />
        </TabsContent>
        <TabsContent value="reels" className="mt-0">
          <MediaGrid images={reels.map((r) => r.poster)} />
        </TabsContent>
        <TabsContent value="saved" className="mt-0">
          {savedPosts.length ? (
            <MediaGrid images={savedPosts.map((p) => p.image)} />
          ) : (
            <p className="px-4 py-10 text-center text-sm text-muted-foreground">
              Nothing saved yet. Tap the bookmark on a post to keep it here.
            </p>
          )}
        </TabsContent>
      </Tabs>

      <section className="px-4 pt-6">
        <h2 className="pb-2 text-sm font-semibold uppercase tracking-wide text-muted-foreground">
          Settings
        </h2>
        <ul className="overflow-hidden rounded-2xl bg-secondary">
          {["Account", "Privacy & downloads", "Notifications", "Appearance", "Log out"].map((s) => (
            <li key={s}>
              <button className="flex w-full items-center justify-between border-b border-border px-4 py-3.5 text-sm last:border-0">
                <span>{s}</span>
                <ChevronRight className="h-4 w-4 text-muted-foreground" />
              </button>
            </li>
          ))}
        </ul>
      </section>
    </main>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dd className="font-display text-lg font-bold">{value}</dd>
      <dt className="text-xs text-muted-foreground">{label}</dt>
    </div>
  );
}

function MediaGrid({ images }: { images: string[] }) {
  return (
    <ul className="grid grid-cols-3 gap-0.5">
      {images.map((src, i) => (
        <li key={`${src}-${i}`} className="aspect-square overflow-hidden bg-secondary">
          <img src={src} alt="" loading="lazy" className="h-full w-full object-cover" />
        </li>
      ))}
    </ul>
  );
}