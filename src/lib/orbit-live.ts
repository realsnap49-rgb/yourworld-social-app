import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import type { OrbitMoodId } from "@/lib/orbit-mood";
import {
  orbitById,
  registerOrbitProfiles,
  type OrbitProfile,
} from "@/lib/orbit-data";
import type {
  OrbitChatRequest,
  OrbitPhoto,
  OrbitPrivacy,
  OrbitProfileDraft,
} from "@/lib/orbit-store";

export type OrbitProfileRow = {
  user_id: string;
  name: string;
  age: number;
  country: string;
  state: string;
  city: string;
  about: string;
  hobbies: string[];
  looking_for: string;
  gender: string;
  photos: OrbitPhoto[];
  original_photo_privacy: string;
  mood: string | null;
  orbit_enabled: boolean;
  visible: boolean;
};

/** Stable pseudo-random number from an id, so hue/distance never jump around. */
function hashOf(id: string) {
  let h = 0;
  for (let i = 0; i < id.length; i += 1) h = (h * 31 + id.charCodeAt(i)) >>> 0;
  return h;
}

export function rowToOrbitProfile(row: OrbitProfileRow): OrbitProfile {
  const h = hashOf(row.user_id);
  const photos = Array.isArray(row.photos) ? row.photos : [];
  const gender = row.gender === "Men" ? "Men" : "Women";
  const lookingFor =
    row.looking_for === "Men" || row.looking_for === "Everyone" ? row.looking_for : "Women";
  return {
    id: row.user_id,
    name: row.name,
    handle: row.name.toLowerCase().replace(/\s+/g, "."),
    age: row.age,
    area: row.city || "Nearby",
    country: row.country,
    state: row.state,
    city: row.city,
    gender,
    lookingFor,
    hobbies: row.hobbies ?? [],
    distanceKm: (h % 48) + 1,
    headline: (row.hobbies ?? []).slice(0, 3).join(" · ") || "On Orbit",
    about: row.about,
    interests: row.hobbies ?? [],
    photo: photos.find((m) => m.url && !/^(blob|data):/.test(m.url))?.url ?? "",
    hue: h % 360,
    mood: (row.mood as OrbitMoodId | null) ?? undefined,
  };
}

export function draftToRow(user_id: string, p: OrbitProfileDraft, privacy?: OrbitPrivacy) {
  return {
    user_id,
    name: p.name.trim(),
    age: Number(p.age) || 18,
    country: p.country,
    state: p.state,
    city: p.city,
    about: p.about,
    hobbies: p.hobbies,
    looking_for: p.lookingFor,
    photos: p.photos as unknown as never,
    original_photo_privacy: p.originalPhotoPrivacy,
    mood: p.mood ?? null,
    orbit_enabled: privacy ? privacy.orbitEnabled && !privacy.paused : true,
    visible: privacy ? privacy.visibility !== "hidden" && !privacy.hiddenProfile : true,
  };
}

export function rowToDraft(row: OrbitProfileRow): OrbitProfileDraft {
  return {
    name: row.name,
    age: String(row.age),
    country: row.country,
    state: row.state,
    city: row.city,
    about: row.about,
    hobbies: row.hobbies ?? [],
    lookingFor: row.looking_for,
    photos: Array.isArray(row.photos) ? row.photos : [],
    originalPhotoPrivacy: (row.original_photo_privacy ?? "matched") as OrbitProfileDraft["originalPhotoPrivacy"],
    mood: (row.mood as OrbitMoodId | null) ?? null,
  };
}

/** Live discovery feed: every other user with Orbit on and a visible profile. */
export function useOrbitProfiles() {
  const [profiles, setProfiles] = useState<OrbitProfile[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    const load = async () => {
      const { data: auth } = await supabase.auth.getUser();
      const me = auth.user?.id;
      const { data, error } = await supabase.rpc("discover_orbit_profiles" as never, {
        ids: null,
      } as never);

      if (cancelled) return;
      if (error || !data) {
        setLoading(false);
        return;
      }
      const list = (data as unknown as OrbitProfileRow[])
        .filter((r) => r.user_id !== me)
        .map(rowToOrbitProfile);
      registerOrbitProfiles(list);
      setProfiles(list);
      setLoading(false);
    };

    void load();

    let timer: ReturnType<typeof setTimeout> | null = null;
    const reload = () => {
      if (timer) clearTimeout(timer);
      timer = setTimeout(() => void load(), 1000);
    };
    const channel = supabase
      .channel("orbit-profiles-feed")
      .on("postgres_changes", { event: "*", schema: "public", table: "orbit_profiles" }, reload)
      .subscribe();

    return () => {
      cancelled = true;
      if (timer) clearTimeout(timer);
      void supabase.removeChannel(channel);
    };
  }, []);

  return { profiles, loading };
}

/* ------------------------------------------------------------------ */
/* Write-through helpers used by the Orbit store                       */
/* ------------------------------------------------------------------ */

