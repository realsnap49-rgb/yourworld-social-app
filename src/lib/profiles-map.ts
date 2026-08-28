import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import type { User } from "@/lib/yw-data";

type Row = {
  id: string;
  username: string | null;
  display_name?: string | null;
  avatar_url: string | null;
};

function hueOf(id: string) {
  let h = 0;
  for (let i = 0; i < id.length; i += 1) h = (h * 31 + id.charCodeAt(i)) % 360;
  return h;
}

export function fallbackUser(id: string): User {
  return { id, username: "user", name: "User", hue: hueOf(id) } as User;
}

/** Resolves real profiles for a list of user ids (username, name, avatar). */
export function useProfiles(ids: string[]) {
  const key = useMemo(() => [...new Set(ids)].sort().join(","), [ids]);
  const [map, setMap] = useState<Record<string, User & { avatarUrl: string | null }>>({});

  useEffect(() => {
    const list = key ? key.split(",") : [];
    if (!list.length) {
      setMap({});
      return;
    }
    let alive = true;
    void (async () => {
      const { data } = await supabase.rpc("get_public_profiles", { ids: list });
      if (!alive) return;
      const next: Record<string, User & { avatarUrl: string | null }> = {};
      for (const p of (data ?? []) as Row[]) {
        next[p.id] = {
          id: p.id,
          username: p.username ?? "user",
          name: p.display_name ?? p.username ?? "User",
          hue: hueOf(p.id),
          avatarUrl: p.avatar_url,
        } as User & { avatarUrl: string | null };
      }
      setMap(next);
    })();
    return () => {
      alive = false;
    };
  }, [key]);

  return {
    map,
    get: (id: string) => map[id] ?? { ...fallbackUser(id), avatarUrl: null },
  };
}
