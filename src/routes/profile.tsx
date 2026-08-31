import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import {
  Settings,
  Grid3x3,
  Bookmark,
  Play,
  MapPin,
  Link2,
  Trash2,
  Heart,
  MessageCircleOff,
  Send,
  Pencil,
  Pin,
  PinOff,
  Archive,
  MoreHorizontal,
} from "lucide-react";
import { Sheet, SheetContent } from "@/components/ui/sheet";
import { Switch } from "@/components/ui/switch";

import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { toast } from "sonner";
import { YwAvatar } from "@/components/yw/Avatar";
import { Bio } from "@/components/yw/Bio";
import { EditProfileSheet, type ProfileEdit } from "@/components/yw/EditProfileSheet";
import { formatCount } from "@/lib/yw-data";
import { useYw } from "@/lib/yw-store";
import {
  useMyProfile,
  useResolvedMedia,
  updateMyPost,
  deleteMyPost,
} from "@/lib/profile-data";
import type { DbPost } from "@/lib/social-data";
import { UserWatermark } from "@/components/yw/UserWatermark";
import { FollowListDialog } from "@/components/yw/FollowListDialog";
import { useFollowCounts } from "@/lib/follow-data";
import { Highlights } from "@/components/yw/Highlights";





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
  const { profile, avatarSrc, grid, reels, posts, loading, save, userId, reload } =
    useMyProfile();
  const [editOpen, setEditOpen] = useState(false);
  const counts = useFollowCounts(userId);
  const [listOpen, setListOpen] = useState(false);
  const [listTab, setListTab] = useState<"followers" | "following">("followers");
  const [manage, setManage] = useState<DbPost | null>(null);
  const [caption, setCaption] = useState("");
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [busy, setBusy] = useState(false);


  const openManage = (post: DbPost) => {
    setManage(post);
    setCaption(post.caption ?? "");
  };


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

  };

  if (!loading && !userId) {
    return (
      <main className="relative min-h-screen">
        <header className="sticky top-0 z-40 grid grid-cols-[minmax(0,1fr)_auto] items-center gap-3 border-b border-border glass px-4 py-3">
          <h1 className="font-display text-xl font-bold">Profile</h1>
          <Link to="/settings" aria-label="Settings" className="transition-transform active:scale-90">
            <Settings className="h-6 w-6" />
          </Link>
        </header>
        <div className="grid place-items-center px-6 py-24 text-center">
          <div>
            <p className="text-sm text-muted-foreground">Sign in to see your profile.</p>
            <Link
              to="/auth"
              className="mt-4 inline-block rounded-full bg-foreground px-5 py-2 text-xs font-semibold text-background"
            >
              Sign in
            </Link>
          </div>
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
            <Stat
              label="Followers"
              value={formatCount(counts.followers)}
              onClick={() => {
                setListTab("followers");
                setListOpen(true);
              }}
            />
            <Stat
              label="Following"
              value={formatCount(counts.following)}
              onClick={() => {
                setListTab("following");
                setListOpen(true);
              }}
            />
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

      <Highlights userId={userId} posts={posts} />

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
            <MediaGrid
              onSelect={openManage}
              items={grid.map((p) => ({ src: src(p.media_url), type: p.media_type, post: p }))}
            />
          ) : (
            <Empty text={loading ? "Loading your posts…" : "No posts yet. Create your first one."} />
          )}
        </TabsContent>
        <TabsContent value="reels" className="mt-0">
          {reels.length ? (
            <MediaGrid
              onSelect={openManage}
              items={reels.map((p) => ({ src: src(p.media_url), type: p.media_type, post: p }))}
            />
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

      <Dialog open={!!manage} onOpenChange={(o) => !o && setManage(null)}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>{manage?.kind === "reel" ? "Edit reel" : "Edit post"}</DialogTitle>
          </DialogHeader>
          {manage ? (
            <div className="space-y-3">
              <div className="overflow-hidden rounded-xl bg-secondary">
                {manage.media_type?.startsWith("video") ? (
                  <video
                    src={src(manage.media_url)}
                    controls
                    playsInline
                    className="max-h-56 w-full object-contain"
                  />
                ) : (
                  <img src={src(manage.media_url)} alt="" className="max-h-56 w-full object-contain" />
                )}
              </div>
              <Textarea
                value={caption}
                onChange={(e) => setCaption(e.target.value)}
                placeholder="Write a caption…"
                rows={3}
              />
            </div>
          ) : null}
          <DialogFooter className="gap-2 sm:justify-between">
            <Button
              variant="ghost"
              className="text-destructive"
              onClick={() => setConfirmDelete(true)}
            >
              <Trash2 className="mr-1.5 h-4 w-4" /> Delete
            </Button>
            <Button
              disabled={busy}
              onClick={async () => {
                if (!manage) return;
                setBusy(true);
                try {
                  await updateMyPost(manage.id, { caption });
                  toast.success("Updated");
                  setManage(null);
                  await reload();
                } catch (e) {
                  toast.error(e instanceof Error ? e.message : "Couldn't update");
                } finally {
                  setBusy(false);
                }
              }}
            >
              Save
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={confirmDelete} onOpenChange={setConfirmDelete}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete this {manage?.kind === "reel" ? "reel" : "post"}?</AlertDialogTitle>
            <AlertDialogDescription>
              This permanently removes it and its media. This can't be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={async () => {
                if (!manage) return;
                try {
                  await deleteMyPost(manage);
                  toast.success("Deleted");
                  setManage(null);
                  await reload();
                } catch (e) {
                  toast.error(e instanceof Error ? e.message : "Couldn't delete");
                }
              }}
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <EditProfileSheet
        open={editOpen}
        onOpenChange={setEditOpen}
        user={avatarUser}
        value={editValue}
        onSave={save}
      />

      <FollowListDialog
        open={listOpen}
        onOpenChange={setListOpen}
        userId={userId}
        tab={listTab}
        onTabChange={setListTab}
      />



    </main>
  );
}

