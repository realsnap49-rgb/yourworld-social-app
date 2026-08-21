import { useCallback, useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { resolveMediaUrl, type DbPost } from "@/lib/social-data";

export type MyProfile = {
  id: string;
  username: string;
  display_name: string;
  bio: string;
  category: string;
  location: string;
  website: string;
  avatar_url: string | null;
  cover_url: string | null;
};

export type MyProfileEdit = {
  name: string;
  username: string;
  category: string;
  bio: string;
  location?: string;
  website?: string;
  avatarUrl?: string;
  coverUrl?: string;
  avatarFile?: File;
  coverFile?: File;
};

const empty: MyProfile = {
  id: "",
  username: "",
  display_name: "",
  bio: "",
  category: "",
  location: "",
  website: "",
  avatar_url: null,
  cover_url: null,
};

async function signedIfNeeded(url: string | null) {
  if (!url) return null;
  return resolveMediaUrl(url, "avatars");
}

/** Real signed-in profile: row from the database plus the user's own media. */
export function useMyProfile() {
  const [userId, setUserId] = useState<string | null>(null);
  const [profile, setProfile] = useState<MyProfile>(empty);
  const [avatarSrc, setAvatarSrc] = useState<string | null>(null);
  const [coverSrc, setCoverSrc] = useState<string | null>(null);
  const [posts, setPosts] = useState<DbPost[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    const { data: sessionData } = await supabase.auth.getSession();
    const uid = sessionData.session?.user.id ?? null;
    setUserId(uid);
    if (!uid) {
      setProfile(empty);
      setPosts([]);
      setLoading(false);
      return;
    }

    const [{ data: row }, { data: myPosts }] = await Promise.all([
      supabase.from("profiles").select("*").eq("id", uid).maybeSingle(),
      supabase
        .from("posts")
        .select("*")
        .eq("user_id", uid)
        .order("created_at", { ascending: false })
        .limit(100),
    ]);

    const email = sessionData.session?.user.email ?? "";
    const next: MyProfile = {
      id: uid,
      username: row?.username ?? email.split("@")[0] ?? `user${uid.slice(0, 4)}`,
      display_name: row?.display_name ?? row?.username ?? "YourWorld user",
      bio: row?.bio ?? "",
      category: row?.category ?? "",
      location: row?.location ?? "",
      website: row?.website ?? "",
      avatar_url: row?.avatar_url ?? null,
      cover_url: row?.cover_url ?? null,
    };
    setProfile(next);
    setPosts((myPosts ?? []) as DbPost[]);
    setAvatarSrc(await signedIfNeeded(next.avatar_url));
    setCoverSrc(await signedIfNeeded(next.cover_url));
    setLoading(false);
  }, []);

  useEffect(() => {
    void load();
    const { data: sub } = supabase.auth.onAuthStateChange(() => void load());
    return () => sub.subscription.unsubscribe();
  }, [load]);

  const uploadImage = useCallback(
    async (file: File, kind: "avatar" | "cover", uid: string) => {
      const ext = (file.name.split(".").pop() || "jpg").toLowerCase();
      const path = `${uid}/${kind}-${Date.now()}.${ext}`;
      const { error } = await supabase.storage
        .from("avatars")
        .upload(path, file, { contentType: file.type || "image/jpeg", upsert: true });
      if (error) throw new Error(error.message);
      return path;
    },
    [],
  );

  const save = useCallback(
    async (edit: MyProfileEdit) => {
      const { data: sessionData } = await supabase.auth.getSession();
      const uid = sessionData.session?.user.id;
      if (!uid) throw new Error("Sign in to update your profile");

      let avatarPath = profile.avatar_url;
      let coverPath = profile.cover_url;
      if (edit.avatarFile) avatarPath = await uploadImage(edit.avatarFile, "avatar", uid);
      if (edit.coverFile) coverPath = await uploadImage(edit.coverFile, "cover", uid);

      const { error } = await supabase.from("profiles").upsert(
        {
          id: uid,
          username: edit.username || null,
          display_name: edit.name || null,
          bio: edit.bio || null,
          category: edit.category || null,
          location: edit.location || null,
          website: edit.website || null,
          avatar_url: avatarPath,
          cover_url: coverPath,
        },
        { onConflict: "id" },
      );
      if (error) throw new Error(error.message);
      await load();
    },
    [profile.avatar_url, profile.cover_url, uploadImage, load],
  );

  const grid = useMemo(() => posts.filter((p) => p.kind !== "reel"), [posts]);
  const reels = useMemo(() => posts.filter((p) => p.kind === "reel"), [posts]);

  return {
    userId,
    profile,
    avatarSrc,
    coverSrc,
    posts,
    grid,
    reels,
    loading,
    save,
    reload: load,
  };
}

/** Update a post/reel you own (caption, hashtags, location, download flag). */
export async function updateMyPost(
  postId: string,
  patch: { caption?: string; location?: string | null; allow_download?: boolean },
) {
  const next: Record<string, unknown> = {};
  if (patch.caption !== undefined) {
    next.caption = patch.caption;
    next.hashtags = Array.from(
      new Set((patch.caption.match(/#[\p{L}\p{N}_]+/gu) ?? []).map((h) => h.slice(1))),
    );
  }
  if (patch.location !== undefined) next.location = patch.location;
  if (patch.allow_download !== undefined) next.allow_download = patch.allow_download;

  const { error } = await supabase.from("posts").update(next).eq("id", postId);
  if (error) throw new Error(error.message);
}

/** Permanently delete a post/reel you own, plus its stored media file. */
export async function deleteMyPost(post: { id: string; media_url: string; kind: string }) {
  const bucket = post.kind === "reel" ? "reels" : "reels";
  const url = post.media_url ?? "";
  if (url && !/^(blob:|data:)/.test(url)) {
    const path = /^https?:/.test(url)
      ? url.match(new RegExp(`/storage/v1/object/(?:sign|public)/${bucket}/([^?]+)`))?.[1]
      : url.replace(/^\/+/, "");
    if (path) {
      try {
        await supabase.storage.from(bucket).remove([decodeURIComponent(path)]);
      } catch {
        /* media already gone */
      }
    }
  }
  const { error } = await supabase.from("posts").delete().eq("id", post.id);
  if (error) throw new Error(error.message);
}

/** Resolves a stored media reference to something an <img> can render. */

export function useResolvedMedia(urls: string[], bucket = "reels") {
  const [map, setMap] = useState<Record<string, string>>({});
  const key = urls.join("|");

  useEffect(() => {
    let alive = true;
    void Promise.all(
      urls.map(async (u) => [u, await resolveMediaUrl(u, bucket)] as const),
    ).then((pairs) => {
      if (alive) setMap(Object.fromEntries(pairs));
    });
    return () => {
      alive = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key, bucket]);

  return map;
}