async function uid() {
  const { data } = await supabase.auth.getUser();
  return data.user?.id ?? null;
}

export async function saveOrbitProfileRemote(p: OrbitProfileDraft, privacy: OrbitPrivacy) {
  const id = await uid();
  if (!id) return { ok: false as const, reason: "signed-out" as const };
  const { error } = await supabase
    .from("orbit_profiles")
    .upsert(draftToRow(id, p, privacy) as never, { onConflict: "user_id" });
  if (error) {
    console.error("[orbit] profile save failed", error.message);
    return { ok: false as const, reason: "error" as const, message: error.message };
  }
  return { ok: true as const };
}

export async function saveOrbitPrivacyRemote(privacy: OrbitPrivacy) {
  const id = await uid();
  if (!id) return;
  await supabase
    .from("orbit_settings")
    .upsert({ user_id: id, privacy: privacy as unknown as never } as never, {
      onConflict: "user_id",
    });
  await supabase
    .from("orbit_profiles")
    .update({
      orbit_enabled: privacy.orbitEnabled && !privacy.paused,
      visible: privacy.visibility !== "hidden" && !privacy.hiddenProfile,
    } as never)
    .eq("user_id", id);
}

const isUuid = (v: string) =>
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(v);

export async function setOrbitLikeRemote(targetId: string, liked: boolean) {
  const id = await uid();
  if (!id) throw new Error("Sign in to continue");
  if (!isUuid(targetId)) throw new Error("Invalid Orbit profile");
  const { error } = liked
    ? await supabase.from("orbit_likes").upsert(
        { user_id: id, target_id: targetId } as never,
        { onConflict: "user_id,target_id", ignoreDuplicates: true },
      )
    : await supabase.from("orbit_likes").delete().eq("user_id", id).eq("target_id", targetId);
  if (error) throw error;
}

export async function setOrbitConnectionRemote(targetId: string, connected: boolean) {
  const id = await uid();
  if (!id || !isUuid(targetId)) return;
  if (connected) {
    await supabase
      .from("orbit_connections")
      .upsert(
        { requester_id: id, addressee_id: targetId, status: "accepted" } as never,
        { onConflict: "requester_id,addressee_id" },
      );
  } else {
    await supabase
      .from("orbit_connections")
      .delete()
      .eq("requester_id", id)
      .eq("addressee_id", targetId);
  }
}

export async function sendOrbitChatRequestRemote(targetId: string, intro: string) {
  const id = await uid();
  if (!id || !isUuid(targetId)) return null;
  const { data } = await supabase
    .from("orbit_chat_requests")
    .upsert(
      { requester_id: id, addressee_id: targetId, intro, status: "pending" } as never,
      { onConflict: "requester_id,addressee_id" },
    )
    .select("id")
    .maybeSingle();
  const requestId = (data as { id: string } | null)?.id ?? null;
  if (requestId && intro) {
    await supabase
      .from("orbit_request_messages")
      .insert({ request_id: requestId, sender_id: id, kind: "text", text: intro } as never);
  }
  return requestId;
}

export async function sendOrbitRequestMessageRemote(
  targetId: string,
  msg: { kind: "text" | "photo"; text?: string; url?: string },
) {
  const id = await uid();
  if (!id || !isUuid(targetId)) return;
  const { data } = await supabase
    .from("orbit_chat_requests")
    .select("id")
    .or(
      `and(requester_id.eq.${id},addressee_id.eq.${targetId}),and(requester_id.eq.${targetId},addressee_id.eq.${id})`,
    )
    .maybeSingle();
  const requestId = (data as { id: string } | null)?.id;
  if (!requestId) return;
  await supabase.from("orbit_request_messages").insert({
    request_id: requestId,
    sender_id: id,
    kind: msg.kind,
    text: msg.text ?? null,
    url: msg.url ?? null,
  } as never);
}

export async function setOrbitRequestStatusRemote(
  targetId: string,
  status: "accepted" | "declined",
) {
  const id = await uid();
  if (!id || !isUuid(targetId)) return;
  await supabase
    .from("orbit_chat_requests")
    .update({ status } as never)
    .or(
      `and(requester_id.eq.${id},addressee_id.eq.${targetId}),and(requester_id.eq.${targetId},addressee_id.eq.${id})`,
    );
  if (status === "accepted") {
    await supabase
      .from("orbit_connections")
      .upsert(
        { requester_id: id, addressee_id: targetId, status: "accepted" } as never,
        { onConflict: "requester_id,addressee_id" },
      );
  }
}

export type RemoteOrbitState = {
  profile: OrbitProfileDraft | null;
  privacy: Partial<OrbitPrivacy> | null;
  liked: Record<string, boolean>;
  connected: Record<string, boolean>;
  requests: Record<string, OrbitChatRequest>;
};

