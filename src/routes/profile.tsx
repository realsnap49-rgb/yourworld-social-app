import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import {
  Settings,
  Grid3x3,
  Bookmark,
  Play,
  ChevronRight,
  BadgeCheck,
  MapPin,
  Link2,
  Pin,
} from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { YwAvatar } from "@/components/yw/Avatar";
import { Bio } from "@/components/yw/Bio";
import { EditProfileSheet, type ProfileEdit } from "@/components/yw/EditProfileSheet";
import {
  currentUser,
  formatCount,
  pinnedPostIds,
  posts,
  profileStats,
  reels,
} from "@/lib/yw-data";
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
  const [editOpen, setEditOpen] = useState(false);
  const [profile, setProfile] = useState<ProfileEdit>({
    name: currentUser.name,
    username: currentUser.username,
    category: currentUser.category ?? "",
    bio: currentUser.bio ?? "",
  });

  const pinned = pinnedPostIds.slice(0, 3);
  const gridPosts = [
    ...pinned.map((id) => posts.find((p) => p.id === id)).filter(Boolean),
    ...posts.filter((p) => !pinned.includes(p.id)),
  ] as typeof posts;

  return (
    <main className="pb-6">
      <header className="sticky top-0 z-40 grid grid-cols-[minmax(0,1fr)_auto] items-center gap-3 border-b border-border glass px-4 py-3">
        <h1 className="flex min-w-0 items-center gap-1.5 font-display text-xl font-bold">
          <span className="truncate">@{profile.username}</span>
          {currentUser.verified ? (
            <BadgeCheck
              className="h-5 w-5 shrink-0 fill-[oklch(0.62_0.17_255)] text-background"
              aria-label="Verified account"
            />
          ) : null}
        </h1>
        <Link
          to="/settings"
          aria-label="Settings"
          className="transition-transform active:scale-90"
        >
          <Settings className="h-6 w-6" />
        </Link>
      </header>

      {profile.coverUrl ? (
        <div className="h-32 w-full overflow-hidden">
          <img src={profile.coverUrl} alt="" className="h-full w-full object-cover" />
        </div>
      ) : null}

      <section className="px-4 pt-4">
        <div className="flex items-center gap-5">
          <span className="grid h-[86px] w-[86px] shrink-0 place-items-center rounded-full p-[3px] ring-story">
            <span className="grid h-full w-full place-items-center rounded-full bg-background p-[2px]">
              {profile.avatarUrl ? (
                <img
                  src={profile.avatarUrl}
                  alt=""
                  className="h-[74px] w-[74px] rounded-full object-cover"
                />
              ) : (
                <YwAvatar user={currentUser} size={74} />
              )}
            </span>
          </span>
          <dl className="grid flex-1 grid-cols-3 text-center">
            <Stat label="Posts" value={formatCount(profileStats.posts)} />
            <Stat label="Followers" value={formatCount(profileStats.followers)} />
            <Stat label="Following" value={formatCount(profileStats.following)} />
          </dl>
        </div>

        <div className="pt-3">
          <p className="font-semibold">{profile.name}</p>
          {profile.category ? (
            <p className="text-xs text-muted-foreground">{profile.category}</p>
          ) : null}
          {profile.bio ? <Bio text={profile.bio} /> : null}
          {(currentUser.location || currentUser.website) && (
            <div className="flex flex-wrap items-center gap-x-4 gap-y-1 pt-1.5 text-xs">
              {currentUser.location ? (
                <span className="flex items-center gap-1 text-muted-foreground">
                  <MapPin className="h-3.5 w-3.5" strokeWidth={1.8} />
                  {currentUser.location}
                </span>
              ) : null}
              {currentUser.website ? (
                <a
                  href={
                    currentUser.website.startsWith("http")
                      ? currentUser.website
                      : `https://${currentUser.website}`
                  }
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-1 font-medium text-primary underline-offset-2 hover:underline"
                >
                  <Link2 className="h-3.5 w-3.5" strokeWidth={1.8} />
                  {currentUser.website.replace(/^https?:\/\//, "")}
                </a>
              ) : null}
            </div>
          )}
        </div>

        <div className="grid grid-cols-2 gap-2 pt-4">
          <Button
            variant="secondary"
            className="h-10 rounded-full"
            onClick={() => setEditOpen(true)}
          >
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
          <MediaGrid
            images={gridPosts.map((p) => p.image)}
            pinnedCount={pinned.length}
          />
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

      <EditProfileSheet
        open={editOpen}
        onOpenChange={setEditOpen}
        user={currentUser}
        value={profile}
        onSave={setProfile}
      />
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

function MediaGrid({ images, pinnedCount = 0 }: { images: string[]; pinnedCount?: number }) {
  return (
    <ul className="grid grid-cols-3 gap-0.5">
      {images.map((src, i) => (
        <li key={`${src}-${i}`} className="relative aspect-square overflow-hidden bg-secondary">
          <img src={src} alt="" loading="lazy" className="h-full w-full object-cover" />
          {i < pinnedCount ? (
            <span
              className="absolute right-1.5 top-1.5 grid h-5 w-5 place-items-center rounded-full bg-background/60 backdrop-blur-sm"
              aria-label="Pinned post"
            >
              <Pin className="h-3 w-3 fill-current text-foreground" strokeWidth={1.8} />
            </span>
          ) : null}
        </li>
      ))}
    </ul>
  );
}