function Empty({ text }: { text: string }) {
  return <p className="px-4 py-10 text-center text-sm text-muted-foreground">{text}</p>;
}

function Stat({
  label,
  value,
  onClick,
}: {
  label: string;
  value: string;
  onClick?: () => void;
}) {
  const body = (
    <>
      <dd className="font-display text-lg font-bold">{value}</dd>
      <dt className="text-xs text-muted-foreground">{label}</dt>
    </>
  );
  if (!onClick) return <div>{body}</div>;
  return (
    <button
      type="button"
      onClick={onClick}
      className="rounded-xl py-0.5 transition-transform active:scale-95"
    >
      {body}
    </button>
  );
}


function MediaGrid({
  items,
  onSelect,
}: {
  items: { src: string; type: string; post?: DbPost }[];
  onSelect?: (post: DbPost) => void;
}) {
  return (
    <ul className="grid grid-cols-3 gap-0.5">
      {items.map((it, i) => (
        <li key={`${it.src}-${i}`} className="relative aspect-square overflow-hidden bg-secondary">
          {it.type?.startsWith("video") ? (
            <video src={it.src} muted playsInline preload="metadata" className="h-full w-full object-cover" />
          ) : (
            <img src={it.src} alt="" loading="lazy" className="h-full w-full object-cover" />
          )}
          {it.type?.startsWith("video") ? (
            <Play className="absolute left-1.5 top-1.5 h-4 w-4 fill-current text-white drop-shadow" />
          ) : null}
          {it.post && onSelect ? (
            <>
              <button
                type="button"
                aria-label="Open post"
                onClick={() => onSelect(it.post!)}
                className="absolute inset-0"
              />
              <button
                type="button"
                aria-label="Edit or delete"
                onClick={(e) => {
                  e.stopPropagation();
                  onSelect(it.post!);
                }}
                className="absolute right-1 top-1 grid h-7 w-7 place-items-center rounded-full bg-background/70 backdrop-blur transition-transform active:scale-90"
              >
                <MoreHorizontal className="h-4 w-4" strokeWidth={2} />
              </button>
            </>
          ) : null}
        </li>
      ))}
    </ul>


  );
}
