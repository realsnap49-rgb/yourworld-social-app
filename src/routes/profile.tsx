import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import {
  Settings,
  Grid3x3,
  Bookmark,
  Play,
  MapPin,
  Link2,
} from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { YwAvatar } from "@/components/yw/Avatar";
import { Bio } from "@/components/yw/Bio";
import { EditProfileSheet, type ProfileEdit } from "@/components/yw/EditProfileSheet";
import { formatCount } from "@/lib/yw-data";
import { useYw } from "@/lib/yw-store";
import { useMyProfile, useResolvedMedia } from "@/lib/profile-data";
import { UserWatermark } from "@/components/yw/UserWatermark";

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
  const { profile, avatarSrc, coverSrc, grid, reels, posts, loading, save, userId } =
    useMyProfile();
  const [editOpen, setEditOpen] = useState(false);

  const savedPosts = posts.filter((p) => saved[p.id]);
  const media = useResolvedMedia([...posts.map((p) => p.media_url)]);
  const src = (u: string) => media[u] ?? u;

  const avatarUser = {
    id: userId ?? "me",
    username: profile.username || "you",
    name: profile.display_name || profile.username || "You",
    hue: 280,
  };

  const editValue: ProfileEdit = {
    name: profile.display_name,
    username: profile.username,
    category: profile.category,
    bio: profile.bio,
    location: profile.location,
    website: profile.website,
    avatarUrl: avatarSrc ?? undefined,
    coverUrl: coverSrc ?? undefined,
  };

  if (!loading && !userId) {
    return (
      <main className="grid min-h-screen place-items-center px-6 text-center">
        <div>
          <p className="text-sm text-muted-foreground">Sign in to see your profile.</p>
          <Link
            to="/auth"
            className="mt-4 inline-block rounded-full bg-foreground px-5 py-2 text-xs font-semibold text-background"
          >
            Sign in
          </Link>
        </div>
      </main>
    );
  }

  return (
    <main className="relative pb-6">
      <UserWatermark username={profile.username} />
      <header className="sticky top-0 z-40 grid grid-cols-[minmax(0,1fr)_auto] items-center gap-3 border-b border-border glass px-4 py-3">
        <h1 className="flex min-w-0 items-center gap-1.5 font-display text-xl font-bold">
          <span className="truncate">@{profile.username || "…"}</span>
        </h1>
        <Link to="/settings" aria-label="Settings" className="transition-transform active:scale-90">
          <Settings className="h-6 w-6" />
        </Link>
      </header>

      {coverSrc ? (
        <div className="h-32 w-full overflow-hidden">
          <img src={coverSrc} alt="" className="h-full w-full object-cover" />
        </div>
      ) : null}

      <section className="px-4 pt-4">
        <div className="flex items-center gap-5">
          <span className="grid h-[86px] w-[86px] shrink-0 place-items-center rounded-full p-[3px] ring-story">
            <span className="grid h-full w-full place-items-center rounded-full bg-background p-[2px]">
              {avatarSrc ? (
                <img
                  src={avatarSrc}
                  alt=""
                  className="h-[74px] w-[74px] rounded-full object-cover"
                />
              ) : (
                <YwAvatar user={avatarUser} size={74} />
              )}
            </span>
          </span>
          <dl className="grid flex-1 grid-cols-3 text-center">
            <Stat label="Posts" value={formatCount(posts.length)} />
            <Stat label="Reels" value={formatCount(reels.length)} />
            <Stat label="Saved" value={formatCount(savedPosts.length)} />
          </dl>
        </div>

        <div className="pt-3">
          <p className="font-semibold">{profile.display_name || "Add your name"}</p>
          {profile.category ? (
            <p className="text-xs text-muted-foreground">{profile.category}</p>
          ) : null}
          {profile.bio ? <Bio text={profile.bio} /> : null}
          {(profile.location || profile.website) && (
            <div className="flex flex-wrap items-center gap-x-4 gap-y-1 pt-1.5 text-xs">
              {profile.location ? (
                <span className="flex items-center gap-1 text-muted-foreground">
                  <MapPin className="h-3.5 w-3.5" strokeWidth={1.8} />
                  {profile.location}
                </span>
              ) : null}
              {profile.website ? (
                <a
                  href={
                    profile.website.startsWith("http")
                      ? profile.website
                      : `https://${profile.website}`
                  }
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-1 font-medium text-primary underline-offset-2 hover:underline"
                >
                  <Link2 className="h-3.5 w-3.5" strokeWidth={1.8} />
                  {profile.website.replace(/^https?:\/\//, "")}
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
          <Button
            variant="secondary"
            className="h-10 rounded-full"
            onClick={async () => {
              const url = `${window.location.origin}/profile`;
              try {
                if (navigator.share) await navigator.share({ title: profile.username, url });
                else {
                  await navigator.clipboard.writeText(url);
                  toast.success("Profile link copied");
                }
              } catch {
                /* user cancelled */
              }
            }}
          >
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
          {grid.length ? (
            <MediaGrid items={grid.map((p) => ({ src: src(p.media_url), type: p.media_type }))} />
          ) : (
            <Empty text={loading ? "Loading your posts…" : "No posts yet. Create your first one."} />
          )}
        </TabsContent>
        <TabsContent value="reels" className="mt-0">
          {reels.length ? (
            <MediaGrid items={reels.map((p) => ({ src: src(p.media_url), type: p.media_type }))} />
          ) : (
            <Empty text={loading ? "Loading reels…" : "No reels yet."} />
          )}
        </TabsContent>
        <TabsContent value="saved" className="mt-0">
          {savedPosts.length ? (
            <MediaGrid
              items={savedPosts.map((p) => ({ src: src(p.media_url), type: p.media_type }))}
            />
          ) : (
            <Empty text="Nothing saved yet. Tap the bookmark on a post to keep it here." />
          )}
        </TabsContent>
      </Tabs>

      <EditProfileSheet
        open={editOpen}
        onOpenChange={setEditOpen}
        user={avatarUser}
        value={editValue}
        onSave={save}
      />
    </main>
  );
}

function Empty({ text }: { text: string }) {
  return <p className="px-4 py-10 text-center text-sm text-muted-foreground">{text}</p>;
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dd className="font-display text-lg font-bold">{value}</dd>
      <dt className="text-xs text-muted-foreground">{label}</dt>
    </div>
  );
}

function MediaGrid({ items }: { items: { src: string; type: string }[] }) {
  return (
    <ul className="grid grid-cols-3 gap-0.5">
      {items.map((it, i) => (
        <li key={`${it.src}-${i}`} className="relative aspect-square overflow-hidden bg-secondary">
          {it.type?.startsWith("video") ? (
            <video src={it.src} muted playsInline preload="metadata" className="h-full w-full object-cover" />
          ) : (
            <img src={it.src} alt="" loading="lazy" className="h-full w-full object-cover" />
          )}
        </li>
      ))}
    </ul>
  );
}