/** One-shot load of everything the signed-in user has on Orbit. */
export async function loadOrbitStateRemote(): Promise<RemoteOrbitState | null> {
  const id = await uid();
  if (!id) return null;

  const [profileRes, settingsRes, likesRes, connRes, reqRes] = await Promise.all([
    supabase.from("orbit_profiles").select("*").eq("user_id", id).maybeSingle(),
    supabase.from("orbit_settings").select("privacy").eq("user_id", id).maybeSingle(),
    supabase.from("orbit_likes").select("target_id").eq("user_id", id),
    supabase.from("orbit_connections").select("requester_id,addressee_id,status"),
    supabase.from("orbit_chat_requests").select("id,requester_id,addressee_id,intro,status"),
  ]);

  const liked: Record<string, boolean> = {};
  for (const r of (likesRes.data ?? []) as { target_id: string }[]) liked[r.target_id] = true;

  const connected: Record<string, boolean> = {};
  for (const c of (connRes.data ?? []) as {
    requester_id: string;
    addressee_id: string;
    status: string;
  }[]) {
    if (c.status !== "accepted") continue;
    connected[c.requester_id === id ? c.addressee_id : c.requester_id] = true;
  }

  const rows = (reqRes.data ?? []) as {
    id: string;
    requester_id: string;
    addressee_id: string;
    intro: string | null;
    status: string;
  }[];
  const requests: Record<string, OrbitChatRequest> = {};
  if (rows.length) {
    const { data: msgs } = await supabase
      .from("orbit_request_messages")
      .select("id,request_id,sender_id,kind,text,url")
      .in(
        "request_id",
        rows.map((r) => r.id),
      )
      .order("created_at", { ascending: true });

    for (const r of rows) {
      const other = r.requester_id === id ? r.addressee_id : r.requester_id;
      requests[other] = {
        direction: r.requester_id === id ? "outgoing" : "incoming",
        status: r.status as OrbitChatRequest["status"],
        intro: r.intro ?? undefined,
        messages: ((msgs ?? []) as {
          id: string;
          request_id: string;
          sender_id: string;
          kind: string;
          text: string | null;
          url: string | null;
        }[])
          .filter((m) => m.request_id === r.id)
          .map((m) => ({
            id: m.id,
            kind: m.kind === "photo" ? "photo" : "text",
            text: m.text ?? undefined,
            url: m.url ?? undefined,
            me: m.sender_id === id,
          })),
      };
    }
  }

  const row = profileRes.data as unknown as OrbitProfileRow | null;
  return {
    profile: row ? rowToDraft(row) : null,
    privacy: (settingsRes.data as { privacy: Partial<OrbitPrivacy> } | null)?.privacy ?? null,
    liked,
    connected,
    requests,
  };
}

/** Single Orbit profile by user id — falls back to a direct fetch on deep links. */
export function useOrbitProfile(id: string) {
  const [profile, setProfile] = useState<OrbitProfile | undefined>(() => orbitById(id));
  const [loading, setLoading] = useState(!orbitById(id));

  useEffect(() => {
    let cancelled = false;
    const known = orbitById(id);
    setProfile(known);
    if (known) {
      setLoading(false);
      return;
    }
    setLoading(true);
    void (async () => {
      const { data } = await supabase.rpc("discover_orbit_profiles" as never, {
        ids: [id],
      } as never);
      if (cancelled) return;
      const row = (data as unknown as OrbitProfileRow[] | null)?.[0];
      if (row) {
        const mapped = rowToOrbitProfile(row);
        registerOrbitProfiles([mapped]);
        setProfile(mapped);
      }
      setLoading(false);
    })();
    return () => {
      cancelled = true;
    };
  }, [id]);

  return { profile, loading };
}

/* ------------------------------------------------------------------ */
/* Orbit media uploads                                                 */
/* ------------------------------------------------------------------ */

const ORBIT_BUCKET = "orbit-media";
/** Long-lived signed link so profile media renders without extra round trips. */
const ORBIT_SIGN_SECONDS = 60 * 60 * 24 * 365 * 5;

/** A url that only exists in this browser tab and can never load for anyone else. */
export const isLocalObjectUrl = (url: string) =>
  url.startsWith("blob:") || url.startsWith("data:");

/**
 * Uploads one Orbit photo/video to storage and returns a durable signed url.
 * Returns null when the user is signed out or the upload fails.
 */
export async function uploadOrbitMedia(file: File): Promise<string | null> {
  const id = await uid();
  if (!id) return null;
  const ext = (file.name.split(".").pop() ?? "").toLowerCase().replace(/[^a-z0-9]/g, "") || "bin";
  const path = `${id}/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;
  const { error } = await supabase.storage
    .from(ORBIT_BUCKET)
    .upload(path, file, { contentType: file.type || undefined, upsert: false });
  if (error) {
    console.error("[orbit] media upload failed", error.message);
    return null;
  }
  const { data } = await supabase.storage
    .from(ORBIT_BUCKET)
    .createSignedUrl(path, ORBIT_SIGN_SECONDS);
  return data?.signedUrl ?? null;
}
