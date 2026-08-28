import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useCallback, useEffect, useState } from "react";
import { ChevronLeft, Grid3x3, Play } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { resolveMediaUrl, type DbPost } from "@/lib/social-data";
import { useResolvedMedia } from "@/lib/profile-data";
import { useFollowCounts, setFollow, isRealUserId } from "@/lib/follow-data";
import { FollowListDialog } from "@/components/yw/FollowListDialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { formatCount } from "@/lib/yw-data";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/u/$userId")({
  head: () => ({
    meta: [
      { title: "Creator Profile — YourWorld" },
      {
        name: "description",
        content:
          "View a YourWorld creator profile: their posts, reels, long videos, followers and following.",
      },
      { property: "og:title", content: "Creator Profile — YourWorld" },
      {
        property: "og:description",
        content: "Posts, reels and videos from a YourWorld creator.",
      },
      { property: "og:type", content: "profile" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: PublicProfilePage,
});

type PublicProfile = {
  id: string;
  username: string;
  display_name: string;
  bio: string;
  avatar_url: string | null;
};

function PublicProfilePage() {
  const { userId } = Route.useParams();
  const navigate = useNavigate();
  const [profile, setProfile] = useState<PublicProfile | null>(null);
  const [avatarSrc, setAvatarSrc] = useState<string | null>(null);
  const [posts, setPosts] = useState<DbPost[]>([]);
  const [loading, setLoading] = useState(true);
  const [me, setMe] = useState<string | null>(null);
  const [isFollowing, setIsFollowing] = useState(false);
  const [busy, setBusy] = useState(false);
  const [listOpen, setListOpen] = useState(false);
  const [listTab, setListTab] = useState<"followers" | "following">("followers");

  const counts = useFollowCounts(isRealUserId(userId) ? userId : null);

  const load = useCallback(async () => {
    setLoading(true);
    const { data: s } = await supabase.auth.getSession();
    const uid = s.session?.user.id ?? null;
    setMe(uid);

    const [{ data: rows }, { data: myPosts }, { data: rel }] = await Promise.all([
      supabase.rpc("get_public_profiles", { ids: [userId] }),
      supabase
        .from("posts")
        .select("*")
        .eq("user_id", userId)
        .order("created_at", { ascending: false })
        .limit(100),
      uid
        ? supabase
            .from("follows")
            .select("following_id")
            .eq("follower_id", uid)
            .eq("following_id", userId)
            .maybeSingle()
        : Promise.resolve({ data: null }),
    ]);

    const row = (rows ?? [])[0] as
      | { id: string; username: string | null; display_name: string | null; avatar_url: string | null; bio?: string | null }
      | undefined;

    const next: PublicProfile = {
      id: userId,
      username: row?.username ?? `user${userId.slice(0, 4)}`,
      display_name: row?.display_name ?? row?.username ?? "YourWorld user",
      bio: row?.bio ?? "",
      avatar_url: row?.avatar_url ?? null,
    };
    setProfile(next);
    setPosts((myPosts ?? []) as DbPost[]);
    setIsFollowing(!!rel);
    setAvatarSrc(next.avatar_url ? await resolveMediaUrl(next.avatar_url, "avatars") : null);
    setLoading(false);
  }, [userId]);

  useEffect(() => {
    void load();
  }, [load]);

  const media = useResolvedMedia(posts.map((p) => p.media_url));
  const src = (u: string) => media[u] ?? u;
  const grid = posts.filter((p) => p.kind !== "reel");
  const reels = posts.filter((p) => p.kind === "reel");

  const onFollow = async () => {
    if (busy) return;
    setBusy(true);
    const next = !isFollowing;
    setIsFollowing(next);
    try {
      await setFollow(userId, next);
      void counts.reload();
      toast.success(next ? `Following @${profile?.username}` : "Unfollowed");
    } catch (e) {
      setIsFollowing(!next);
      toast.error(e instanceof Error ? e.message : "Couldn't update follow");
    } finally {
      setBusy(false);
    }
  };

  if (me && me === userId) {
    return (
      <main className="grid min-h-screen place-items-center bg-[#0d0d0f] px-6 text-center text-white">
        <div>
          <p className="text-sm text-zinc-400">This is you.</p>
          <Link
            to="/profile"
            className="mt-4 inline-block rounded-full bg-white px-4 py-2 text-xs font-semibold text-black"
          >
            Open your profile
          </Link>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-[#0d0d0f] pb-28 text-white">
      <header className="sticky top-0 z-40 flex items-center gap-3 border-b border-zinc-900/60 bg-[#0d0d0f]/90 px-3 py-3 backdrop-blur-md">
        <button
          type="button"
          onClick={() => navigate({ to: "/" })}
          aria-label="Back"
          className="grid h-9 w-9 place-items-center rounded-full text-zinc-300 active:scale-90"
        >
          <ChevronLeft size={22} />
        </button>
        <h1 className="truncate text-base font-bold">@{profile?.username ?? "user"}</h1>
      </header>

      <section className="px-4 pt-5">
        <div className="flex items-center gap-5">
          {avatarSrc ? (
            <img
              src={avatarSrc}
              alt={profile?.display_name ?? "Profile photo"}
              className="h-20 w-20 rounded-full border border-pink-500/70 object-cover"
            />
          ) : (
            <div className="grid h-20 w-20 place-items-center rounded-full border border-pink-500/70 bg-gradient-to-br from-pink-500 to-purple-600 text-2xl font-bold">
              {(profile?.display_name || profile?.username || "Y").charAt(0).toUpperCase()}
            </div>
          )}

          <div className="grid flex-1 grid-cols-3 text-center">
            <div>
              <p className="text-base font-bold">{formatCount(posts.length)}</p>
              <p className="text-[11px] text-zinc-400">Posts</p>
            </div>
            <button
              onClick={() => {
                setListTab("followers");
                setListOpen(true);
              }}
            >
              <p className="text-base font-bold">{formatCount(counts.followers)}</p>
              <p className="text-[11px] text-zinc-400">Followers</p>
            </button>
            <button
              onClick={() => {
                setListTab("following");
                setListOpen(true);
              }}
            >
              <p className="text-base font-bold">{formatCount(counts.following)}</p>
              <p className="text-[11px] text-zinc-400">Following</p>
            </button>
          </div>
        </div>

        <div className="pt-3">
          <p className="text-sm font-semibold">{profile?.display_name}</p>
          {profile?.bio && (
            <p className="whitespace-pre-line pt-1 text-xs leading-relaxed text-zinc-300">
              {profile.bio}
            </p>
          )}
        </div>

        <div className="flex gap-2 pt-4">
          <button
            type="button"
            onClick={onFollow}
            disabled={busy}
            className={cn(
              "flex-1 rounded-xl py-2 text-xs font-bold transition-all active:scale-[0.98] disabled:opacity-60",
              isFollowing ? "bg-zinc-800 text-white" : "bg-pink-500 text-white",
            )}
          >
            {isFollowing ? "Following" : "Follow"}
          </button>
          <Link to="/chat" className="flex-1 rounded-xl bg-zinc-800 py-2 text-center text-xs font-bold">
            Message
          </Link>
        </div>
      </section>

      <Tabs defaultValue="grid" className="pt-6">
        <TabsList className="grid w-full grid-cols-2 bg-transparent">
          <TabsTrigger value="grid">
            <Grid3x3 size={18} />
          </TabsTrigger>
          <TabsTrigger value="reels">
            <Play size={18} />
          </TabsTrigger>
        </TabsList>

        <TabsContent value="grid">
          <MediaGrid items={grid} src={src} empty={loading ? "Loading…" : "No posts yet"} />
        </TabsContent>
        <TabsContent value="reels">
          <MediaGrid items={reels} src={src} empty={loading ? "Loading…" : "No reels yet"} />
        </TabsContent>
      </Tabs>

      <FollowListDialog
        userId={userId}
        open={listOpen}
        onOpenChange={setListOpen}
        tab={listTab}
        onTabChange={setListTab}
      />
    </main>
  );
}

function MediaGrid({
  items,
  src,
  empty,
}: {
  items: DbPost[];
  src: (u: string) => string;
  empty: string;
}) {
  if (!items.length) {
    return <p className="px-4 py-12 text-center text-xs text-zinc-500">{empty}</p>;
  }
  return (
    <div className="grid grid-cols-3 gap-[2px] px-[2px]">
      {items.map((p) => (
        <div key={p.id} className="relative aspect-square overflow-hidden bg-zinc-900">
          {p.media_type === "video" ? (
            <video src={src(p.media_url)} muted playsInline className="h-full w-full object-cover" />
          ) : (
            <img
              src={src(p.media_url)}
              alt={p.caption ?? "Post"}
              loading="lazy"
              className="h-full w-full object-cover"
            />
          )}
        </div>
      ))}
    </div>
  );
}
